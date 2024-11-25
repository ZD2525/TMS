const db = require("./models/db")
const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")

// Message Codes
const MsgCode = {
  INVALID_URL: "U_001",
  INVALID_KEYS: "P_001",
  INVALID_PAYLOAD_TYPE: "P_002",
  INVALID_CREDENTIALS: "I_001",
  NOT_AUTHORIZED: "I_002",
  INVALID_INPUT: "T_001",
  NOT_FOUND: "T_002",
  INVALID_STATE_CHANGE: "T_003",
  INTERNAL_ERROR: "E_001",
  SUCCESS: "S_001"
}

// Nodemailer Configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.ethereal.email",
  port: process.env.EMAIL_PORT || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Middleware for URL Validation
const urlMiddleware = expectedUrl => (req, res, next) => {
  console.log(req.url)
  if (req.url !== expectedUrl) {
    return res.json({
      MsgCode: MsgCode.INVALID_URL
    })
  }
  next()
}

exports.CreateTaskController = [
  // **URL Validation**
  urlMiddleware("/CreateTask"), // Case-sensitive URL middleware

  // **Controller Logic**
  async (req, res) => {
    try {
      console.log(req.body)

      const mandatoryKeys = ["username", "password", "app_acronym", "task_name"]
      const optionalKeys = ["task_description", "task_plan"]
      const allowedKeys = [...mandatoryKeys, ...optionalKeys]

      const dataType = {
        username: "string",
        password: "string",
        app_acronym: "string",
        task_name: "string",
        task_description: "string",
        task_plan: "string"
      }

      const maxLength = {
        username: 50,
        password: 50,
        app_acronym: 50,
        task_name: 50,
        task_description: 255,
        task_plan: 50
      }

      // **1. Payload Validation**

      // **P_002**: Check payload type
      if (req.headers["content-type"] !== "application/json") {
        return res.json({
          MsgCode: MsgCode.INVALID_PAYLOAD_TYPE
        })
      }

      // **P_003**: Check for extra keys
      const extraKeys = Object.keys(req.body).filter(key => !allowedKeys.includes(key))
      if (extraKeys.length > 0) {
        return res.json({
          MsgCode: MsgCode.INVALID_KEYS
        })
      }

      // **P_001**: Check for missing mandatory keys
      const missingKeys = mandatoryKeys.filter(key => !(key in req.body))
      if (missingKeys.length > 0) {
        return res.json({
          MsgCode: MsgCode.INVALID_KEYS
        })
      }

      // Validate each field's datatype and length
      for (const key in req.body) {
        if (req.body[key] && (typeof req.body[key] !== dataType[key] || req.body[key].length > maxLength[key])) {
          return res.json({
            MsgCode: MsgCode.INVALID_INPUT
          })
        }
      }

      // **2. IAM Validation**
      const { username, password, app_acronym, task_name, task_description, task_plan } = req.body

      // Validate username and password
      const [[login]] = await db.execute("SELECT * FROM accounts WHERE LOWER(username) = ?", [username.toLowerCase()])
      if (!login || login.accountStatus.toLowerCase() !== "active" || !bcrypt.compareSync(password, login.password)) {
        return res.json({
          MsgCode: MsgCode.INVALID_CREDENTIALS
        })
      }

      // **3. Application and Plan Validation**

      // Validate app_acronym
      const [[app]] = await db.execute("SELECT App_permit_Create, App_Rnumber FROM application WHERE LOWER(App_Acronym) = ?", [app_acronym.toLowerCase()])
      if (!app) {
        return res.json({
          MsgCode: MsgCode.NOT_FOUND
        })
      }

      // Validate user permissions
      const [[{ count }]] = await db.execute("SELECT COUNT(*) AS count FROM usergroup WHERE LOWER(username) = ? AND user_group = ?", [username.toLowerCase(), app.App_permit_Create])
      if (count === 0) {
        return res.json({
          MsgCode: MsgCode.NOT_AUTHORIZED
        })
      }

      // **T_002**: Validate task_plan (separate type and database checks)
      if (task_plan) {
        if (typeof task_plan !== "string") {
          return res.json({
            MsgCode: MsgCode.INVALID_INPUT // T_001
          })
        }
        const [planArray] = await db.execute("SELECT DISTINCT Plan_MVP_name FROM plan WHERE LOWER(Plan_app_Acronym) = ?", [app_acronym.toLowerCase()])
        const validPlans = planArray.map(plan => plan.Plan_MVP_name)
        if (!validPlans.includes(task_plan)) {
          return res.json({
            MsgCode: MsgCode.NOT_FOUND
          })
        }
      }

      // **T_001**: Validate task_description
      if (task_description && typeof task_description !== "string") {
        return res.json({
          MsgCode: MsgCode.INVALID_INPUT
        })
      }

      // **4. Transaction Handling**
      const timestamp = new Date().toISOString().replace("T", " ").split(".")[0]
      const createdate = timestamp.split(" ")[0]
      const initialNotes = `*************\n[${username}, -, ${timestamp}(UTC)]\nTask promoted to 'Open' state\n`

      const [[{ App_Rnumber }]] = await db.execute("SELECT App_Rnumber FROM application WHERE LOWER(App_Acronym) = ? FOR UPDATE", [app_acronym.toLowerCase()])

      const newTaskId = `${app_acronym}_${App_Rnumber + 1}`

      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Insert task
        await connection.execute("INSERT INTO task (Task_id, Task_name, Task_description, Task_notes, Task_plan, Task_app_Acronym, Task_state, Task_creator, Task_owner, Task_createDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [newTaskId, task_name, task_description || "", initialNotes, task_plan || "", app_acronym, "Open", username, username, createdate])

        // Update RNumber
        await connection.execute("UPDATE application SET App_Rnumber = ? WHERE LOWER(App_Acronym) = ?", [App_Rnumber + 1, app_acronym.toLowerCase()])

        await connection.commit()
        return res.json({
          MsgCode: MsgCode.SUCCESS
        })
      } catch (transactionError) {
        await connection.rollback()
        console.error(transactionError)
        return res.json({
          MsgCode: MsgCode.INTERNAL_ERROR
        })
      } finally {
        connection.release()
      }
    } catch (error) {
      console.error(error)
      return res.json({
        MsgCode: MsgCode.INTERNAL_ERROR
      })
    }
  }
]

exports.GetTaskbyStateController = [
  // URL Validation Middleware
  urlMiddleware("/GetTaskbyState"),

  // Controller Logic
  async (req, res) => {
    try {
      // Define constants
      const mandatoryKeys = ["username", "password", "task_state", "task_app_acronym"]
      const optionalKeys = [] // Add optional keys if needed
      const allowedKeys = [...mandatoryKeys, ...optionalKeys]
      const validStates = ["Open", "Todo", "Doing", "Done", "Closed"]
      const contentType = req.headers["content-type"]

      const dataType = {
        username: "string",
        password: "string",
        task_state: "string",
        task_app_acronym: "string"
      }

      const maxLength = {
        username: 50,
        password: 255,
        task_state: 10,
        task_app_acronym: 50
      }

      // **1. Payload Validation**

      // **P_002**: Check payload type
      if (contentType !== "application/json") {
        return res.json({ MsgCode: MsgCode.INVALID_PAYLOAD_TYPE })
      }

      // **P_003**: Check for extra keys
      const extraKeys = Object.keys(req.body).filter(key => !allowedKeys.includes(key))
      if (extraKeys.length > 0) {
        return res.json({ MsgCode: MsgCode.INVALID_KEYS })
      }

      // **P_001**: Check for missing mandatory keys
      const missingKeys = mandatoryKeys.filter(key => !(key in req.body))
      if (missingKeys.length > 0) {
        return res.json({ MsgCode: MsgCode.INVALID_KEYS })
      }

      // Validate field types and lengths
      for (const key in req.body) {
        if (req.body[key] && (typeof req.body[key] !== dataType[key] || req.body[key].length > maxLength[key])) {
          return res.json({ MsgCode: MsgCode.INVALID_INPUT })
        }
      }

      // Extract fields from request body
      const { username, password, task_state, task_app_acronym } = req.body

      // Validate task_state
      if (!validStates.includes(task_state)) {
        return res.json({ MsgCode: MsgCode.INVALID_INPUT })
      }

      // **2. IAM Validation**

      // Check user credentials
      const [[user]] = await db.execute("SELECT * FROM accounts WHERE LOWER(username) = ?", [username.toLowerCase()])
      if (!user || user.accountStatus.toLowerCase() !== "active" || !bcrypt.compareSync(password, user.password)) {
        return res.json({ MsgCode: MsgCode.INVALID_CREDENTIALS })
      }

      // **3. Application Validation**

      // Check if application exists
      const [[app]] = await db.execute("SELECT App_Acronym FROM application WHERE LOWER(App_Acronym) = ?", [task_app_acronym.toLowerCase()])
      if (!app) {
        return res.json({ MsgCode: MsgCode.NOT_FOUND })
      }

      // **4. Fetch Tasks**

      const [tasks] = await db.execute("SELECT * FROM task WHERE LOWER(Task_app_Acronym) = ? AND Task_state = ?", [task_app_acronym.toLowerCase(), task_state])

      // Success: Return tasks
      return res.json({
        MsgCode: MsgCode.SUCCESS,
        tasks
      })
    } catch (error) {
      console.error("Error in GetTaskByStateController:", error)
      return res.json({ MsgCode: MsgCode.INTERNAL_ERROR })
    }
  }
]

exports.PromoteTask2DoneController = [
  urlMiddleware("/PromoteTask2Done"), // Add case-sensitive URL middleware
  async (req, res) => {
    try {
      // Define constants
      const mandatoryKeys = ["Task_id", "username", "password"]
      const optionalKeys = ["task_notes"]
      const allowedKeys = [...mandatoryKeys, ...optionalKeys]
      const contentType = req.headers["content-type"]

      // **P_002**: Check payload type
      if (contentType !== "application/json") {
        return res.json({
          MsgCode: MsgCode.INVALID_PAYLOAD_TYPE
        })
      }

      // **P_003**: Check for extra keys
      const extraKeys = Object.keys(req.body).filter(key => !allowedKeys.includes(key))
      if (extraKeys.length > 0) {
        return res.json({
          MsgCode: MsgCode.INVALID_KEYS
        })
      }

      // **P_001**: Check for missing mandatory keys
      const missingKeys = mandatoryKeys.filter(key => !(key in req.body))
      if (missingKeys.length > 0) {
        return res.json({
          MsgCode: MsgCode.INVALID_KEYS
        })
      }

      // Extract fields from request body
      const { Task_id, username, password, task_notes } = req.body

      // Validate `task_notes` type (Optional key)
      if (task_notes !== undefined && typeof task_notes !== "string") {
        return res.json({
          MsgCode: MsgCode.INVALID_INPUT // T_001
        })
      }

      // **IAM Checks**: Validate username and password
      if (typeof username !== "string" || typeof password !== "string") {
        return res.json({
          MsgCode: MsgCode.INVALID_CREDENTIALS
        })
      }

      if (username.length > 50 || password.length > 50) {
        return res.json({
          MsgCode: MsgCode.INVALID_CREDENTIALS
        })
      }

      // **I_001**: Verify credentials (case-insensitive username)
      const [[user]] = await db.execute("SELECT * FROM accounts WHERE LOWER(username) = ?", [username.toLowerCase()])
      if (!user) {
        return res.json({
          MsgCode: MsgCode.INVALID_CREDENTIALS
        })
      }

      if (user.accountStatus.toLowerCase() !== "active") {
        return res.json({
          MsgCode: MsgCode.INVALID_CREDENTIALS
        })
      }

      if (!bcrypt.compareSync(password, user.password)) {
        return res.json({
          MsgCode: MsgCode.INVALID_CREDENTIALS
        })
      }

      // **T_001**: Validate Task_id (case-insensitive)
      if (typeof Task_id !== "string" || Task_id.trim() === "") {
        return res.json({
          MsgCode: MsgCode.INVALID_INPUT
        })
      }

      const [[task]] = await db.execute("SELECT Task_state, Task_app_Acronym, Task_notes FROM task WHERE LOWER(Task_id) = ?", [Task_id.toLowerCase()])
      if (!task) {
        return res.json({
          MsgCode: MsgCode.NOT_FOUND
        })
      }

      // **T_003**: Validate task state transition
      if (task.Task_state !== "Doing") {
        return res.json({
          MsgCode: MsgCode.INVALID_STATE_CHANGE
        })
      }

      // **T_002**: Validate application permissions for 'Doing' state (case-insensitive app_acronym)
      const [[app]] = await db.execute("SELECT App_permit_Doing, App_permit_Done FROM application WHERE LOWER(App_Acronym) = ?", [task.Task_app_Acronym.toLowerCase()])
      if (!app || !app.App_permit_Doing) {
        return res.json({
          MsgCode: MsgCode.NOT_AUTHORIZED
        })
      }

      // **I_002**: Check if user is authorized for 'Doing' state
      const [[{ count }]] = await db.execute("SELECT COUNT(*) AS count FROM usergroup WHERE LOWER(username) = ? AND user_group = ?", [username.toLowerCase(), app.App_permit_Doing])
      if (count === 0) {
        return res.json({
          MsgCode: MsgCode.NOT_AUTHORIZED
        })
      }

      // Fetch users in the `App_permit_Done` group
      const [groupUsers] = await db.execute("SELECT username FROM usergroup WHERE user_group = ?", [app.App_permit_Done])
      const groupUsernames = groupUsers.map(user => user.username)

      // Fetch email addresses of users in the group
      let validEmails = []
      if (groupUsernames.length > 0) {
        const [emails] = await db.execute(
          `SELECT email FROM accounts WHERE LOWER(username) IN (${groupUsernames.map(() => "?").join(",")})`,
          groupUsernames.map(username => username.toLowerCase())
        )
        validEmails = emails.filter(e => e.email).map(e => e.email)
      }

      // **T_003**: Update task state and notes
      const timestamp = new Date().toISOString().split("T")[0]
      const additionalNotes = task_notes ? `Additional Notes:\n${task_notes.trim()}\n` : ""
      const updatedNotes = `*************\nTask promoted to 'Done' by ${username} on ${timestamp}\n${additionalNotes}${task.Task_notes}`

      await db.execute("UPDATE task SET Task_state = 'Done', Task_notes = ?, Task_owner = ? WHERE LOWER(Task_id) = ?", [updatedNotes, username, Task_id.toLowerCase()])

      // Send email notification if there are valid emails
      if (validEmails.length > 0) {
        const mailOptions = {
          from: "taskmanagementsystem@tms.com",
          to: validEmails,
          subject: `Task ${Task_id} is now in 'Done' state`,
          text: `The task with Task ID: ${Task_id} has been promoted to 'Done' state by ${username}. Please review it.`
        }

        transporter.sendMail(mailOptions, (err, info) => {
          if (err) {
            console.error("Email sending error:", err)
          } else {
            console.log("Email sent successfully:", info.response)
          }
        })
      }

      // Success
      return res.json({
        MsgCode: MsgCode.SUCCESS
      })
    } catch (error) {
      console.error("Error in PromoteTask2DoneController:", error)
      return res.json({
        MsgCode: MsgCode.INTERNAL_ERROR
      })
    }
  }
]

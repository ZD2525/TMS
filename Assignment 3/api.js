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
  urlMiddleware("/CreateTask"), // Add case-sensitive URL middleware
  async (req, res) => {
    console.log(req.body)
    const taskAppAcronym = req.body.app_acronym

    // Define mandatory and optional keys
    const mandatoryKeys = ["username", "password", "app_acronym", "task_name"]
    const optionalKeys = ["task_description", "task_plan"]
    const allowedKeys = [...mandatoryKeys, ...optionalKeys]

    const maxLength = {
      username: 50,
      password: 50,
      app_acronym: 50,
      task_name: 50,
      task_description: 255,
      task_plan: 50
    }

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

    const { username, password, task_name, task_description, task_plan } = req.body

    // **IAM Checks**: Validate username and password
    if (typeof username !== "string" || typeof password !== "string") {
      return res.json({
        MsgCode: MsgCode.INVALID_CREDENTIALS
      })
    }

    if (username.length > maxLength.username || password.length > maxLength.password) {
      return res.json({
        MsgCode: MsgCode.INVALID_CREDENTIALS
      })
    }

    try {
      // **I_001**: Verify credentials (case-insensitive username)
      const [[login]] = await db.execute("SELECT * FROM accounts WHERE LOWER(username) = ?", [username.toLowerCase()])
      if (!login) {
        return res.json({
          MsgCode: MsgCode.INVALID_CREDENTIALS
        })
      }

      if (login.accountStatus.toLowerCase() !== "active") {
        return res.json({
          MsgCode: MsgCode.INVALID_CREDENTIALS
        })
      }

      if (!bcrypt.compareSync(password, login.password)) {
        return res.json({
          MsgCode: MsgCode.INVALID_CREDENTIALS
        })
      }

      // **T_002**: Validate application existence (case-insensitive task_app_acronym)
      if (!taskAppAcronym || typeof taskAppAcronym !== "string" || taskAppAcronym.length > maxLength.app_acronym) {
        return res.json({
          MsgCode: MsgCode.NOT_FOUND
        })
      }

      const [[app]] = await db.execute("SELECT App_permit_Create, App_Rnumber FROM application WHERE LOWER(App_Acronym) = ?", [taskAppAcronym.toLowerCase()])

      if (!app) {
        return res.json({
          MsgCode: MsgCode.NOT_FOUND
        })
      }

      // **I_002**: Check user permissions
      const [[{ count }]] = await db.execute("SELECT COUNT(*) AS count FROM usergroup WHERE LOWER(username) = ? AND user_group = ?", [username.toLowerCase(), app.App_permit_Create])
      if (count === 0) {
        return res.json({
          MsgCode: MsgCode.NOT_AUTHORIZED
        })
      }

      // **T_001**: Validate task_name (case-sensitive)
      const nameRegex = /^[a-zA-Z0-9 ]{1,50}$/
      if (typeof task_name !== "string" || !nameRegex.test(task_name)) {
        return res.json({
          MsgCode: MsgCode.INVALID_INPUT
        })
      }

      // **T_001**: Validate task_plan (case-sensitive)
      if (task_plan) {
        const [planArray] = await db.execute("SELECT DISTINCT Plan_MVP_name FROM plan WHERE LOWER(Plan_app_Acronym) = ?", [taskAppAcronym.toLowerCase()])
        const validPlans = planArray.map(plan => plan.Plan_MVP_name)
        if (typeof task_plan !== "string" || !validPlans.includes(task_plan)) {
          return res.json({
            MsgCode: MsgCode.INVALID_INPUT
          })
        }
      } else {
        req.body.task_plan = "" // Default to empty if task_plan not provided
      }

      // **T_001**: Validate task_description (case-sensitive)
      if (task_description) {
        if (typeof task_description !== "string" || task_description.length > maxLength.task_description) {
          return res.json({
            MsgCode: MsgCode.INVALID_INPUT
          })
        }
      } else {
        req.body.task_description = "" // Default to empty if task_description not provided
      }

      // Prepare task creation details
      const timestamp = new Date().toISOString().replace("T", " ").split(".")[0]
      const createdate = timestamp.split(" ")[0]
      const initialNotes = `*************\n[${username}, -, ${timestamp}(UTC)]\nTask promoted to 'Open' state\n`

      const [[{ App_Rnumber }]] = await db.execute("SELECT App_Rnumber FROM application WHERE LOWER(App_Acronym) = ? FOR UPDATE", [taskAppAcronym.toLowerCase()])

      const newTaskId = `${taskAppAcronym}_${App_Rnumber + 1}`

      // Transaction to create the task and update App_Rnumber
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        await connection.execute("INSERT INTO task (Task_id, Task_name, Task_description, Task_notes, Task_plan, Task_app_Acronym, Task_state, Task_creator, Task_owner, Task_createDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [newTaskId, task_name, task_description || "", initialNotes, task_plan || "", taskAppAcronym, "Open", username, username, createdate])

        await connection.execute("UPDATE application SET App_Rnumber = ? WHERE LOWER(App_Acronym) = ?", [App_Rnumber + 1, taskAppAcronym.toLowerCase()])

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

exports.GetTaskByStateController = [
  urlMiddleware("/GetTaskByState"), // Case-sensitive URL validation middleware
  async (req, res) => {
    try {
      // Define constants
      const mandatoryKeys = ["task_app_acronym", "task_state", "username", "password"]
      const optionalKeys = [] // If there are any optional keys, add them here
      const allowedKeys = [...mandatoryKeys, ...optionalKeys]
      const validStates = ["Open", "To-Do", "Doing", "Done", "Closed"]
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
      const { task_app_acronym, task_state, username, password } = req.body

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

      // **T_002**: Validate application existence (case-insensitive app_acronym)
      const [[app]] = await db.execute("SELECT App_Acronym FROM application WHERE LOWER(App_Acronym) = ?", [task_app_acronym.toLowerCase()])
      if (!app) {
        return res.json({
          MsgCode: MsgCode.INVALID_INPUT
        })
      }

      // **T_001**: Validate task state (case-sensitive)
      if (!validStates.includes(task_state)) {
        return res.json({
          MsgCode: MsgCode.INVALID_INPUT
        })
      }

      // Fetch tasks by state
      const [tasks] = await db.execute("SELECT * FROM task WHERE LOWER(Task_app_Acronym) = ? AND Task_state = ?", [task_app_acronym.toLowerCase(), task_state])

      // Handle no tasks found
      if (tasks.length === 0) {
        return res.json({
          MsgCode: MsgCode.SUCCESS
        })
      }

      // Success
      return res.json({
        MsgCode: MsgCode.SUCCESS,
        data: tasks
      })
    } catch (error) {
      console.error("Internal Server Error:", error)
      return res.json({
        MsgCode: MsgCode.INTERNAL_ERROR
      })
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
      const [[app]] = await db.execute("SELECT App_permit_Doing FROM application WHERE LOWER(App_Acronym) = ?", [task.Task_app_Acronym.toLowerCase()])
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

      // Fetch users in the `App_permit_Doing` group
      const [groupUsers] = await db.execute("SELECT username FROM usergroup WHERE user_group = ?", [app.App_permit_Doing])
      const groupUsernames = groupUsers.map(user => user.username)

      // **T_002**: Fetch email addresses of users in the group
      if (groupUsernames.length > 0) {
        const [emails] = await db.execute(
          `SELECT email FROM accounts WHERE LOWER(username) IN (${groupUsernames.map(() => "?").join(",")})`,
          groupUsernames.map(username => username.toLowerCase())
        )
        const validEmails = emails.filter(e => e.email).map(e => e.email)

        // Send email notification
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
      }

      // **T_003**: Update task state and notes
      const timestamp = new Date().toISOString().split("T")[0]
      const additionalNotes = task_notes ? `Additional Notes:\n${task_notes.trim()}\n` : ""
      const updatedNotes = `*************\nTask promoted to 'Done' by ${username} on ${timestamp}\n${additionalNotes}${task.Task_notes}`

      await db.execute("UPDATE task SET Task_state = 'Done', Task_notes = ?, Task_owner = ? WHERE LOWER(Task_id) = ?", [updatedNotes, username, Task_id.toLowerCase()])

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

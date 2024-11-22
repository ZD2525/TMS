const db = require("./models/db")
const nodemailer = require("nodemailer")
const bcrypt = require("bcrypt")

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
  if (req.url !== expectedUrl) {
    return res.json({
      code: "U_001",
      remarks: "Invalid URL. URL does not match the expected format."
    })
  }
  next()
}

exports.CreateTaskController = [
  urlMiddleware("/CreateTask"), // Add case-sensitive URL middleware
  async (req, res) => {
    console.log(req.body)

    // Accept both `task_app_acronym` and `appAcronym`
    const taskAppAcronym = req.body.task_app_acronym || req.body.appAcronym
    req.body.task_app_acronym = taskAppAcronym // Standardize to `task_app_acronym`

    // Define mandatory and optional keys
    const mandatoryKeys = ["username", "password", "task_app_acronym", "task_name"]
    const optionalKeys = ["task_description", "task_plan"]
    const allowedKeys = [...mandatoryKeys, ...optionalKeys]

    const maxLength = {
      username: 50,
      password: 50,
      task_app_acronym: 50,
      task_name: 50,
      task_description: 255,
      task_plan: 50
    }

    // **P_002**: Check payload type
    if (req.headers["content-type"] !== "application/json") {
      return res.json({
        MsgCode: "P_002",
        remarks: "Invalid payload type. Expected application/json."
      })
    }

    // **P_003**: Check for extra keys
    const extraKeys = Object.keys(req.body).filter(key => !allowedKeys.includes(key))
    if (extraKeys.length > 0) {
      return res.json({
        MsgCode: "P_001",
        remarks: `Extra keys provided in request body: ${extraKeys.join(", ")}`
      })
    }

    // **P_001**: Check for missing mandatory keys
    const missingKeys = mandatoryKeys.filter(key => !(key in req.body))
    if (missingKeys.length > 0) {
      return res.json({
        MsgCode: "P_001",
        remarks: `Missing mandatory keys: ${missingKeys.join(", ")}`
      })
    }

    const { username, password, task_name, task_description, task_plan } = req.body

    // **IAM Checks**: Validate username and password
    if (typeof username !== "string" || typeof password !== "string") {
      return res.json({
        MsgCode: "I_001",
        remarks: "Username or password must be a string."
      })
    }

    if (username.length > maxLength.username || password.length > maxLength.password) {
      return res.json({
        MsgCode: "I_001",
        remarks: "Username or password length exceeds maximum allowed length."
      })
    }

    try {
      const [[login]] = await db.execute("SELECT * FROM accounts WHERE username = ?", [username || ""])

      if (!login) {
        return res.json({
          MsgCode: "I_001",
          remarks: "Username does not exist in the database."
        })
      }

      if (login.accountStatus.toLowerCase() !== "active") {
        return res.json({
          MsgCode: "I_001",
          remarks: "Account is not active."
        })
      }

      if (!bcrypt.compareSync(password, login.password)) {
        return res.json({
          MsgCode: "I_001",
          remarks: "Invalid credentials. Password does not match."
        })
      }

      // **T_002**: Validate application existence
      if (!taskAppAcronym || typeof taskAppAcronym !== "string" || taskAppAcronym.length > maxLength.task_app_acronym) {
        return res.json({
          MsgCode: "T_002",
          remarks: "Invalid application acronym."
        })
      }

      const [[app]] = await db.execute("SELECT App_permit_Create, App_Rnumber FROM application WHERE App_Acronym = ?", [taskAppAcronym])

      if (!app) {
        return res.json({
          MsgCode: "T_002",
          remarks: "Application not found."
        })
      }

      // **I_002**: Check user permissions
      const [[{ count }]] = await db.execute("SELECT COUNT(*) AS count FROM usergroup WHERE username = ? AND user_group = ?", [username, app.App_permit_Create])
      if (count === 0) {
        return res.json({
          MsgCode: "I_002",
          remarks: "User not authorized to create tasks in this application."
        })
      }

      // **T_001**: Validate task_name
      const nameRegex = /^[a-zA-Z0-9 ]{1,50}$/
      if (typeof task_name !== "string" || !nameRegex.test(task_name)) {
        return res.json({
          MsgCode: "T_001",
          remarks: "Invalid input for task_name."
        })
      }

      // **T_001**: Validate task_plan
      if (task_plan) {
        const [planArray] = await db.execute("SELECT DISTINCT Plan_MVP_name FROM plan WHERE Plan_app_Acronym = ?", [taskAppAcronym])
        const validPlans = planArray.map(plan => plan.Plan_MVP_name)
        if (typeof task_plan !== "string" || !validPlans.includes(task_plan)) {
          return res.json({
            MsgCode: "T_001",
            remarks: "Invalid or non-existent task_plan."
          })
        }
      } else {
        req.body.task_plan = "" // Default to empty if task_plan not provided
      }

      // **T_001**: Validate task_description
      if (task_description) {
        if (typeof task_description !== "string" || task_description.length > maxLength.task_description) {
          return res.json({
            MsgCode: "T_001",
            remarks: "Invalid input for task_description."
          })
        }
      } else {
        req.body.task_description = "" // Default to empty if task_description not provided
      }

      // Prepare task creation details
      const timestamp = new Date().toISOString().replace("T", " ").split(".")[0]
      const createdate = timestamp.split(" ")[0]
      const initialNotes = `*************\n[${username}, -, ${timestamp}(UTC)]\nTask promoted to 'Open' state\n`

      const [[{ App_Rnumber }]] = await db.execute("SELECT App_Rnumber FROM application WHERE App_Acronym = ? FOR UPDATE", [taskAppAcronym])

      const newTaskId = `${taskAppAcronym}_${App_Rnumber + 1}`

      // Transaction to create the task and update App_Rnumber
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        await connection.execute("INSERT INTO task (Task_id, Task_name, Task_description, Task_notes, Task_plan, Task_app_Acronym, Task_state, Task_creator, Task_owner, Task_createDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [newTaskId, task_name, task_description || "", initialNotes, task_plan || "", taskAppAcronym, "Open", username, username, createdate])

        await connection.execute("UPDATE application SET App_Rnumber = ? WHERE App_Acronym = ?", [App_Rnumber + 1, taskAppAcronym])

        await connection.commit()

        return res.json({
          result: {
            Task_id: newTaskId
          },
          MsgCode: "S_001"
        })
      } catch (transactionError) {
        await connection.rollback()
        console.error(transactionError)
        return res.json({
          MsgCode: "E_001",
          remarks: "Internal server error."
        })
      } finally {
        connection.release()
      }
    } catch (error) {
      console.error(error)
      return res.json({
        MsgCode: "E_001",
        remarks: "Internal server error."
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
      const validStates = ["Open", "To-Do", "Doing", "Done", "Closed"]
      const contentType = req.headers["content-type"]

      // **P_002**: Check payload type
      if (contentType !== "application/json") {
        return res.json({ code: "P_002", remarks: "Invalid payload type. Expected application/json." })
      }

      // **P_001**: Check for missing mandatory keys
      const missingKeys = mandatoryKeys.filter(key => !(key in req.body))
      if (missingKeys.length > 0) {
        return res.json({ code: "P_001", remarks: `Missing mandatory keys: ${missingKeys.join(", ")}` })
      }

      // Extract fields from request body
      const { task_app_acronym, task_state, username, password } = req.body

      // **IAM Checks**: Validate username and password
      if (typeof username !== "string" || typeof password !== "string") {
        return res.json({ code: "I_001", remarks: "Username or password must be a string." })
      }

      if (username.length > 50 || password.length > 50) {
        return res.json({ code: "I_001", remarks: "Username or password length exceeds maximum allowed length." })
      }

      // **I_001**: Verify credentials
      const [[user]] = await db.execute("SELECT * FROM accounts WHERE username = ?", [username])
      if (!user) {
        return res.json({ code: "I_001", remarks: "Username does not exist in the database." })
      }
      if (user.accountStatus.toLowerCase() !== "active") {
        return res.json({ code: "I_001", remarks: "Account is not active." })
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return res.json({ code: "I_001", remarks: "Invalid credentials. Password does not match." })
      }

      // **T_002**: Validate application existence
      const [[app]] = await db.execute("SELECT App_Acronym FROM application WHERE App_Acronym = ?", [task_app_acronym])
      if (!app) {
        return res.json({ code: "T_002", remarks: "Application not found." })
      }

      // **T_001**: Validate task state
      if (!validStates.includes(task_state)) {
        return res.json({
          code: "T_001",
          remarks: `Invalid task state. Allowed states: ${validStates.join(", ")}`
        })
      }

      // Fetch tasks by state
      const [tasks] = await db.execute("SELECT * FROM task WHERE Task_app_Acronym = ? AND Task_state = ?", [task_app_acronym, task_state])

      // **T_002**: Handle no tasks found
      if (tasks.length === 0) {
        return res.json({ code: "T_002", remarks: "No tasks found for the specified state and application." })
      }

      // Success
      return res.json({ code: "S_001", remarks: "Tasks retrieved successfully.", tasks })
    } catch (error) {
      console.error("Internal Server Error:", error)
      return res.json({ code: "E_001", remarks: "Internal server error." })
    }
  }
]

exports.PromoteTask2DoneController = [
  urlMiddleware("/PromoteTask2Done"), // Add case-sensitive URL middleware
  async (req, res) => {
    try {
      // Define constants
      const mandatoryKeys = ["Task_id", "username", "password"]
      const contentType = req.headers["content-type"]

      // **P_002**: Check payload type
      if (contentType !== "application/json") {
        return res.json({
          code: "P_002",
          remarks: "Invalid payload type. Expected application/json."
        })
      }

      // **P_001**: Check for missing mandatory keys
      const missingKeys = mandatoryKeys.filter(key => !(key in req.body))
      if (missingKeys.length > 0) {
        return res.json({
          code: "P_001",
          remarks: `Missing mandatory keys: ${missingKeys.join(", ")}`
        })
      }

      // Extract fields from request body
      const { Task_id, username, password } = req.body

      // **IAM Checks**: Validate username and password
      if (typeof username !== "string" || typeof password !== "string") {
        return res.json({
          code: "I_001",
          remarks: "Username or password must be a string."
        })
      }

      if (username.length > 50 || password.length > 50) {
        return res.json({
          code: "I_001",
          remarks: "Username or password length exceeds maximum allowed length."
        })
      }

      // **I_001**: Verify credentials
      const [[user]] = await db.execute("SELECT * FROM accounts WHERE username = ?", [username])
      if (!user) {
        return res.json({
          code: "I_001",
          remarks: "Username does not exist in the database."
        })
      }

      if (user.accountStatus.toLowerCase() !== "active") {
        return res.json({
          code: "I_001",
          remarks: "Account is not active."
        })
      }

      if (!bcrypt.compareSync(password, user.password)) {
        return res.json({
          code: "I_001",
          remarks: "Invalid credentials. Password does not match."
        })
      }

      // **T_001**: Validate Task_id
      if (typeof Task_id !== "string" || Task_id.trim() === "") {
        return res.json({
          code: "T_001",
          remarks: "Task_id must be a non-empty string."
        })
      }

      // **T_002**: Check if Task_id exists in the database
      const [[task]] = await db.execute("SELECT Task_state, Task_app_Acronym, Task_notes FROM task WHERE Task_id = ?", [Task_id])
      if (!task) {
        return res.json({
          code: "T_002",
          remarks: "Task_id not found in the database."
        })
      }

      // **T_003**: Validate task state transition
      if (task.Task_state !== "Doing") {
        return res.json({
          code: "T_003",
          remarks: "Invalid state transition. Task must be in 'Doing' state to be promoted to 'Done'."
        })
      }

      // **T_002**: Validate application permissions for 'Done' state
      const [[app]] = await db.execute("SELECT App_permit_Done FROM application WHERE App_Acronym = ?", [task.Task_app_Acronym])
      if (!app || !app.App_permit_Done) {
        return res.json({
          code: "I_002",
          remarks: "No permissions defined for the 'Done' state."
        })
      }

      // Fetch users in the `App_permit_Done` group
      const [groupUsers] = await db.execute("SELECT username FROM usergroup WHERE user_group = ?", [app.App_permit_Done])
      const groupUsernames = groupUsers.map(user => user.username)

      // **T_002**: Fetch email addresses of users in the group
      if (groupUsernames.length > 0) {
        const [emails] = await db.execute(`SELECT email FROM accounts WHERE username IN (${groupUsernames.map(() => "?").join(",")})`, groupUsernames)
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
      const updatedNotes = `*************\nTask promoted to 'Done' by ${username} on ${timestamp}\n${task.Task_notes}`

      await db.execute("UPDATE task SET Task_state = 'Done', Task_notes = ?, Task_owner = ? WHERE Task_id = ?", [updatedNotes, username, Task_id])

      // Success
      return res.json({
        code: "S_001",
        remarks: "Task successfully promoted to 'Done', and notifications sent to authorized users."
      })
    } catch (error) {
      console.error("Error in PromoteTask2Done:", error)
      return res.json({
        code: "E_001",
        remarks: "Internal server error."
      })
    }
  }
]

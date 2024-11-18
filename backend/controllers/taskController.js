const db = require("../models/db")
const { getUTCPlus8Timestamp } = require("../utils/timestamp")
const nodemailer = require("nodemailer")
const { body, validationResult } = require("express-validator")

// Configure Nodemailer with Ethereal Email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.ethereal.email",
  port: process.env.EMAIL_PORT || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

exports.createApplicationValidationRules = [
  body("App_Acronym")
    .notEmpty()
    .withMessage("App Acronym is mandatory.")
    .matches(/^[a-zA-Z0-9 ]*$/)
    .withMessage("App Acronym must be alphanumeric and can contain spaces.")
    .isLength({ max: 50 })
    .withMessage("App Acronym must not exceed 50 characters.")
    .custom(async value => {
      const query = `SELECT COUNT(*) AS count FROM APPLICATION WHERE App_Acronym = ?`
      const [result] = await db.execute(query, [value])
      if (result[0].count > 0) {
        throw new Error("App Acronym must be unique.")
      }
    }),

  body("App_Rnumber")
    .notEmpty()
    .withMessage("App_Rnumber is required.")
    .matches(/^[0-9]+$/)
    .withMessage("App_Rnumber must be a positive integer and cannot contain internal spaces.")
    .custom(value => {
      const trimmedValue = value.trim()
      if (trimmedValue === "00" || Number(trimmedValue) < 0) {
        throw new Error("App_Rnumber cannot be 00 or a negative number.")
      }
      return true
    }),

  body("App_startDate").notEmpty().withMessage("Start date is required.").isISO8601().withMessage("Invalid date format for start date."),

  body("App_endDate")
    .notEmpty()
    .withMessage("End date is required.")
    .isISO8601()
    .withMessage("Invalid date format for end date.")
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.App_startDate)) {
        throw new Error("End date must be later than start date.")
      }
      return true
    }),

  body("App_Description").optional().isString().withMessage("Application Description must be a string."),

  body("App_permit_Open").optional().isString().withMessage("App_permit_Open must be a string."),

  body("App_permit_toDoList").optional().isString().withMessage("App_permit_toDoList must be a string."),

  body("App_permit_Doing").optional().isString().withMessage("App_permit_Doing must be a string."),

  body("App_permit_Done").optional().isString().withMessage("App_permit_Done must be a string."),

  body("App_permit_Create").optional().isString().withMessage("App_permit_Create must be a string.")
]

// Create a new application (Project Lead)
exports.createApplication = [
  exports.createApplicationValidationRules,
  async (req, res) => {
    const errors = validationResult(req)

    // Check if there are errors
    if (!errors.isEmpty()) {
      // Return only the first error
      const firstError = errors.array({ onlyFirstError: true })[0]
      return res.status(400).json({
        error: "Validation failed",
        details: [{ msg: firstError.msg }]
      })
    }

    const { App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create } = req.body
    console.log(req.body)
    const query = `
      INSERT INTO APPLICATION 
      (App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    try {
      await db.query(query, [App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create])
      res.json({ message: "Application created successfully." })
    } catch (error) {
      console.error("Error creating application:", error)
      res.status(500).json({ error: "An error occurred while creating the application. Please try again later." })
    }
  }
]

exports.updateApplicationValidationRules = [
  body("App_Acronym")
    .notEmpty()
    .withMessage("Application Acronym is mandatory.")
    .matches(/^[a-zA-Z0-9 ]*$/)
    .withMessage("Application Acronym must be alphanumeric and can contain spaces.")
    .isLength({ max: 50 })
    .withMessage("Application Acronym must not exceed 50 characters."),
  body("App_Rnumber")
    .notEmpty()
    .withMessage("App_Rnumber is required.")
    .matches(/^[0-9]+$/)
    .withMessage("App_Rnumber must be a positive integer and cannot contain internal spaces.")
    .custom(value => {
      if (Number(value) === 0) {
        throw new Error("App_Rnumber cannot be zero.")
      }
      return true
    }),
  body("App_startDate").notEmpty().withMessage("Start date is required.").isISO8601().withMessage("Invalid date format for start date."),
  body("App_endDate")
    .notEmpty()
    .withMessage("End date is required.")
    .isISO8601()
    .withMessage("Invalid date format for end date.")
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.App_startDate)) {
        throw new Error("End date must be later than start date.")
      }
      return true
    }),
  body("App_Description").optional().isString().withMessage("Application Description must be a string."),
  body("App_permit_Open").optional().isString().withMessage("App_permit_Open must be a string."),
  body("App_permit_toDoList").optional().isString().withMessage("App_permit_toDoList must be a string."),
  body("App_permit_Doing").optional().isString().withMessage("App_permit_Doing must be a string."),
  body("App_permit_Done").optional().isString().withMessage("App_permit_Done must be a string."),
  body("App_permit_Create").optional().isString().withMessage("App_permit_Create must be a string.")
]

exports.updateApplication = [
  exports.updateApplicationValidationRules,
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array().map(error => ({ msg: error.msg }))
      })
    }

    const { originalAppAcronym, App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create } = req.body

    const connection = await db.getConnection()

    try {
      await connection.beginTransaction()

      // Step 1: Update the application table
      const appUpdateQuery = `
        UPDATE application 
        SET App_Acronym = ?, App_Description = ?, App_Rnumber = ?, App_startDate = ?, App_endDate = ?, App_permit_Open = ?, App_permit_toDoList = ?, App_permit_Doing = ?, App_permit_Done = ?, App_permit_Create = ? 
        WHERE App_Acronym = ?`
      const [appUpdateResult] = await connection.query(appUpdateQuery, [App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create, originalAppAcronym])

      if (appUpdateResult.affectedRows === 0) {
        await connection.rollback()
        return res.status(404).json({ error: "Application not found or no changes were made." })
      }

      // Step 2: Update related rows in the tasks table for Task_id format: <App_Acronym>_<Task_Rnumber>
      if (App_Acronym !== originalAppAcronym) {
        const updateTaskIdQuery = `
          UPDATE task
          SET Task_id = CONCAT(?, SUBSTRING(Task_id, CHAR_LENGTH(?) + 1))
          WHERE Task_id LIKE CONCAT(?, '_%')`
        await connection.query(updateTaskIdQuery, [App_Acronym, originalAppAcronym, originalAppAcronym])
      }

      await connection.commit()
      res.json({ message: "Application and related tasks updated successfully." })
    } catch (error) {
      await connection.rollback()

      // Handle duplicate entry error
      if (error.code === "ER_DUP_ENTRY") {
        console.error("Duplicate entry error:", error)
        return res.status(400).json({ error: "Application Acronym already exists." })
      }

      console.error("Error during application update:", error)
      res.status(500).json({ error: "Error updating application." })
    } finally {
      connection.release()
    }
  }
]

// Get all applications (All Roles)
exports.getApplications = async (req, res) => {
  const query = `SELECT * FROM APPLICATION`

  try {
    const [results] = await db.query(query)
    res.json(results)
  } catch (error) {
    res.status(500).send("Error retrieving applications.")
  }
}

exports.createPlanValidationRules = [
  body("Plan_MVP_name").notEmpty().withMessage("Plan name is required.").isLength({ min: 1, max: 255 }).withMessage("Plan MVP name must be between 1 and 255 characters."),
  body("Plan_app_Acronym").notEmpty().withMessage("Plan app acronym is required.").isString().withMessage("Plan app acronym must be a string."),
  body("Plan_startDate").notEmpty().withMessage("Start date is required.").isISO8601().withMessage("Invalid start date format."),
  body("Plan_endDate")
    .notEmpty()
    .withMessage("End date is required.")
    .isISO8601()
    .withMessage("Invalid end date format.")
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.Plan_startDate)) {
        throw new Error("End date must be later than start date.")
      }
      return true
    }),
  body("Plan_color").optional().isHexColor().withMessage("Plan color must be a valid hex color.")
]

// Create a new plan (Project Manager)
exports.createPlan = [
  exports.createPlanValidationRules,
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      // Only return the first error encountered in a consistent format
      return res.status(400).json({
        error: "Validation failed",
        details: [{ msg: errors.array()[0].msg }] // Wrap the first error in an array with the expected structure
      })
    }

    const { Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color } = req.body

    const query = `
      INSERT INTO Plan 
      (Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color) 
      VALUES (?, ?, ?, ?, ?)`

    try {
      await db.query(query, [Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color])
      res.send("Plan created successfully.")
    } catch (error) {
      console.error("Error creating plan:", error)
      res.status(500).send("Error creating plan.")
    }
  }
]

// Get plans for a specified application (All Roles)
exports.getPlans = async (req, res) => {
  const { appAcronym } = req.body

  if (!appAcronym) {
    return res.status(400).send("App Acronym is required.")
  }

  const query = `
    SELECT * 
    FROM Plan
    WHERE Plan_app_Acronym = ?`

  try {
    const [plans] = await db.execute(query, [appAcronym])
    if (!plans.length) {
      return res.status(404).send("No plans found for the specified app.")
    }
    res.json(plans)
  } catch (error) {
    console.error("Error fetching plans:", error)
    res.status(500).send("Server error, please try again later.")
  }
}

exports.createTaskValidationRules = [body("Task_name").notEmpty().withMessage("Task name is mandatory.").isLength({ max: 255 }).withMessage("Task name must not exceed 255 characters."), body("Task_creator").notEmpty().withMessage("Task creator is required."), body("Task_owner").notEmpty().withMessage("Task owner is required."), body("App_Acronym").notEmpty().withMessage("Application acronym is required.")]

// Create a new task (Project Lead)
exports.createTask = [
  exports.createTaskValidationRules,
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array().map(error => ({ msg: error.msg }))
      })
    }

    const { Task_plan, Task_name, Task_description = "", Task_creator, Task_owner, Task_createDate, App_Acronym } = req.body

    const Task_app_Acronym = App_Acronym

    try {
      // Count existing tasks to determine new Task_Rnumber
      const countQuery = `SELECT COUNT(*) AS taskCount FROM Task WHERE Task_app_Acronym = ?`
      const [rows] = await db.query(countQuery, [Task_app_Acronym])
      const taskCount = rows[0].taskCount || 0
      const Task_Rnumber = taskCount + 1
      const Task_id = `${Task_app_Acronym}_${Task_Rnumber}`

      // Format the date to remove the time component (assuming Task_createDate is in a valid date string format)
      const formattedCreateDate = new Date(Task_createDate).toISOString().split("T")[0]

      const initialTaskState = "Open"
      const timestamp = getUTCPlus8Timestamp()
      const formattedNote = `*************\nTASK CREATED 
      [${Task_creator}, promoted to '${initialTaskState}' state, ${timestamp}]\n`

      const query = `
        INSERT INTO Task 
        (Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, Task_notes, Task_state, Task_creator, Task_owner, Task_createDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

      const values = [Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, formattedNote, initialTaskState, Task_creator, Task_owner, formattedCreateDate]

      await db.query(query, values)

      res.send("Task created successfully.")
    } catch (error) {
      console.error("Error creating task:", error)
      res.status(500).send("Error creating task.")
    }
  }
]

exports.releaseTask = async (req, res) => {
  const { Task_id, App_Acronym, Task_owner } = req.body // Accept Task_owner
  const newState = "To-Do"
  const currentState = "Open"

  if (!Task_id || !App_Acronym || !Task_owner) {
    return res.status(400).send("Task_id, App_Acronym, and Task_owner are required.")
  }

  try {
    const [[existingTask]] = await db.execute("SELECT Task_state, Task_notes FROM Task WHERE Task_id = ? AND Task_app_Acronym = ?", [Task_id, App_Acronym])

    if (!existingTask) {
      return res.status(404).send("Task not found or App_Acronym does not match.")
    }

    if (existingTask.Task_state !== currentState) {
      return res.status(400).send(`Task must be in '${currentState}' state to be released.`)
    }

    const timestamp = getUTCPlus8Timestamp()
    const newNotes = `
*************
TASK RELEASED 
[${Task_owner}, promoted from '${currentState}' state to '${newState}' state, ${timestamp}]

${existingTask.Task_notes || ""}
    `

    const query = `
      UPDATE Task 
      SET Task_state = ?, Task_notes = ?, Task_owner = ? 
      WHERE Task_id = ? AND Task_state = ? AND Task_app_Acronym = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_owner, Task_id, currentState, App_Acronym])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found, already released, or App_Acronym does not match.")
    }

    res.send("Task successfully released to To-Do.")
  } catch (error) {
    console.error("Error releasing task:", error)
    res.status(500).send("Error releasing task.")
  }
}

// Assign Task to Developer (Developer)
exports.assignTask = async (req, res) => {
  const { Task_id, Task_owner } = req.body // Accept Task_owner
  const newState = "Doing"
  const currentState = "To-Do"

  if (!Task_id || !Task_owner) {
    return res.status(400).send("Task_id and Task_owner are required.")
  }

  try {
    const [[existingTask]] = await db.execute("SELECT Task_notes, Task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be assigned.")
    }

    const timestamp = getUTCPlus8Timestamp()
    const newNotes = `
*************
TASK ASSIGNED 
[${Task_owner}, promoted from '${currentState}' state to '${newState}' state, ${timestamp}]

${existingTask.Task_notes || ""}
    `

    const query = `
      UPDATE Task 
      SET Task_owner = ?, Task_state = ?, Task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [Task_owner, newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be assigned.")
    }

    res.send("Task assigned successfully.")
  } catch (error) {
    console.error("Error assigning task:", error)
    res.status(500).send("Error assigning task.")
  }
}

// // Unassign Task (Developer)
// exports.unassignTask = async (req, res) => {
//   const { Task_id } = req.body
//   const newState = "To-Do"
//   const currentState = "Doing"
//   const Task_owner = req.user?.username || "unknown"

//   try {
//     // Retrieve existing task notes before updating
//     const [[existingTask]] = await db.execute("SELECT Task_notes, Task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

//     if (!existingTask) {
//       return res.status(404).send("Task not found or cannot be unassigned.")
//     }

//     // Append new notes
//     const timestamp = getUTCPlus8Timestamp()
//     const newNotes = `
// *************
// TASK UNASSIGNED [${Task_owner}, demoted from '${currentState}' state to '${newState}' state, ${timestamp}]

// ${existingTask.Task_notes || ""}
//     `

//     // Update the task state, notes, and reset owner
//     const query = `
//       UPDATE Task
//       SET Task_owner = NULL, Task_state = ?, Task_notes = ?
//       WHERE Task_id = ? AND Task_state = ?`
//     const [result] = await db.execute(query, [newState, newNotes, Task_id, currentState])

//     if (result.affectedRows === 0) {
//       return res.status(404).send("Task not found or cannot be unassigned.")
//     }

//     res.send("Task unassigned successfully.")
//   } catch (error) {
//     console.error("Error unassigning task:", error)
//     res.status(500).send("Error unassigning task.")
//   }
// }

// Unassign Task (Developer)
exports.unassignTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = "To-Do"
  const currentState = "Doing"
  const Task_owner = req.user?.username || "unknown" // Use the current user who unassigns the task as Task_owner

  try {
    // Retrieve existing task notes and state before updating
    const [[existingTask]] = await db.execute("SELECT Task_notes, Task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be unassigned.")
    }

    // Append new notes
    const timestamp = getUTCPlus8Timestamp()
    const newNotes = `
*************
TASK UNASSIGNED 
[${Task_owner}, demoted from '${currentState}' state to '${newState}' state, ${timestamp}]

${existingTask.Task_notes || ""}
    `

    // Update the task state, notes, and keep the current owner as the user performing the action
    const query = `
      UPDATE Task 
      SET Task_state = ?, Task_notes = ?, Task_owner = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_owner, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be unassigned.")
    }

    res.send("Task unassigned successfully.")
  } catch (error) {
    console.error("Error unassigning task:", error)
    res.status(500).send("Error unassigning task.")
  }
}

// Review Task (Developer)
exports.reviewTask = async (req, res) => {
  const { Task_id, app_acronym } = req.body
  const newState = "Done"
  const currentState = "Doing"
  const Task_owner = req.user?.username

  if (!Task_id || !app_acronym) {
    return res.status(400).send("Task_id or app_acronym is missing.")
  }

  try {
    // Retrieve existing task notes before updating
    const [[existingTask]] = await db.execute("SELECT Task_notes, Task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be completed.")
    }

    // Append new notes
    const timestamp = new Date().toISOString().replace("T", " ").split(".")[0]
    const newNotes = `
*************
TASK SENT FOR REVIEW 
[${Task_owner}, promoted from '${currentState}' state to '${newState}' state, ${timestamp}]
${existingTask.Task_notes || ""}
    `

    // Update the task state, notes, and set owner
    const query = `
      UPDATE Task 
      SET Task_owner = ?, Task_state = ?, Task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [Task_owner, newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be completed.")
    }

    // Retrieve permitted groups for the "Done" state using App_permit_done
    const [[{ group }]] = await db.execute("SELECT App_permit_Done AS `group` FROM application WHERE App_Acronym = ?", [app_acronym])

    if (!group) {
      console.warn("No permitted group found for the app.")
      return res.send("Task completed successfully, but no notifications were sent.")
    }

    // Retrieve users in the specified group(s)
    const [userarray] = await db.execute({ sql: "SELECT username FROM UserGroup WHERE user_group = ?", rowsAsArray: true }, [group])

    if (userarray.length === 0) {
      console.warn("No users found in the specified group(s).")
      return res.send("Task completed successfully, but no notifications were sent.")
    }

    // Retrieve email addresses of the users
    const [emails] = await db.execute(
      {
        sql: `SELECT DISTINCT email FROM accounts WHERE username IN (${userarray
          .flat()
          .map(() => "?")
          .join(",")})`,
        rowsAsArray: true
      },
      userarray.flat()
    )

    // Send email notification if there are valid email addresses
    if (emails.flat().filter(email => email !== "").length) {
      transporter.sendMail(
        {
          from: "taskmanagementsystem@tms.com",
          to: emails.flat(),
          subject: `Task ${Task_id} has been moved to the 'Done' state`,
          text: `The task with ID ${Task_id} has been promoted to the 'Done' state by ${Task_owner}. 
          Please review if further action is required.`
        },
        (error, info) => {
          if (error) {
            console.error("Error sending email:", error)
          } else {
            console.res.send("success")
          }
        }
      )
    }

    res.send("Task completed successfully.")
  } catch (error) {
    console.error("Error completing task:", error)
    res.status(500).send("Error completing task.")
  }
}

// Approve Task (Project Lead)
exports.approveTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = "Closed"
  const currentState = "Done"
  const Task_owner = req.user?.username

  try {
    // Retrieve existing task notes before updating
    const [[existingTask]] = await db.execute("SELECT Task_notes, Task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be approved.")
    }

    // Append new notes
    const timestamp = getUTCPlus8Timestamp()
    const newNotes = `
*************
TASK APPROVED AND CLOSED 
[${Task_owner}, promoted from '${currentState}' state to '${newState}' state, ${timestamp}]

${existingTask.Task_notes || ""}
    `

    // Update the task state, notes, and set owner
    const query = `
      UPDATE Task 
      SET Task_owner = ?, Task_state = ?, Task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [Task_owner, newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be approved.")
    }

    res.send("Task approved and closed.")
  } catch (error) {
    console.error("Error approving task:", error)
    res.status(500).send("Error approving task.")
  }
}

// Reject Task (Project Lead)
exports.rejectTask = async (req, res) => {
  const { Task_id, newPlan } = req.body // Accept newPlan as part of the request body
  const newState = "Doing"
  const currentState = "Done"
  const Task_owner = req.user?.username || "unknown" // Set the user who rejects the task as the Task_owner

  try {
    // Retrieve existing task notes and state before updating
    const [[existingTask]] = await db.execute("SELECT Task_notes, Task_state, Task_plan FROM task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be rejected.")
    }

    // Handle plan change (including setting to empty/null)
    let planUpdateQuery = ""
    let planUpdateValues = []
    if (newPlan !== undefined) {
      planUpdateQuery = ", Task_plan = ?"
      planUpdateValues.push(newPlan || null) // Set to NULL if empty to remove the Task_plan
    }

    // Append new notes
    const timestamp = getUTCPlus8Timestamp()
    const newNotes = `
*************
TASK REJECTED 
[${Task_owner}, demoted from '${currentState}' state to '${newState}' state, ${timestamp}]
${existingTask.Task_notes || ""}
    `

    // Update the task state, notes, owner, and optionally the plan
    const query = `
      UPDATE Task 
      SET Task_state = ?, Task_notes = ?, Task_owner = ? ${planUpdateQuery}
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_owner, ...planUpdateValues, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be rejected.")
    }

    res.send("Task rejected and moved to Doing.")
  } catch (error) {
    console.error("Error rejecting task:", error)
    res.status(500).send("Error rejecting task.")
  }
}

// Get Tasks (All Roles)
exports.getTasks = async (req, res) => {
  const { App_Acronym } = req.body

  try {
    const tasksQuery = `SELECT * FROM Task WHERE Task_app_Acronym = ?`
    const [tasksArray] = await db.execute(tasksQuery, [App_Acronym])

    res.json(tasksArray)
  } catch (error) {
    console.error("Error retrieving tasks:", error)
    res.status(500).send("Server error, please try again later.")
  }
}

// View Task (All Roles)
exports.viewTask = async (req, res) => {
  const { taskId } = req.body

  try {
    const taskQuery = `SELECT * FROM Task WHERE Task_id = ?`
    const [task] = await db.execute(taskQuery, [taskId])

    if (!task.length) {
      return res.status(404).send("Task not found.")
    }

    // Format the Task_createDate to only include the date part
    if (task[0].Task_createDate) {
      task[0].Task_createDate = new Date(task[0].Task_createDate).toISOString().split("T")[0]
    }

    // Separate query to fetch plan details
    let planDetails = {}
    if (task[0].Task_plan) {
      const planQuery = `SELECT Plan_startDate, Plan_endDate FROM Plan WHERE Plan_MVP_name = ?`
      const [plan] = await db.execute(planQuery, [task[0].Task_plan])
      if (plan.length) {
        planDetails = plan[0]

        // Format Plan_startDate and Plan_endDate to only include the date part
        if (planDetails.Plan_startDate) {
          planDetails.Plan_startDate = new Date(planDetails.Plan_startDate).toISOString().split("T")[0]
        }
        if (planDetails.Plan_endDate) {
          planDetails.Plan_endDate = new Date(planDetails.Plan_endDate).toISOString().split("T")[0]
        }
      }
    }

    const responseData = {
      ...task[0],
      Plan_startDate: planDetails.Plan_startDate || null,
      Plan_endDate: planDetails.Plan_endDate || null
    }

    res.json(responseData)
  } catch (error) {
    console.error("Error fetching task:", error)
    res.status(500).send("Server error, please try again later.")
  }
}

// exports.saveTaskNotes = async (req, res) => {
//   const { Task_id, newNote, Task_plan } = req.body

//   if (!Task_id) {
//     return res.status(400).send("Task ID is required.")
//   }

//   try {
//     // Retrieve existing task notes and plan
//     const [[existingTask]] = await db.execute("SELECT Task_notes, Task_plan, Task_state FROM Task WHERE Task_id = ?", [Task_id])

//     if (!existingTask) {
//       return res.status(404).send("Task not found.")
//     }

//     // Prepare audit entry using the utility function for GMT+8 conversion
//     const username = req.body.username || "unknown"
//     const state = existingTask.Task_state || "Unknown"
//     const timestamp = getUTCPlus8Timestamp() // Use your utility function for timestamp
//     const auditEntry = `[${username}, ${state}, ${timestamp}]`

//     // Prepare note entries
//     let noteEntry = ""

//     // Handle plan change note
//     if (Task_plan !== undefined && Task_plan !== existingTask.Task_plan) {
//       noteEntry += `*************\nThe Task Plan has been changed to '${Task_plan || "None"}'. ${auditEntry}`
//     }

//     // Append user-provided note if present
//     if (newNote) {
//       if (noteEntry) {
//         // If there is already a noteEntry (e.g., plan change), add a new entry with a separator
//         noteEntry += `\n*************\n${newNote} ${auditEntry}`
//       } else {
//         // Add user note with a separator if no plan change note exists
//         noteEntry = `*************\n${newNote} ${auditEntry}`
//       }
//     }

//     // If no plan change and no additional note, return without making updates
//     if (!noteEntry.trim()) {
//       return res.status(400).send("No changes detected.")
//     }

//     // Combine new note with existing notes, ensuring consistent formatting
//     const updatedNotes = `${noteEntry.trim()}\n\n${existingTask.Task_notes || ""}`.trim()

//     // Build the base query and values for updating task notes (and optionally the plan)
//     let query = "UPDATE Task SET Task_notes = ?"
//     const values = [updatedNotes]

//     // Check if Task_plan needs to be updated
//     if (Task_plan !== undefined && Task_plan !== existingTask.Task_plan) {
//       query += ", Task_plan = ?"
//       values.push(Task_plan)
//     }

//     query += " WHERE Task_id = ?"
//     values.push(Task_id)

//     // Update the task notes (and optionally the plan) in the database
//     const [result] = await db.execute(query, values)

//     if (result.affectedRows === 0) {
//       return res.status(404).send("Task not found or unable to update notes.")
//     }

//     res.send("Task notes and plan updated successfully.")
//   } catch (error) {
//     console.error("Error updating task notes:", error)
//     res.status(500).send("Server error, unable to update notes.")
//   }
// }

exports.saveTaskNotes = async (req, res) => {
  const { Task_id, newNote, Task_plan } = req.body

  if (!Task_id) {
    return res.status(400).send("Task ID is required.")
  }

  try {
    // Retrieve existing task notes and plan
    const [[existingTask]] = await db.execute("SELECT Task_notes, Task_plan, Task_state FROM Task WHERE Task_id = ?", [Task_id])

    if (!existingTask) {
      return res.status(404).send("Task not found.")
    }

    // Prepare audit entry using the utility function for GMT+8 conversion
    const username = req.body.username || "unknown"
    const state = existingTask.Task_state || "Unknown"
    const timestamp = getUTCPlus8Timestamp() // Use your utility function for timestamp

    // Prepare note entries
    let noteEntry = ""

    // Only add user-provided note if present
    if (newNote) {
      noteEntry = `*************\n${newNote} 
      [${username}, State: '${state}', ${timestamp}]`
    }

    // If no note is provided, ensure we still handle possible plan changes
    const hasPlanChanged = Task_plan !== undefined && Task_plan !== existingTask.Task_plan

    // Combine new note with existing notes, ensuring consistent formatting
    const updatedNotes = noteEntry ? `${noteEntry.trim()}\n\n${existingTask.Task_notes || ""}`.trim() : existingTask.Task_notes

    // Build the base query and values for updating task notes (without updating Task_plan)
    let query = "UPDATE Task SET Task_notes = ?"
    const values = [updatedNotes]

    // Check if Task_plan needs to be updated without logging
    if (hasPlanChanged) {
      query += ", Task_plan = ?"
      values.push(Task_plan)
    }

    query += " WHERE Task_id = ?"
    values.push(Task_id)

    // Update the task notes (and optionally the plan) in the database
    const [result] = await db.execute(query, values)

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or unable to update notes.")
    }

    res.send("Task notes and plan updated successfully.")
  } catch (error) {
    console.error("Error updating task notes:", error)
    res.status(500).send("Server error, unable to update notes.")
  }
}

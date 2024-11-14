const db = require("../models/db")
const { getUTCPlus8Timestamp } = require("../utils/timestamp")
const nodemailer = require("nodemailer")

// Configure Nodemailer with Ethereal Email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.ethereal.email",
  port: process.env.EMAIL_PORT || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// Create a new application (Project Lead)
exports.createApplication = async (req, res) => {
  const { App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create } = req.body

  console.log("Received data:", req.body)

  const query = `
    INSERT INTO APPLICATION 
    (App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

  try {
    await db.query(query, [App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create])
    res.status(201).send("Application created successfully.")
  } catch (error) {
    console.error("Error creating application:", error)
    res.status(500).send("Error creating application.")
  }
}

// Update an existing application (Project Lead)
exports.updateApplication = async (req, res) => {
  const { App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create } = req.body

  console.log("Update request received with data:", req.body)

  const query = `
    UPDATE APPLICATION 
    SET App_Description = ?, App_Rnumber = ?, App_startDate = ?, App_endDate = ?, App_permit_Open = ?, App_permit_toDoList = ?, App_permit_Doing = ?, App_permit_Done = ?, App_permit_Create = ? 
    WHERE App_Acronym = ?`

  try {
    await db.query(query, [App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create, App_Acronym])
    res.status(200).send("Application updated successfully.")
  } catch (error) {
    console.error("Error during application update:", error)
    res.status(500).send("Error updating application.")
  }
}

// Get all applications (All Roles)
exports.getApplications = async (req, res) => {
  const query = `SELECT * FROM APPLICATION`

  try {
    const [results] = await db.query(query)
    res.status(200).json(results)
  } catch (error) {
    res.status(500).send("Error retrieving applications.")
  }
}

// Create a new plan (Project Manager)
exports.createPlan = async (req, res) => {
  const { Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color } = req.body

  if (!Plan_app_Acronym) {
    return res.status(400).send("Plan_app_Acronym is required.")
  }

  const query = `
    INSERT INTO Plan 
    (Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color) 
    VALUES (?, ?, ?, ?, ?)`

  try {
    await db.query(query, [Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color])
    res.status(201).send("Plan created successfully.")
  } catch (error) {
    console.error("Error creating plan:", error)
    res.status(500).send("Error creating plan.")
  }
}

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

// Create a new task (Project Lead)
exports.createTask = async (req, res) => {
  const { Task_plan, Task_name, Task_description = "", Task_creator, Task_owner, Task_createDate, App_Acronym } = req.body

  const Task_app_Acronym = App_Acronym

  if (!Task_app_Acronym || !Task_name || !Task_creator || !Task_owner || !Task_createDate) {
    return res.status(400).send("Required fields are missing.")
  }

  try {
    const countQuery = `SELECT COUNT(*) AS taskCount FROM Task WHERE Task_app_Acronym = ?`
    const [rows] = await db.query(countQuery, [Task_app_Acronym])
    const taskCount = rows[0].taskCount || 0
    const Task_Rnumber = taskCount + 1
    const Task_id = `${Task_app_Acronym}_${Task_Rnumber}`

    // Format the date to remove the time component (assuming Task_createDate is in a valid date string format)
    const formattedCreateDate = new Date(Task_createDate).toISOString().split("T")[0]

    const initialTaskState = "Open"
    const timestamp = getUTCPlus8Timestamp()
    const formattedNote = `*************\nTASK CREATED [${Task_creator}, promoted to '${initialTaskState}' state, ${timestamp}]\n`

    const query = `
      INSERT INTO Task 
      (Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, Task_notes, Task_state, Task_creator, Task_owner, Task_createDate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    const values = [Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, formattedNote, initialTaskState, Task_creator, Task_owner, formattedCreateDate]

    await db.query(query, values)

    console.log(`Task Created: ID=${Task_id}, Name=${Task_name}, State=${initialTaskState}, Created by=${Task_creator}, Date=${formattedCreateDate}`)
    res.status(201).send("Task created successfully.")
  } catch (error) {
    console.error("Error creating task:", error)
    res.status(500).send("Error creating task.")
  }
}

exports.releaseTask = async (req, res) => {
  const { Task_id, App_Acronym } = req.body
  const newState = "To-Do"
  const currentState = "Open"

  if (!Task_id || !App_Acronym) {
    return res.status(400).send("Task_id and App_Acronym are required.")
  }

  try {
    console.log("Received Task_id:", Task_id, "Received App_Acronym:", App_Acronym)

    // Fetch the existing task state and notes to verify current state and task existence
    const [[existingTask]] = await db.execute("SELECT Task_state, Task_notes FROM Task WHERE Task_id = ? AND Task_app_Acronym = ?", [Task_id, App_Acronym])

    if (!existingTask) {
      return res.status(404).send("Task not found or App_Acronym does not match.")
    }

    console.log("Existing Task State:", existingTask.Task_state)

    if (existingTask.Task_state !== currentState) {
      return res.status(400).send(`Task must be in '${currentState}' state to be released.`)
    }

    // Append new notes
    const timestamp = getUTCPlus8Timestamp()
    const newNotes = `
*************
TASK RELEASED [${req.user?.username || "unknown"}, promoted from '${currentState}' state to '${newState}' state, ${timestamp}]

${existingTask.Task_notes || ""}
    `

    // Update the state and notes
    const query = `
      UPDATE Task 
      SET Task_state = ?, Task_notes = ? 
      WHERE Task_id = ? AND Task_state = ? AND Task_app_Acronym = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_id, currentState, App_Acronym])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found, already released, or App_Acronym does not match.")
    }

    res.status(200).send("Task successfully released to To-Do.")
  } catch (error) {
    console.error("Error releasing task:", error)
    res.status(500).send("Error releasing task.")
  }
}

// Assign Task to Developer (Developer)
exports.assignTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = "Doing"
  const currentState = "To-Do"
  const Task_owner = req.user?.username || "unknown"

  if (!Task_owner) {
    return res.status(401).send("User information missing. Cannot assign task.")
  }

  try {
    // Retrieve existing task notes before updating
    const [[existingTask]] = await db.execute("SELECT Task_notes, Task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be assigned.")
    }

    // Append new notes
    const timestamp = getUTCPlus8Timestamp()
    const newNotes = `
*************
TASK ASSIGNED [${Task_owner}, promoted from '${currentState}' state to '${newState}' state, ${timestamp}]

${existingTask.Task_notes || ""}
    `

    // Update the task state, owner, and notes
    const query = `
      UPDATE Task 
      SET Task_owner = ?, Task_state = ?, Task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [Task_owner, newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be assigned.")
    }

    res.status(200).send("Task assigned successfully.")
  } catch (error) {
    console.error("Error assigning task:", error)
    res.status(500).send("Error assigning task.")
  }
}

// Unassign Task (Developer)
exports.unassignTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = "To-Do"
  const currentState = "Doing"
  const Task_owner = req.user?.username || "unknown"

  try {
    // Retrieve existing task notes before updating
    const [[existingTask]] = await db.execute("SELECT Task_notes, Task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be unassigned.")
    }

    // Append new notes
    const timestamp = getUTCPlus8Timestamp()
    const newNotes = `
*************
TASK UNASSIGNED [${Task_owner}, demoted from '${currentState}' state to '${newState}' state, ${timestamp}]

${existingTask.Task_notes || ""}
    `

    // Update the task state and notes
    const query = `
      UPDATE Task 
      SET Task_owner = NULL, Task_state = ?, Task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be unassigned.")
    }

    res.status(200).send("Task unassigned successfully.")
  } catch (error) {
    console.error("Error unassigning task:", error)
    res.status(500).send("Error unassigning task.")
  }
}

// Review Task (Developer)
exports.reviewTask = async (req, res) => {
  console.log("Incoming request data:", req.body)
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
TASK SENT FOR REVIEW [${Task_owner}, promoted from '${currentState}' state to '${newState}' state, ${timestamp}]
${existingTask.Task_notes || ""}
    `

    // Update the task state and notes
    const query = `
      UPDATE Task 
      SET Task_state = ?, Task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be completed.")
    }

    // Retrieve permitted groups for the "Done" state using App_permit_done
    const [[{ group }]] = await db.execute("SELECT App_permit_Done AS `group` FROM application WHERE App_Acronym = ?", [app_acronym])

    if (!group) {
      console.warn("No permitted group found for the app.")
      return res.status(200).send("Task completed successfully, but no notifications were sent.")
    }

    // Retrieve users in the specified group(s)
    const [userarray] = await db.execute({ sql: "SELECT username FROM UserGroup WHERE user_group = ?", rowsAsArray: true }, [group])

    if (userarray.length === 0) {
      console.warn("No users found in the specified group(s).")
      return res.status(200).send("Task completed successfully, but no notifications were sent.")
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
          from: "tms@tms.com",
          to: emails.flat(),
          subject: `Task ${Task_id} has been moved to Done`,
          text: `The task with ID ${Task_id} has been promoted to the 'Done' state by ${Task_owner}. Please review if further action is required.`
        },
        (error, info) => {
          if (error) {
            console.error("Error sending email:", error)
          } else {
            console.log("Email sent: %s", info.messageId)
            console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info))
          }
        }
      )
    }

    res.status(200).send("Task completed successfully.")
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
  const Task_owner = req.user?.username || "unknown"

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
TASK APPROVED AND CLOSED [${Task_owner}, promoted from '${currentState}' state to '${newState}' state, ${timestamp}]

${existingTask.Task_notes || ""}
    `

    // Update the task state and notes
    const query = `
      UPDATE Task 
      SET Task_state = ?, Task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be approved.")
    }

    res.status(200).send("Task approved and closed.")
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
  const Task_owner = req.user?.username || "unknown"

  try {
    // Retrieve existing task notes and state before updating
    const [[existingTask]] = await db.execute("SELECT Task_notes, Task_state, Task_plan FROM task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be rejected.")
    }

    // Check if a plan change is requested and update it
    let planUpdateQuery = ""
    let planUpdateValues = []
    if (newPlan && newPlan !== existingTask.Task_plan) {
      planUpdateQuery = ", Task_plan = ?"
      planUpdateValues.push(newPlan)
    }

    // Append new notes
    const timestamp = getUTCPlus8Timestamp()
    const newNotes = `
*************
TASK REJECTED [${Task_owner}, demoted from '${currentState}' state to '${newState}' state, ${timestamp}]
${existingTask.Task_notes || ""}
    `

    // Update the task state, notes, and optionally the plan
    const query = `
      UPDATE Task 
      SET Task_state = ?, Task_notes = ? ${planUpdateQuery}
      WHERE Task_id = ? AND Task_state = ?
    `
    const [result] = await db.execute(query, [newState, newNotes, ...planUpdateValues, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be rejected.")
    }

    res.status(200).send("Task rejected and moved to Doing.")
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

    res.status(200).json(tasksArray)
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

    res.status(200).json(responseData)
  } catch (error) {
    console.error("Error fetching task:", error)
    res.status(500).send("Server error, please try again later.")
  }
}

exports.saveTaskNotes = async (req, res) => {
  const { Task_id, newNote } = req.body

  if (!Task_id || !newNote) {
    return res.status(400).send("Task ID and note are required.")
  }

  try {
    // Retrieve existing task notes
    const [[existingTask]] = await db.execute("SELECT Task_notes FROM Task WHERE Task_id = ?", [Task_id])

    if (!existingTask) {
      return res.status(404).send("Task not found.")
    }

    // Append the new note
    const updatedNotes = `${newNote}\n\n${existingTask.Task_notes || ""}`

    // Update the task notes in the database
    const query = "UPDATE Task SET Task_notes = ? WHERE Task_id = ?"
    const [result] = await db.execute(query, [updatedNotes, Task_id])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or unable to update notes.")
    }

    res.status(200).send("Task notes updated successfully.")
  } catch (error) {
    console.error("Error updating task notes:", error)
    res.status(500).send("Server error, unable to update notes.")
  }
}

const db = require("../models/db")

// Utility function for getting the current timestamp
const getTimestamp = () => {
  // Create a new date object
  const date = new Date()

  // Convert to UTC+8 by adding 8 hours (8 * 60 * 60 * 1000 milliseconds)
  const offsetMilliseconds = 8 * 60 * 60 * 1000
  const adjustedDate = new Date(date.getTime() + offsetMilliseconds)

  // Format the date to the desired string format
  return adjustedDate.toISOString().slice(0, 19).replace("T", " ")
}

const convertToMySQLDate = dateString => {
  // Convert a date string in MM/DD/YYYY format to YYYY-MM-DD
  const [month, day, year] = dateString.split("/")
  return `${year}-${month}-${day}`
}

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
    const formattedCreateDate = convertToMySQLDate(Task_createDate)
    const initialTaskState = "Open"

    const timestamp = getTimestamp()
    const formattedNote = `*************\nTASK CREATED [${Task_creator || "unknown"}, ${initialTaskState}, ${timestamp}]\n`

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

// Release Task to To-Do (Project Manager)
exports.releaseTask = async (req, res) => {
  const { Task_id, App_Acronym } = req.body
  const newState = "To-Do"
  const currentState = "Open"

  if (!Task_id || !App_Acronym) {
    return res.status(400).send("Task_id and App_Acronym are required.")
  }

  try {
    // Fetch the existing task state and notes to verify current state and task existence
    const [[existingTask]] = await db.execute("SELECT task_state, task_notes FROM task WHERE task_id = ? AND task_app_Acronym = ?", [Task_id, App_Acronym])

    if (!existingTask) {
      return res.status(404).send("Task not found or App_Acronym does not match.")
    }

    if (existingTask.task_state !== currentState) {
      return res.status(400).send(`Task must be in '${currentState}' state to be released.`)
    }

    // Append new notes
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
    const newNotes = `
*************
TASK RELEASED [${req.user?.username || "unknown"}, ${currentState} -> ${newState}, ${timestamp}]

${existingTask.task_notes || ""}
    `

    // Update the state and notes
    const query = `
      UPDATE task 
      SET task_state = ?, task_notes = ? 
      WHERE task_id = ? AND task_state = ? AND task_app_Acronym = ?`
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
    const [[existingTask]] = await db.execute("SELECT task_notes, task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be assigned.")
    }

    // Append new notes
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
    const newNotes = `
*************
TASK ASSIGNED [${Task_owner}, ${currentState} -> ${newState}, ${timestamp}]

${existingTask.task_notes || ""}
    `

    // Update the task state, owner, and notes
    const query = `
      UPDATE Task 
      SET Task_owner = ?, Task_state = ?, task_notes = ? 
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
    const [[existingTask]] = await db.execute("SELECT task_notes, task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be unassigned.")
    }

    // Append new notes
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
    const newNotes = `
*************
TASK UNASSIGNED [${Task_owner}, ${currentState} -> ${newState}, ${timestamp}]

${existingTask.task_notes || ""}
    `

    // Update the task state and notes
    const query = `
      UPDATE Task 
      SET Task_owner = NULL, Task_state = ?, task_notes = ? 
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
  const { Task_id } = req.body
  const newState = "Done"
  const currentState = "Doing"
  const Task_owner = req.user?.username || "unknown"

  try {
    // Retrieve existing task notes before updating
    const [[existingTask]] = await db.execute("SELECT task_notes, task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be completed.")
    }

    // Append new notes
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
    const newNotes = `
*************
TASK SENT FOR REVIEW [${Task_owner}, ${currentState} -> ${newState}, ${timestamp}]
${existingTask.task_notes || ""}
    `

    // Update the task state and notes
    const query = `
      UPDATE Task 
      SET Task_state = ?, task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be completed.")
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
    const [[existingTask]] = await db.execute("SELECT task_notes, task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be approved.")
    }

    // Append new notes
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
    const newNotes = `
*************
TASK APPROVED AND CLOSED [${Task_owner}, ${currentState} -> ${newState}, ${timestamp}]

${existingTask.task_notes || ""}
    `

    // Update the task state and notes
    const query = `
      UPDATE Task 
      SET Task_state = ?, task_notes = ? 
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
  const { Task_id } = req.body
  const newState = "Doing"
  const currentState = "Done"
  const Task_owner = req.user?.username || "unknown"

  try {
    // Retrieve existing task notes before updating
    const [[existingTask]] = await db.execute("SELECT task_notes, task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be rejected.")
    }

    // Append new notes
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
    const newNotes = `
*************
TASK REJECTED [${Task_owner}, ${currentState} -> ${newState}, ${timestamp}]

${existingTask.task_notes || ""}
    `

    // Update the task state and notes
    const query = `
      UPDATE Task 
      SET Task_state = ?, task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be rejected.")
    }

    res.status(200).send("Task rejected and moved to Doing.")
  } catch (error) {
    console.error("Error rejecting task:", error)
    res.status(500).send("Error rejecting task.")
  }
}

// Close Task (Project Lead)
exports.closeTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = "Closed"
  const currentState = "Done"
  const Task_owner = req.user?.username || "unknown"

  try {
    // Retrieve existing task notes before updating
    const [[existingTask]] = await db.execute("SELECT task_notes, task_state FROM Task WHERE Task_id = ? AND Task_state = ?", [Task_id, currentState])

    if (!existingTask) {
      return res.status(404).send("Task not found or cannot be closed.")
    }

    // Append new notes
    const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
    const newNotes = `
*************
TASK CLOSED [${Task_owner}, ${currentState} -> ${newState}, ${timestamp}]

${existingTask.task_notes || ""}
    `

    // Update the task state and notes
    const query = `
      UPDATE Task 
      SET Task_state = ?, task_notes = ? 
      WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.execute(query, [newState, newNotes, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be closed.")
    }

    res.status(200).send("Task closed successfully.")
  } catch (error) {
    console.error("Error closing task:", error)
    res.status(500).send("Error closing task.")
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

    // Separate query to fetch plan details
    let planDetails = {}
    if (task[0].Task_plan) {
      const planQuery = `SELECT Plan_startDate, Plan_endDate FROM Plan WHERE Plan_MVP_name = ?`
      const [plan] = await db.execute(planQuery, [task[0].Task_plan])
      if (plan.length) {
        planDetails = plan[0]
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

const db = require("../models/db")

// Utility function for getting the current timestamp
const getTimestamp = () => new Date().toISOString().slice(0, 19).replace("T", " ")
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

// // Controller for creating a task (PL)
// exports.createTask = async (req, res) => {
//   const {
//     Task_plan,
//     Task_name,
//     Task_description = "", // Provide default value
//     Task_creator,
//     Task_owner,
//     Task_createDate,
//     App_Acronym,
//     notes // Ensure notes are captured
//   } = req.body

//   const Task_app_Acronym = App_Acronym

//   // Check for required fields
//   if (!Task_app_Acronym || !Task_name || !Task_creator || !Task_owner || !Task_createDate) {
//     return res.status(400).send("Required fields are missing.")
//   }

//   try {
//     // Generate unique Task ID and Task_Rnumber
//     const countQuery = `SELECT COUNT(*) AS taskCount FROM Task WHERE Task_app_Acronym = ?`
//     const [rows] = await db.query(countQuery, [Task_app_Acronym])
//     const taskCount = rows[0].taskCount || 0
//     const Task_Rnumber = taskCount + 1
//     const Task_id = `${Task_app_Acronym}_${Task_Rnumber}`
//     const formattedCreateDate = convertToMySQLDate(Task_createDate)
//     const mappedTaskState = mapTaskState("Open")

//     // Insert task with notes into database
//     const query = `
//       INSERT INTO Task
//       (Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, Task_notes, Task_state, Task_creator, Task_owner, Task_createDate)
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `
//     const values = [Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, notes, mappedTaskState, Task_creator, Task_owner, formattedCreateDate]
//     await db.query(query, values)

//     console.log(`Task Created: ID=${Task_id}, Name=${Task_name}, State=${mappedTaskState}, Created by=${Task_creator}, Date=${formattedCreateDate}`)
//     res.status(201).send("Task created successfully.")
//   } catch (error) {
//     console.error("Error creating task:", error)
//     res.status(500).send("Error creating task.")
//   }
// }

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

exports.releaseTask = async (req, res) => {
  const { Task_id, App_Acronym } = req.body
  const newState = "To-Do"
  const currentState = "Open"

  if (!Task_id || !App_Acronym) {
    return res.status(400).send("Task_id and App_Acronym are required.")
  }

  try {
    const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ? AND Task_app_Acronym = ?`
    const [result] = await db.query(query, [newState, Task_id, currentState, App_Acronym])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found, already released, or App_Acronym does not match.")
    }
    res.status(200).send("Task released to To-Do.")
  } catch (error) {
    console.error("Error releasing task:", error)
    res.status(500).send("Error releasing task.")
  }
}

exports.assignTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = "Doing"
  const currentState = "To-Do"

  const Task_owner = req.user?.username || "unknown" // Ensure we have a Task_owner

  if (!Task_owner) {
    return res.status(401).send("User information missing. Cannot assign task.")
  }

  try {
    const query = `UPDATE Task SET Task_owner = ?, Task_state = ? WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.query(query, [Task_owner, newState, Task_id, currentState])

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

  try {
    const query = `UPDATE Task SET Task_owner = NULL, Task_state = ? WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.query(query, [newState, Task_id, currentState])

    if (result.affectedRows === 0) {
      return res.status(404).send("Task not found or cannot be unassigned.")
    }
    res.status(200).send("Task unassigned successfully.")
  } catch (error) {
    console.error("Error unassigning task:", error)
    res.status(500).send("Error unassigning task.")
  }
}

// // Start Task (Developer)
// exports.startTask = async (req, res) => {
//   const { Task_id } = req.body
//   const newState = mapTaskState.Doing
//   const currentState = mapTaskState("To-Do")

//   const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
//   try {
//     const [result] = await db.query(query, [newState, Task_id, currentState])
//     if (result.affectedRows === 0) return res.status(404).send("Task not found or cannot be started.")
//     res.status(200).send("Task started successfully.")
//   } catch (error) {
//     res.status(500).send("Error starting task.")
//   }
// }

// Review Task (Developer)
exports.reviewTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = "Done"
  const currentState = "Doing"

  try {
    const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.query(query, [newState, Task_id, currentState])

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

  try {
    const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.query(query, [newState, Task_id, currentState])

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

  try {
    const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.query(query, [newState, Task_id, currentState])

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

  try {
    const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
    const [result] = await db.query(query, [newState, Task_id, currentState])

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

exports.viewTask = async (req, res) => {
  const { taskId } = req.body

  try {
    const taskQuery = `SELECT * FROM Task WHERE Task_id = ?`
    const [task] = await db.execute(taskQuery, [taskId])

    if (!task.length) {
      return res.status(404).send("Task not found.")
    }

    // Fetch Plan details separately if needed
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

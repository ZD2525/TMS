const db = require("../models/db")
const taskStateMap = require("../utils/mapTaskState")

// Create an Application (Project Lead)
exports.createApplication = async (req, res) => {
  const { App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create } = req.body
  const query = `
    INSERT INTO APPLICATION 
    (App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  const values = [App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create]

  try {
    await db.query(query, values)
    res.status(201).send("Application created successfully.")
  } catch (error) {
    res.status(500).send("Error creating application.")
  }
}

// Update an Application (Project Lead)
exports.updateApplication = async (req, res) => {
  const { App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create } = req.body
  const query = `
    UPDATE APPLICATION 
    SET App_Description = ?, App_Rnumber = ?, App_startDate = ?, App_endDate = ?, App_permit_Open = ?, App_permit_toDoList = ?, App_permit_Doing = ?, App_permit_Done = ?, App_permit_Create = ? 
    WHERE App_Acronym = ?`
  const values = [App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create, App_Acronym]

  try {
    await db.query(query, values)
    res.status(200).send("Application updated successfully.")
  } catch (error) {
    res.status(500).send("Error updating application.")
  }
}

// Get Applications (All Roles)
exports.getApplications = async (req, res) => {
  const query = `SELECT * FROM APPLICATION`

  try {
    const [results] = await db.query(query)
    res.status(200).json(results)
  } catch (error) {
    res.status(500).send("Error retrieving applications.")
  }
}

// Create a Plan (Project Manager)
exports.createPlan = async (req, res) => {
  const { Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color } = req.body
  const query = `
    INSERT INTO Plan 
    (Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color) 
    VALUES (?, ?, ?, ?, ?)`
  const values = [Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color]

  try {
    await db.query(query, values)
    res.status(201).send("Plan created successfully.")
  } catch (error) {
    res.status(500).send("Error creating plan.")
  }
}

// Get Plans (All Roles)
exports.getPlans = async (req, res) => {
  const query = `SELECT * FROM Plan`

  try {
    const [results] = await db.query(query)
    res.status(200).json(results)
  } catch (error) {
    res.status(500).send("Error retrieving plans.")
  }
}

// Create a Task (Project Lead)
exports.createTask = async (req, res) => {
  const { Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, Task_notes, Task_state, Task_creator, Task_owner, Task_createDate } = req.body
  const mappedTaskState = taskStateMap[Task_state]
  if (mappedTaskState === undefined) {
    return res.status(400).send("Invalid Task_state provided.")
  }

  const query = `
    INSERT INTO Task 
    (Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, Task_notes, Task_state, Task_creator, Task_owner, Task_createDate) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  const values = [Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, Task_notes, mappedTaskState, Task_creator, Task_owner, Task_createDate]

  try {
    await db.query(query, values)
    res.status(201).send("Task created successfully.")
  } catch (error) {
    console.error("Error creating task:", error)
    res.status(500).send("Error creating task.")
  }
}

// Release Task to To-Do (Project Manager)
exports.releaseTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = taskStateMap["To-Do"]
  const currentState = taskStateMap.Open

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) return res.status(404).send("Task not found or already released.")
    res.status(200).send("Task released to To-Do.")
  } catch (error) {
    res.status(500).send("Error releasing task.")
  }
}

// Assign Task to Developer (Developer)
exports.assignTask = async (req, res) => {
  const { Task_id, Task_owner } = req.body
  const newState = taskStateMap.Doing
  const currentState = taskStateMap["To-Do"]

  const query = `UPDATE Task SET Task_owner = ?, Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [Task_owner, newState, Task_id, currentState])
    if (result.affectedRows === 0) return res.status(404).send("Task not found or cannot be assigned.")
    res.status(200).send("Task assigned successfully.")
  } catch (error) {
    res.status(500).send("Error assigning task.")
  }
}

// Unassign Task (Developer)
exports.unassignTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = taskStateMap["To-Do"]
  const currentState = taskStateMap.Doing

  const query = `UPDATE Task SET Task_owner = NULL, Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) return res.status(404).send("Task not found or cannot be unassigned.")
    res.status(200).send("Task unassigned successfully.")
  } catch (error) {
    res.status(500).send("Error unassigning task.")
  }
}

// Start Task (Developer)
exports.startTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = taskStateMap.Doing
  const currentState = taskStateMap["To-Do"]

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) return res.status(404).send("Task not found or cannot be started.")
    res.status(200).send("Task started successfully.")
  } catch (error) {
    res.status(500).send("Error starting task.")
  }
}

// Complete Task (Developer)
exports.completeTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = taskStateMap.Done
  const currentState = taskStateMap.Doing

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) return res.status(404).send("Task not found or cannot be completed.")
    res.status(200).send("Task completed successfully.")
  } catch (error) {
    res.status(500).send("Error completing task.")
  }
}

// Approve Task (Project Lead)
exports.approveTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = taskStateMap.Closed
  const currentState = taskStateMap.Done

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) return res.status(404).send("Task not found or cannot be approved.")
    res.status(200).send("Task approved and closed.")
  } catch (error) {
    res.status(500).send("Error approving task.")
  }
}

// Reject Task (Project Lead)
exports.rejectTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = taskStateMap.Doing
  const currentState = taskStateMap.Done

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) return res.status(404).send("Task not found or cannot be rejected.")
    res.status(200).send("Task rejected and moved to Doing.")
  } catch (error) {
    res.status(500).send("Error rejecting task.")
  }
}

// Close Task (Project Lead)
exports.closeTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = taskStateMap.Closed
  const currentState = taskStateMap.Done

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) return res.status(404).send("Task not found or cannot be closed.")
    res.status(200).send("Task closed successfully.")
  } catch (error) {
    res.status(500).send("Error closing task.")
  }
}

// Retrieve all tasks (All Roles)
exports.getTasks = async (req, res) => {
  const query = `SELECT * FROM Task`

  try {
    const [results] = await db.query(query)
    res.status(200).json(results)
  } catch (error) {
    res.status(500).send("Error retrieving tasks.")
  }
}

const db = require("../models/db")
const mapTaskState = require("../utils/mapTaskState")

// Create an Application (Project Lead)
exports.createApplication = async (req, res) => {
  const { App_Acronym, App_Description, App_RNumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create } = req.body

  // Log the request body for debugging
  console.log("Received data:", req.body)

  const query = `
    INSERT INTO APPLICATION 
    (App_Acronym, App_Description, App_RNumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

  const values = [App_Acronym, App_Description, App_RNumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create]

  try {
    await db.query(query, values)
    res.status(201).send("Application created successfully.")
  } catch (error) {
    console.error("Error creating application:", error)
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
  const mappedTaskState = mapTaskState(Task_state)
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
  const newState = mapTaskState("To-Do")
  const currentState = mapTaskState("Open")

  if (newState === undefined || currentState === undefined) {
    return res.status(400).send("Invalid task state mapping.")
  }

  console.log("Releasing Task:", Task_id)
  console.log("Current State:", currentState, "New State:", newState)

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) {
      console.log("No task was updated. Either task not found or state condition not met.")
      return res.status(404).send("Task not found or already released.")
    }
    res.status(200).send("Task released to To-Do.")
  } catch (error) {
    console.error("Error releasing task:", error)
    res.status(500).send("Error releasing task.")
  }
}

// Assign Task to Developer (Developer)
exports.assignTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = mapTaskState("Doing")
  const currentState = mapTaskState("To-Do")

  // Assuming you have a middleware that sets req.user with the authenticated user's data
  const Task_owner = req.user.username // Adjust this according to your authentication setup

  if (!Task_owner) {
    return res.status(401).send("User information missing. Cannot assign task.")
  }

  console.log("Assigning Task:", Task_id, "to Owner:", Task_owner)
  console.log("Current State:", currentState, "New State:", newState)

  const query = `UPDATE Task SET Task_owner = ?, Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [Task_owner, newState, Task_id, currentState])
    if (result.affectedRows === 0) {
      console.log("No task was updated. Either task not found or state condition not met.")
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
  const newState = mapTaskState("To-Do")
  const currentState = mapTaskState("Doing")

  if (newState === undefined || currentState === undefined) {
    return res.status(400).send("Invalid task state mapping.")
  }

  console.log("Unassigning Task:", Task_id)
  console.log("Current State:", currentState, "New State:", newState)

  const query = `UPDATE Task SET Task_owner = NULL, Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) {
      console.log("No task was updated. Either task not found or state condition not met.")
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

// Send Task for Review (Developer)
exports.reviewTask = async (req, res) => {
  const { Task_id } = req.body
  const newState = mapTaskState("Done")
  const currentState = mapTaskState("Doing")

  if (newState === undefined || currentState === undefined) {
    return res.status(400).send("Invalid task state mapping.")
  }

  console.log("Completing Task:", Task_id)
  console.log("Current State:", currentState, "New State:", newState)

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) {
      console.log("No task was updated. Either task not found or state condition not met.")
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
  const newState = mapTaskState("Closed")
  const currentState = mapTaskState("Done")

  if (newState === undefined || currentState === undefined) {
    return res.status(400).send("Invalid task state mapping.")
  }

  console.log("Approving Task:", Task_id)
  console.log("Current State:", currentState, "New State:", newState)

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) {
      console.log("No task was updated. Either task not found or state condition not met.")
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
  const newState = mapTaskState("Doing")
  const currentState = mapTaskState("Done")

  if (newState === undefined || currentState === undefined) {
    return res.status(400).send("Invalid task state mapping.")
  }

  console.log("Rejecting Task:", Task_id)
  console.log("Current State:", currentState, "New State:", newState)

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) {
      console.log("No task was updated. Either task not found or state condition not met.")
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
  const newState = mapTaskState("Closed")
  const currentState = mapTaskState("Done")

  if (newState === undefined || currentState === undefined) {
    return res.status(400).send("Invalid task state mapping.")
  }

  console.log("Closing Task:", Task_id)
  console.log("Current State:", currentState, "New State:", newState)

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState])
    if (result.affectedRows === 0) {
      console.log("No task was updated. Either task not found or state condition not met.")
      return res.status(404).send("Task not found or cannot be closed.")
    }
    res.status(200).send("Task closed successfully.")
  } catch (error) {
    console.error("Error closing task:", error)
    res.status(500).send("Error closing task.")
  }
}

// Retrieve tasks related to a specific application (All Roles)
exports.getTasks = async (req, res) => {
  const { appAcronym } = req.query // Extract appAcronym from the query parameters

  if (!appAcronym) {
    return res.status(400).send("appAcronym is required.")
  }

  const tasksQuery = `SELECT * FROM Task WHERE task_app_acronym = ?`
  const plansQuery = `SELECT plan_mvp_name, plan_colour FROM Plan WHERE plan_app_acronym = ?`

  try {
    // Fetch tasks related to the app acronym
    const [tasksArray] = await db.execute(tasksQuery, [appAcronym])

    // Fetch plans related to the app acronym
    const [planArray] = await db.execute(plansQuery, [appAcronym])

    // Create a mapping of plan names to their colors
    const plans = {}
    planArray.forEach(plan => {
      plans[plan.plan_mvp_name] = plan.plan_colour
    })

    // Organize tasks by state
    const tasks = {
      open: [],
      todo: [],
      doing: [],
      done: [],
      closed: []
    }

    tasksArray.forEach(task => {
      tasks[task.task_state].push({
        id: task.task_id,
        name: task.task_name,
        colour: plans[task.task_plan] || "", // Use color from plan mapping if available
        owner: task.task_owner
      })
    })

    // Respond with the organized tasks
    res.json(tasks)
  } catch (error) {
    console.error("Error retrieving tasks:", error)
    res.status(500).send("Server error, please try again later.")
  }
}

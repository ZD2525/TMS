const db = require("../models/db")
const mapTaskState = require("../utils/mapTaskState")

// Create an Application (Project Lead)
exports.createApplication = async (req, res) => {
  const { App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create } = req.body

  // Log the request body for debugging
  console.log("Received data:", req.body)

  const query = `
    INSERT INTO APPLICATION 
    (App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

  const values = [App_Acronym, App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create]

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

  console.log("Update request received with data:", req.body)

  const query = `
    UPDATE APPLICATION 
    SET App_Description = ?, App_Rnumber = ?, App_startDate = ?, App_endDate = ?, App_permit_Open = ?, App_permit_toDoList = ?, App_permit_Doing = ?, App_permit_Done = ?, App_permit_Create = ? 
    WHERE App_Acronym = ?`
  const values = [App_Description, App_Rnumber, App_startDate, App_endDate, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done, App_permit_Create, App_Acronym]

  console.log("Query to be executed:", query)
  console.log("Values:", values)

  try {
    await db.query(query, values)
    res.status(200).send("Application updated successfully.")
  } catch (error) {
    console.error("Error during application update:", error)
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

  if (!Plan_app_Acronym) {
    return res.status(400).send("Plan_app_Acronym is required.")
  }

  const query = `
    INSERT INTO Plan 
    (Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color) 
    VALUES (?, ?, ?, ?, ?)
  `
  const values = [Plan_MVP_name, Plan_app_Acronym, Plan_startDate, Plan_endDate, Plan_color]

  try {
    await db.query(query, values)
    res.status(201).send("Plan created successfully.")
  } catch (error) {
    console.error("Error creating plan:", error)
    res.status(500).send("Error creating plan.")
  }
}

// Get Plans (All Roles)
exports.getPlans = async (req, res) => {
  const { appAcronym } = req.body // Ensure that the appAcronym is being passed in the request

  if (!appAcronym) {
    return res.status(400).send("App Acronym is required.")
  }

  try {
    const query = `
      SELECT * 
      FROM Plan
      WHERE Plan_app_Acronym = ?
    `
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

const convertToMySQLDate = dateString => {
  // Convert a date string in MM/DD/YYYY format to YYYY-MM-DD
  const [month, day, year] = dateString.split("/")
  return `${year}-${month}-${day}`
}

// Controller for creating a task (PL)
exports.createTask = async (req, res) => {
  const {
    Task_plan,
    Task_name,
    Task_description = "", // Provide default value
    Task_creator,
    Task_owner,
    Task_createDate,
    App_Acronym
  } = req.body

  const Task_app_Acronym = App_Acronym

  // Check for required fields
  if (!Task_app_Acronym || !Task_name || !Task_creator || !Task_owner || !Task_createDate) {
    return res.status(400).send("Required fields are missing.")
  }

  try {
    // Step 1: Query to count existing tasks for the given Task_app_Acronym
    const countQuery = `SELECT COUNT(*) AS taskCount FROM Task WHERE Task_app_Acronym = ?`
    const [rows] = await db.query(countQuery, [Task_app_Acronym])
    const taskCount = rows[0].taskCount || 0

    // Step 2: Increment the count to generate Task_Rnumber
    const Task_Rnumber = taskCount + 1

    // Step 3: Generate Task_id in the required format
    const Task_id = `${Task_app_Acronym}_${Task_Rnumber}`

    // Convert Task_createDate to MySQL format
    const formattedCreateDate = convertToMySQLDate(Task_createDate)

    // Map task state to an integer value (default is 'Open')
    const mappedTaskState = mapTaskState("Open")
    if (mappedTaskState === null) {
      return res.status(400).send("Invalid Task_state provided.")
    }

    // SQL query for inserting the task
    const query = `
      INSERT INTO Task 
      (Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, Task_notes, Task_state, Task_creator, Task_owner, Task_createDate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    const values = [Task_id, Task_plan, Task_app_Acronym, Task_name, Task_description, "", mappedTaskState, Task_creator, Task_owner, formattedCreateDate]

    // Insert task into database
    await db.query(query, values)

    // Log the task creation for confirmation
    console.log(`Task Created: ID=${Task_id}, Name=${Task_name}, State=${mappedTaskState}, Created by=${Task_creator}, Date=${formattedCreateDate}`)

    res.status(201).send("Task created successfully.")
  } catch (error) {
    console.error("Error creating task:", error)
    res.status(500).send("Error creating task.")
  }
}

// Release Task to To-Do (Project Manager)
exports.releaseTask = async (req, res) => {
  const { Task_id, App_Acronym } = req.body // Including App_Acronym
  const newState = mapTaskState("To-Do") // State transition handled here
  const currentState = mapTaskState("Open") // Expected current state

  if (!Task_id || !App_Acronym) {
    console.error("Missing Task_id or App_Acronym in request body")
    return res.status(400).send("Task_id and App_Acronym are required.")
  }

  console.log("Releasing Task:", Task_id)
  console.log("App_Acronym:", App_Acronym)
  console.log("Current State:", currentState, "New State:", newState)

  const query = `UPDATE Task SET Task_state = ? WHERE Task_id = ? AND Task_state = ? AND task_app_acronym = ?`
  try {
    const [result] = await db.query(query, [newState, Task_id, currentState, App_Acronym])
    console.log("SQL Query Executed:", query)
    console.log("Query Parameters:", [newState, Task_id, currentState, App_Acronym])
    console.log("Query Result:", result)

    if (result.affectedRows === 0) {
      console.log("No task was updated. Either task not found, state condition not met, or App_Acronym mismatch.")
      return res.status(404).send("Task not found, already released, or App_Acronym does not match.")
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

exports.getTasks = async (req, res) => {
  const { App_Acronym } = req.body // Using App_Acronym from the request body

  if (!App_Acronym) {
    console.error("No App_Acronym provided")
    return res.status(400).send("App_Acronym is required.")
  }

  console.log("Fetching tasks for App_Acronym:", App_Acronym)

  const tasksQuery = `SELECT * FROM Task WHERE task_app_acronym = ?`
  const plansQuery = `SELECT plan_mvp_name, Plan_color FROM Plan WHERE plan_app_acronym = ?`

  try {
    // Fetch tasks related to the app acronym
    const [tasksArray] = await db.execute(tasksQuery, [App_Acronym])
    if (!Array.isArray(tasksArray)) {
      console.warn("Expected an array from tasks query but received:", tasksArray)
      return res.json([]) // Return an empty array if tasksArray is not valid
    }
    console.log("Fetched tasks from database:", tasksArray)

    // Fetch plans related to the app acronym
    const [planArray] = await db.execute(plansQuery, [App_Acronym])
    console.log("Fetched plans from database:", planArray)

    // Create a mapping of plan names to their colors
    const plans = {}
    planArray.forEach(plan => {
      plans[plan.plan_mvp_name] = plan.Plan_color
    })
    console.log("Plan mapping created:", plans)

    // Organize tasks by state
    const tasks = {
      open: [],
      todo: [],
      doing: [],
      done: [],
      closed: []
    }

    tasksArray.forEach(task => {
      console.log("Task object structure:", task) // Log the full task object
      const stateKey = mapTaskState(task.Task_state) // Convert integer to string key using mapTaskState
      if (!stateKey || !tasks[stateKey]) {
        console.warn(`Unexpected or missing task state for task ${task.Task_id}:`, task.Task_state)
      } else {
        tasks[stateKey].push({
          id: task.Task_id,
          name: task.Task_name,
          description: task.Task_description,
          colour: plans[task.Task_plan] || "", // Keep the color mapping as is
          planName: task.Task_plan || "No Plan", // Add the plan name mapping
          owner: task.Task_owner
        })
        console.log(`Task added to state ${stateKey}:`, {
          id: task.Task_id,
          name: task.Task_name,
          colour: plans[task.Task_plan] || "",
          owner: task.Task_owner
        })
      }
    })

    // Respond with the organized tasks
    console.log("Organized tasks to be sent:", tasks)
    res.json(tasks)
  } catch (error) {
    console.error("Error retrieving tasks:", error)
    res.status(500).send("Server error, please try again later.")
  }
}

exports.viewTask = async (req, res) => {
  const { taskId } = req.body

  if (!taskId) {
    return res.status(400).send("Task ID is required.")
  }

  try {
    const taskQuery = `
      SELECT 
        t.*,
        p.Plan_startDate,
        p.Plan_endDate
      FROM Task t
      LEFT JOIN Plan p ON t.Task_plan = p.Plan_MVP_name
      WHERE t.Task_id = ?
    `
    const [task] = await db.execute(taskQuery, [taskId])

    if (!task.length) {
      return res.status(404).send("Task not found.")
    }

    // Map the Task_state to a readable format
    const taskWithMappedState = {
      ...task[0],
      Task_state: mapTaskState(task[0].Task_state)
    }

    res.json(taskWithMappedState) // Send the modified task object
  } catch (error) {
    console.error("Error fetching task:", error)
    res.status(500).send("Server error, please try again later.")
  }
}

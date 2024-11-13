const jwt = require("jsonwebtoken")
const db = require("../models/db")
const mapTaskState = require("../utils/mapTaskState")
const JWT_SECRET = process.env.JWT_SECRET

const verifyToken = async (req, res, next) => {
  const token = req.cookies.token

  if (!token) {
    return res.status(401).json({ error: "No token provided." })
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET)

    // Set user details from the token
    req.user = decoded

    // Check if the user's account status is active
    const [[user]] = await db.execute("SELECT accountStatus FROM Accounts WHERE username = ?", [decoded.username])
    if (!user) {
      res.clearCookie("token")
      return res.status(401).json({ error: "User not found." })
    }

    if (user.accountStatus !== "Active") {
      res.clearCookie("token")
      return res.status(401).json({ error: "Account is not active.", accountStatus: user.accountStatus })
    }

    next()
  } catch (err) {
    res.clearCookie("token")
    return res.status(401).json({ error: "Token verification failed." })
  }
}

// Check if user belongs to a specific group
const CheckGroup = groupname => async (req, res, next) => {
  const group = groupname || req.body?.group

  if (!group) {
    return res.status(400).json({ error: "Group name is required." })
  }

  try {
    console.log("Checking group for user:", req.user.username, "against group:", group)

    let query
    let values

    if (Array.isArray(group)) {
      // Handle case when `group` is an array by flattening it into a comma-separated string
      query = "SELECT COUNT(*) as count FROM UserGroup WHERE username = ? AND user_group IN (?)"
      values = [req.user.username, group.join(",")]
    } else {
      // Handle case when `group` is a single string
      query = "SELECT COUNT(*) as count FROM UserGroup WHERE username = ? AND user_group = ?"
      values = [req.user.username, group]
    }

    const [rows] = await db.execute(query, values)

    if (rows[0].count > 0) {
      return next() // User has permission, continue
    }

    return res.status(403).json({ error: "User not permitted, check with admin." })
  } catch (error) {
    console.error("Error in CheckGroup middleware:", error)
    return res.status(500).json({ error: "Server error, try again later." })
  }
}

const CheckTaskStatePermission = async (req, res, next) => {
  try {
    const [[taskData]] = await db.execute("SELECT task_state, task_app_acronym FROM task WHERE task_id = ?", [req.body.Task_id])

    if (!taskData || !taskData.task_state || !taskData.task_app_acronym) {
      console.error("Task state or App Acronym not found")
      return res.status(404).send("Task not found")
    }

    const { task_state, task_app_acronym } = taskData
    const [[permissionsData]] = await db.execute("SELECT App_permit_Create, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done FROM application WHERE App_Acronym = ?", [task_app_acronym])

    if (!permissionsData) {
      console.error("No permissions found for the given App_Acronym")
      return res.status(404).send("Application permissions not found")
    }

    const permissionMapping = {
      Open: "App_permit_Open",
      "To-Do": "App_permit_toDoList",
      Doing: "App_permit_Doing",
      Done: "App_permit_Done",
      Closed: "App_permit_Create"
    }

    const requiredPermissionKey = permissionMapping[task_state]
    if (!requiredPermissionKey || !permissionsData[requiredPermissionKey]) {
      console.error("Invalid or missing permission for task state")
      return res.status(403).send("Permission denied for the current task state.")
    }

    const requiredGroup = permissionsData[requiredPermissionKey]
    console.log("Required group for task state:", requiredGroup)

    // Ensure `requiredGroup` is an array
    req.requiredGroup = requiredGroup ? [requiredGroup] : []
    next() // Proceed to the next middleware or route handler
  } catch (error) {
    console.error("Error in CheckTaskStatePermission middleware:", error)
    return res.status(500).send("Server error, try again later.")
  }
}

const appendTaskNotes = async (req, res, next) => {
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
  let notes = ""
  let state = " - "
  let creator = "unknown" // Default value for task_creator
  let owner = "unknown" // Default value for task_owner
  let actionDescription = "Updated" // Default action description

  try {
    // Use consistent naming (assuming Task_id is used consistently)
    const taskId = req.body.Task_id
    if (taskId) {
      // Adjust query to retrieve task_state, task_creator, and task_owner
      const [[task]] = await db.execute("SELECT task_notes, task_state, task_creator, task_owner FROM task WHERE task_id = ?", [taskId])

      // Log retrieved data for debugging
      console.log("Retrieved Task Data:", task)

      if (task) {
        notes = task.task_notes || ""
        state = task.task_state || state // Use retrieved state if available
        creator = task.task_creator || creator
        owner = task.task_owner || owner

        // Determine action description based on state and route
        if (req.route && req.route.path) {
          if (req.route.path.includes("release-task")) {
            actionDescription = "Released"
          } else if (req.route.path.includes("assign-task")) {
            actionDescription = "Assigned"
          } else if (req.route.path.includes("complete-task")) {
            actionDescription = "Completed"
          }
          // Add more conditions based on your routes and transitions if necessary
        }

        // Log individual values
        console.log("Task State:", state)
        console.log("Task Creator:", creator)
        console.log("Task Owner:", owner)
        console.log("Existing Task Notes:", notes)
      }
    } else {
      console.log("No Task_id provided in request body.")
    }

    // Construct the notes entry dynamically
    const constructedNotes = `*************\nTASK ${actionDescription.toUpperCase()} [${creator || owner}, ${state}, ${timestamp} (UTC)]\n\n${req.body.notes || ""}\n\n${notes}`

    // Log the constructed notes before assignment
    console.log("Constructed Notes Before Assignment:", constructedNotes)

    req.body.notes = constructedNotes
  } catch (error) {
    console.error("Error stamping task notes:", error)
    return res.status(500).send("Server error, try again later")
  }

  next() // Proceed to the next middleware or route handler
}

module.exports = { verifyToken, CheckGroup, CheckTaskStatePermission, appendTaskNotes }

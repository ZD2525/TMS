const jwt = require("jsonwebtoken")
const db = require("../models/db")
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

// const CheckTaskStatePermission = async (req, res, next) => {
//   try {
//     const [[taskData]] = await db.execute("SELECT task_state, task_app_acronym FROM task WHERE task_id = ?", [req.body.Task_id])

//     if (!taskData || !taskData.task_state || !taskData.task_app_acronym) {
//       console.error("Task state or App Acronym not found")
//       return res.status(404).send("Task not found")
//     }

//     const { task_state, task_app_acronym } = taskData
//     const [[permissionsData]] = await db.execute("SELECT App_permit_Create, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done FROM application WHERE App_Acronym = ?", [task_app_acronym])

//     if (!permissionsData) {
//       console.error("No permissions found for the given App_Acronym")
//       return res.status(404).send("Application permissions not found")
//     }

//     const permissionMapping = {
//       Open: "App_permit_Open",
//       "To-Do": "App_permit_toDoList",
//       Doing: "App_permit_Doing",
//       Done: "App_permit_Done",
//       Closed: "App_permit_Create"
//     }

//     const requiredPermissionKey = permissionMapping[task_state]
//     if (!requiredPermissionKey || !permissionsData[requiredPermissionKey]) {
//       console.error("Invalid or missing permission for task state")
//       return res.status(403).send("Permission denied for the current task state.")
//     }

//     const requiredGroup = permissionsData[requiredPermissionKey]
//     // Ensure `requiredGroup` is an array
//     req.requiredGroup = requiredGroup ? [requiredGroup] : []
//     next() // Proceed to the next middleware or route handler
//   } catch (error) {
//     console.error("Error in CheckTaskStatePermission middleware:", error)
//     return res.status(500).send("Server error, try again later.")
//   }
// }

const CheckTaskStatePermission = async (req, res, next) => {
  try {
    if (!req.body.Task_id) {
      // If Task_id is not provided, assume this is for checking create permission
      if (!req.body.App_Acronym) {
        console.error("App_Acronym is required for permission check")
        return res.status(400).send("App_Acronym is required")
      }

      // Fetch permissions based on App_Acronym
      const [[appData]] = await db.execute("SELECT App_permit_Create FROM application WHERE App_Acronym = ?", [req.body.App_Acronym])

      if (!appData) {
        console.error("No application data found for the given App_Acronym")
        return res.status(404).send("Application data not found")
      }

      const requiredGroup = appData.App_permit_Create
      req.requiredGroup = requiredGroup ? [requiredGroup] : []
      return next() // Proceed with the next middleware or route handler
    }

    // Existing logic for Task_id-based permission checks
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
  let prevState = " - " // Previous state placeholder
  let newState = req.body.newState || " - " // Ensure this comes from req.body
  let creator = "unknown" // Default value for task_creator
  let owner = "unknown" // Default value for task_owner
  let actionDescription = "Updated" // Default action description

  try {
    // Retrieve existing task data
    const taskId = req.body.Task_id
    if (taskId) {
      const [[task]] = await db.execute("SELECT task_notes, task_state, task_creator, task_owner FROM task WHERE task_id = ?", [taskId])

      if (task) {
        notes = task.task_notes || ""
        prevState = task.task_state || prevState // Use retrieved state as previous state
        creator = task.task_creator || creator
        owner = task.task_owner || owner

        // Determine action description based on route
        if (req.route && req.route.path) {
          if (req.route.path.includes("release-task")) {
            actionDescription = "Released"
            newState = "To-Do" // Set the target state
          } else if (req.route.path.includes("assign-task")) {
            actionDescription = "Assigned"
            newState = "Doing" // Set the target state
          } else if (req.route.path.includes("complete-task")) {
            actionDescription = "Completed"
            newState = "Done" // Set the target state
          }
        }
      }
    } else {
      console.log("No Task_id provided in request body.")
    }

    // Construct the notes entry with state transition information
    const constructedNotes = `*************\nTASK ${actionDescription.toUpperCase()} [${creator || owner}, ${prevState} -> ${newState}, ${timestamp} (UTC)]\n\n${req.body.notes || ""}\n\n${notes}`

    req.body.notes = constructedNotes
  } catch (error) {
    console.error("Error stamping task notes:", error)
    return res.status(500).send("Server error, try again later")
  }

  next() // Proceed to the next middleware or route handler
}

module.exports = { verifyToken, CheckGroup, CheckTaskStatePermission, appendTaskNotes }

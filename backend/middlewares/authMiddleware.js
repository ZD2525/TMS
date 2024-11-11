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
  // Determine the group to check
  const group = groupname || req.body?.group

  if (!group) {
    return res.status(400).json({ error: "Group name is required." })
  }

  try {
    // Query to check if the user belongs to the specified group
    const [rows] = await db.execute("SELECT COUNT(*) as count FROM UserGroup WHERE username = ? AND user_group = ?", [req.user.username, group])

    const count = rows[0].count

    if (count > 0) {
      return next()
    }
    return res.status(403).json({ error: "User not permitted, check with admin." })
  } catch (error) {
    return res.status(500).json({ error: "Server error, try again later." })
  }
}

const CheckTaskStatePermission = async (req, res, next) => {
  try {
    // Fetch the task's current state and associated application acronym
    const [[{ task_state, task_app_acronym }]] = await db.execute("SELECT task_state, task_app_acronym FROM task WHERE task_id = ? AND task_app_acronym = ?", [req.body.Task_id, req.body.App_Acronym])

    console.log("Retrieved values from the database:", { task_state, task_app_acronym })

    if (task_state === undefined || !task_app_acronym) {
      console.error("Task state or App Acronym not found")
      return res.status(404).send("Task not found")
    }

    // Log retrieved values for debugging
    console.log("Retrieved task state:", task_state)
    console.log("Task's App_Acronym:", task_app_acronym)

    // Fetch the permissions for the application with the correct column names
    const [[{ App_permit_Create: create, App_permit_Open: open, App_permit_toDoList: todo, App_permit_Doing: doing, App_permit_Done: done }]] = await db.execute("SELECT App_permit_Create, App_permit_Open, App_permit_toDoList, App_permit_Doing, App_permit_Done FROM application WHERE App_Acronym = ?", [task_app_acronym])

    // Log retrieved permissions for debugging
    console.log("Retrieved permissions:", { create, open, todo, doing, done })

    const permissions = { create, open, todo, doing, done }
    if (!permissions[task_state]) {
      console.error("Invalid or missing permission for task state")
      return res.status(403).send("Permission denied for the current task state.")
    }

    // Check the user's group permission for the task state
    CheckGroup(permissions[task_state])(req, res, next)
  } catch (error) {
    console.error("Error in CheckTaskStatePermission:", error)
    return res.status(500).send("Server error, try again later.")
  }
}

// const CheckCreatePermission = async (req, res, next) => {
//   try {
//     const [[{ create }]] = await db.execute("SELECT app_permit_create AS `create` FROM application WHERE app_acronym = ?", [req.body.app_acronym])
//     CheckGroup(create)(req, res, next)
//   } catch (error) {
//     return res.status(500).send("Server error, try again later")
//   }
// }

const appendTaskNotes = async (req, res, next) => {
  const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ")
  let notes = ""
  let state = " - "

  try {
    if (req.body.taskId) {
      // Consider renaming 'id' to 'taskId' for clarity
      const [[task]] = await db.execute("SELECT task_notes, task_state FROM task WHERE task_id = ?", [req.body.taskId])

      if (task) {
        notes = task.task_notes || ""
        // Optional: Map state if needed
        state = typeof task.task_state === "number" ? mapTaskState(task.task_state) || task.task_state : task.task_state
      }
    }

    // Format the notes to be appended
    req.body.notes = req.body.notes ? `*************\n\n[${req.username}, ${state}, ${timestamp} (UTC)]\n\n${req.body.notes}\n\n${notes}` : notes
  } catch (error) {
    console.error("Error stamping task notes:", error)
    return res.status(500).send("Server error, try again later")
  }

  next() // Proceed to the next middleware or route handler
}

module.exports = { verifyToken, CheckGroup, CheckTaskStatePermission, appendTaskNotes }

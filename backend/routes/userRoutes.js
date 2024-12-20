const express = require("express")
const router = express.Router()
const userController = require("../controllers/userController")
const taskController = require("../controllers/taskController")
const { verifyToken, CheckGroup, CheckTaskStatePermission } = require("../middlewares/authMiddleware")

// Public Routes
router.post("/login", userController.loginUser)

// Authenticated routes
router.post("/logout", verifyToken, userController.logoutUser)
router.post("/checkgroup", verifyToken, CheckGroup(), (req, res) => {
  res.json({ success: true })
})
router.get("/getprofile", verifyToken, userController.getProfile)
router.put("/updateprofile", verifyToken, userController.updateProfile)

// Admin-Protected Routes
router.get("/getallusers", verifyToken, CheckGroup("admin"), userController.getAllUsers)
router.post("/createuser", verifyToken, CheckGroup("admin"), userController.createUser)
router.get("/groups", verifyToken, userController.getGroups)
router.post("/creategroup", verifyToken, CheckGroup("admin"), userController.createGroup)
router.put("/updateuser", verifyToken, CheckGroup("admin"), userController.updateUser)

// Task Management System Routes
// Application routes (Project Lead access required)
router.post("/create-application", verifyToken, CheckGroup("PL"), taskController.createApplication)
router.put("/update-application", verifyToken, CheckGroup("PL"), taskController.updateApplication)
router.get("/applications", verifyToken, taskController.getApplications) // No group restriction for viewing

// Plan routes (Project Manager access required)
router.post("/create-plan", verifyToken, CheckGroup("PM"), taskController.createPlan)
router.post("/plans", verifyToken, taskController.getPlans) // No group restriction for viewing

// Task Routes
router.post("/create-task", verifyToken, taskController.createTask) // Project Lead
router.put("/release-task", verifyToken, CheckTaskStatePermission, taskController.releaseTask) // Project Manager
router.put("/assign-task", verifyToken, CheckTaskStatePermission, taskController.assignTask) // Developer
router.put("/unassign-task", verifyToken, CheckTaskStatePermission, taskController.unassignTask) // Developer
router.put("/review-task", verifyToken, CheckTaskStatePermission, taskController.reviewTask) // Developer
router.put("/approve-task", verifyToken, CheckTaskStatePermission, taskController.approveTask) // Project Lead
router.put("/reject-task", verifyToken, CheckTaskStatePermission, taskController.rejectTask) // Project Lead
router.post("/tasks", verifyToken, taskController.getTasks) // No group restriction for viewing
router.post("/task", verifyToken, taskController.viewTask)
router.put("/save-task-notes", taskController.saveTaskNotes)
router.post("/check-permissions", verifyToken, CheckTaskStatePermission, (req, res) => {
  res.json({ success: true, requiredGroup: Array.isArray(req.requiredGroup) ? req.requiredGroup : [req.requiredGroup] })
})

module.exports = router

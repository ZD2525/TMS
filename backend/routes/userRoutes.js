const express = require("express")
const router = express.Router()
const userController = require("../controllers/userController")
const { verifyToken, CheckGroup } = require("../middlewares/authMiddleware")

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
router.get("/groups", verifyToken, CheckGroup("admin"), userController.getGroups)
router.post("/creategroup", verifyToken, CheckGroup("admin"), userController.createGroup)
router.put("/updateuser", verifyToken, CheckGroup("admin"), userController.updateUser)

module.exports = router

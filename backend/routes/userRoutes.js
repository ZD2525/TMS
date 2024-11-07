const express = require("express")
const router = express.Router()
const userController = require("../controllers/userController")
const { verifyToken, requireAdmin } = require("../middlewares/authMiddleware")

// Public Routes
router.post("/login", userController.loginUser)
router.post("/logout", userController.logoutUser)

// verifyToken used for all routes that follow
router.use(verifyToken)

// Authenticated routes
router.get("/getprofile", userController.getProfile)
router.put("/updateprofile", userController.updateProfile)

// requireAdmin used for all routes that follow
router.use(requireAdmin)

// Admin-Protected Routes
router.get("/getallusers", userController.getAllUsers)
router.post("/createuser", userController.createUser)
router.get("/groups", userController.getGroups)
router.post("/creategroup", userController.createGroup)
router.post("/getuserbyusername", userController.getUserByUsername)
router.put("/updateuser", userController.updateUser)

module.exports = router

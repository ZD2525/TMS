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
router.route("/editprofile").get(userController.getProfile).put(userController.updateProfile)

// requireAdmin used for all routes that follow
router.use(requireAdmin)

// Admin-Protected Routes
router.route("/usermanagement").get(userController.getUserManagement).post(userController.createUser)
router.get("/groups", userController.getGroups)
router.post("/create-group", userController.createGroup)
router.post("/get-user", userController.getUserByUsername)
router.put("/update-user", userController.editUser)
router.delete("/remove-user-group", userController.removeUserGroup)

module.exports = router

const jwt = require("jsonwebtoken")
const db = require("../models/db")
const JWT_SECRET = process.env.JWT_SECRET

const verifyToken = async (req, res, next) => {
  const token = req.cookies.token

  if (!token) {
    console.log("Token not found in request.")
    return res.status(401).json({ error: "No token provided." })
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, JWT_SECRET)
    console.log("Token successfully verified:", decoded)

    // Set user details
    req.user = decoded

    // Check if the user's account status is active
    const [[user]] = await db.execute("SELECT accountStatus FROM Accounts WHERE username = ?", [decoded.username])
    if (!user) {
      console.log("User not found.")
      res.clearCookie("token")
      return res.status(401).json({ error: "User not found." })
    }

    if (user.accountStatus !== "Active") {
      console.log(`User ${decoded.username} has a ${user.accountStatus} account.`)
      res.clearCookie("token")
      return res.status(401).json({ error: "Account is not active.", accountStatus: user.accountStatus })
    }

    // Proceed to the next middleware if the token and account status are valid
    next()
  } catch (err) {
    console.log("Token verification failed:", err)
    res.clearCookie("token")
    return res.status(401).json({ error: "Token verification failed." })
  }
}

// Check if user belongs to a specific group
const CheckGroup =
  (requiredGroup = null) =>
  async (req, res, next) => {
    const group = requiredGroup || req.body?.group || req.query?.group || null // Use requiredGroup if provided, else check body and query params

    if (!group) {
      console.log("Group name is required but not provided. Request details:", req.body)
      return res.status(400).json({ error: "Group name is required." })
    }

    try {
      if (!req.user || !req.user.username) {
        console.log("User is not authenticated or username is missing.")
        return res.status(401).json({ error: "Unauthorized access." })
      }

      console.log(`Verifying if user ${req.user.username} belongs to group ${group}`)
      const [[{ count }]] = await db.execute("SELECT COUNT(*) as count FROM UserGroup WHERE username = ? AND user_group = ?", [req.user.username, group])

      if (count > 0) {
        console.log(`User ${req.user.username} belongs to group ${group}`)
        next() // User is in the required group, proceed to next middleware/controller
      } else {
        console.log(`User ${req.user.username} does not belong to group ${group}`)
        return res.status(403).json({ error: "User not permitted, check with admin." })
      }
    } catch (error) {
      console.error("Error checking group membership:", error)
      return res.status(500).json({ error: "Server error, try again later." })
    }
  }

module.exports = { verifyToken, CheckGroup }

const jwt = require("jsonwebtoken")
const db = require("../models/db")
const JWT_SECRET = process.env.JWT_SECRET

const verifyToken = async (req, res, next) => {
  const token = req.cookies.token

  if (!token) {
    return res.status(401).json({ error: "No token provided." })
  }

  try {
    // Verify the token, including IP address and browser validation if included in payload
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

    // Proceed to the next middleware if the token and account status are valid
    next()
  } catch (err) {
    res.clearCookie("token")
    return res.status(401).json({ error: "Token verification failed." })
  }
}

// Check if user belongs to a specific group
const CheckGroup =
  (requiredGroup = null) =>
  async (req, res, next) => {
    // Determine the group to check
    const group = requiredGroup || req.body?.group || req.query?.group || null

    // If no group is provided, respond with an error
    if (!group) {
      return res.status(400).json({ error: "Group name is required." })
    }

    // Check if the user is authenticated (req.user should already be set by previous middleware like verifyToken)
    if (!req.user || !req.user.username) {
      return res.status(401).json({ error: "Unauthorized access." })
    }

    try {
      // Query to check if the user belongs to the specified group
      const [[{ count }]] = await db.execute("SELECT COUNT(*) as count FROM UserGroup WHERE username = ? AND user_group = ?", [req.user.username, group])

      if (count > 0) {
        return next() // User is in the required group, proceed to next middleware/controller
      }
      return res.status(403).json({ error: "User not permitted, check with admin." })
    } catch (error) {
      return res.status(500).json({ error: "Server error, try again later." })
    }
  }

module.exports = { verifyToken, CheckGroup }

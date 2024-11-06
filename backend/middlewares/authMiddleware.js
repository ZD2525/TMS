const jwt = require("jsonwebtoken")
const db = require("../models/db")
const JWT_SECRET = process.env.JWT_SECRET

// Verify Token to check for user log in
const verifyToken = (req, res, next) => {
  const token = req.cookies.token

  if (!token) {
    console.log("Access denied: No token provided.")
    return res.status(401).json({ redirect: "/login" })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    const requestIpAddress = req.ip
    const requestBrowserType = req.headers["user-agent"]

    if (decoded.ipAddress !== requestIpAddress || decoded.browserType !== requestBrowserType) {
      console.log("Access denied: IP address or browser type mismatch.")
      return res.status(401).json({ redirect: "/login" })
    }

    req.user = decoded
    next()
  } catch (err) {
    console.error("Token verification failed:", err)
    return res.status(401).json({ redirect: "/login" })
  }
}

// Check if user belongs to a specific group
const checkGroup = async (username, groupname) => {
  try {
    const query = "SELECT * FROM UserGroup WHERE username = ? AND user_group = ?"
    const [results] = await db.query(query, [username, groupname])
    return results.length > 0
  } catch (error) {
    console.error("Error checking group:", error)
    throw new Error("An error occurred while checking the user's group")
  }
}

// Check if user is in "admin" group
const requireAdmin = async (req, res, next) => {
  try {
    const username = req.user.username

    const isAdmin = await checkGroup(username, "admin")

    if (!isAdmin) {
      console.log("Access forbidden: User is not an admin.")
      return res.status(403).json({ error: "Access forbidden. Admins only." })
    }

    next()
  } catch (error) {
    console.error("Error checking admin status:", error)
    res.status(500).json({ error: "Failed to verify admin status" })
  }
}

module.exports = { verifyToken, checkGroup, requireAdmin }

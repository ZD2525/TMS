const db = require("../models/db")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { body, validationResult } = require("express-validator")
const JWT_SECRET = process.env.JWT_SECRET

// Login function to authenticate a user and issue a JWT token
exports.loginUser = async (req, res) => {
  const { username, password } = req.body

  // Validate required fields
  if (!username || !password) {
    return res.status(400).json({
      error: "Invalid Credentials.",
      details: [{ msg: "Username is required" }, { msg: "Password is required" }]
    })
  }

  try {
    // Query to retrieve user details
    const userQuery = "SELECT * FROM Accounts WHERE username = ?"
    const [userResults] = await db.query(userQuery, [username])

    // Check if user exists
    if (userResults.length === 0) {
      return res.status(401).json({
        error: "Invalid Credentials.",
        details: [{ msg: "Username or password is incorrect" }]
      })
    }

    const user = userResults[0]

    // Check if the user's account status is active
    if (user.accountStatus !== "Active") {
      return res.status(401).json({
        error: "Invalid Credentials.",
        details: [{ msg: `Your account status is ${user.accountStatus}` }]
      })
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid Credentials.",
        details: [{ msg: "Username or password is incorrect" }]
      })
    }

    // Retrieve IP and browser information for the token
    const ipAddress = req.ip
    const browserType = req.headers["user-agent"]

    // Sign JWT token with user details
    const token = jwt.sign(
      {
        username: user.username,
        ipAddress,
        browserType
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    )

    // Send JWT in a secure HTTP-only cookie
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 1000 // 1 hour expiration
      })
      .json({
        username: user.username,
        message: "Login Successful"
      })
  } catch (error) {
    console.error("Login Error:", error)
    res.status(500).json({ error: "An error occurred during login" })
  }
}

// Logout function to clear the JWT cookie
exports.logoutUser = (_req, res) => {
  res.clearCookie("token").json({ message: "Logout successful" })
}

// Get all users for user management
exports.getAllUsers = async (_req, res) => {
  try {
    console.log("Fetching all users from the Accounts table...")
    const userQuery = "SELECT username, email, accountStatus FROM Accounts"
    const [userResults] = await db.execute(userQuery)

    console.log("User query results:", userResults)

    const groupQuery = "SELECT username, user_group FROM UserGroup"
    const [groupResults] = await db.execute(groupQuery)

    console.log("User group query results:", groupResults)

    const groupMap = {}
    groupResults.forEach(({ username, user_group }) => {
      if (!groupMap[username]) {
        groupMap[username] = []
      }
      groupMap[username].push(user_group)
    })

    const userData = userResults.map(user => ({
      ...user,
      password: "********", // Masked password
      groups: groupMap[user.username] || [] // Assign groups or empty array if none exist
    }))

    console.log("Final assembled user data:", userData)
    res.json(userData)
  } catch (error) {
    console.error("Error retrieving user data:", error)
    res.status(500).json({ error: "An error occurred while retrieving user data." })
  }
}

// Validation rules for creating a new user
const createUserValidationRules = [
  // Username validation
  body("username")
    .notEmpty()
    .withMessage("Username is mandatory.")
    .isAlphanumeric()
    .withMessage("Username must be alphanumeric with no spaces.")
    .isLength({ max: 50 })
    .withMessage("Username must have a maximum of 50 characters.")
    .custom(async username => {
      const [existingUser] = await db.query("SELECT * FROM Accounts WHERE username = ?", [username])
      if (existingUser.length > 0) {
        throw new Error("Username needs to be unique.")
      }
      return true
    }),

  // Password validation
  body("password")
    .notEmpty()
    .withMessage("Password is mandatory.")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,10}$/)
    .withMessage("Password must be 8-10 characters long and include at least one letter, one number, and one special character."),

  // Email validation
  body("email").optional({ checkFalsy: true }).isEmail().withMessage("Email format must match the pattern {username}@{domain}").isLength({ max: 100 }).withMessage("Email must have a maximum of 100 characters."),

  // Group validation
  body("group")
    .optional({ checkFalsy: true })
    .custom(value => {
      if (Array.isArray(value) && !value.every(group => typeof group === "string")) {
        throw new Error("Each group must be a string.")
      } else if (typeof value !== "string" && !Array.isArray(value)) {
        throw new Error("Group must be a string or an array of strings.")
      }
      return true
    }),

  // Account status validation
  body("accountStatus").optional().isIn(["Active", "Disabled"]).withMessage("Account status must be either 'Active' or 'Disabled'.")
]

// Create a new user with validation
exports.createUser = [
  createUserValidationRules,
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Validation failed",
        details: errors.array().map(error => ({ msg: error.msg }))
      })
    }

    const { username, password, email, group, accountStatus } = req.body

    try {
      const hashedPassword = await bcrypt.hash(password, 10) // Hashes password
      const createUserQuery = "INSERT INTO Accounts (username, password, email, accountStatus) VALUES (?, ?, ?, ?)"
      await db.query(createUserQuery, [username, hashedPassword, email || null, accountStatus || "Active"])

      if (group) {
        const groupsToAssign = Array.isArray(group) ? group : [group]
        const insertGroupQuery = "INSERT INTO UserGroup (username, user_group) VALUES (?, ?)"
        for (const groupName of groupsToAssign) {
          await db.query(insertGroupQuery, [username, groupName])
        }
      }

      res.status(201).json({ message: "User created successfully" })
    } catch (error) {
      console.error("Error creating user:", error)
      res.status(500).json({ error: "An error occurred while creating the user" })
    }
  }
]

// Create a new group with validation
exports.createGroup = [
  // Group name validation
  body("group")
    .trim()
    .notEmpty()
    .withMessage("Group name is mandatory.")
    .isLength({ max: 50 })
    .withMessage("Group name must be alphanumeric (allow underscore) and have a maximum of 50 characters.")
    .matches(/^[A-Za-z0-9_]+$/)
    .withMessage("Group name must be alphanumeric (allow underscore)"),

  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: "Group name is mandatory.",
        details: errors.array().map(error => ({ msg: error.msg }))
      })
    }

    const { group } = req.body

    try {
      const groupExistsQuery = "SELECT * FROM UserGroup WHERE user_group = ?"
      const [existingGroup] = await db.query(groupExistsQuery, [group])

      if (existingGroup.length > 0) {
        return res.status(400).json({
          error: "Validation failed",
          details: [{ msg: "Group name already exists." }]
        })
      }

      const createGroupQuery = "INSERT INTO UserGroup (user_group) VALUES (?)"
      await db.query(createGroupQuery, [group])

      res.status(201).json({ message: "Group created successfully." })
    } catch (error) {
      console.error("Error creating group:", error)
      res.status(500).json({ error: "An error occurred while creating the group" })
    }
  }
]

// Retrieve all available groups
exports.getGroups = async (_req, res) => {
  try {
    const query = "SELECT DISTINCT user_group FROM UserGroup"
    const [results] = await db.query(query)
    const groups = results.map(row => row.user_group)
    res.json(groups)
  } catch (error) {
    console.error("Error fetching groups:", error)
    res.status(500).json({ error: "An error occurred while fetching groups" })
  }
}

exports.updateUser = async (req, res) => {
  const { username, email, accountStatus, groups, password } = req.body

  const validationErrors = []

  // Validate email format
  if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    validationErrors.push({ msg: "Email format entered must match the pattern {username}@{domain}" })
  }

  // Validate password complexity
  if (password && !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,10}$/.test(password)) {
    validationErrors.push({
      msg: "Password must contain letters, numbers, and special characters, between 8-10 characters."
    })
  }

  // If there are validation errors, return them in the response
  if (validationErrors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: validationErrors })
  }

  try {
    const userExistsQuery = "SELECT * FROM Accounts WHERE username = ?"
    const [existingUser] = await db.query(userExistsQuery, [username])

    if (existingUser.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    if (username === "admin" && (!groups || !groups.includes("admin") || accountStatus === "Disabled")) {
      return res.status(403).json({
        error: "The admin must remain in the admin group and cannot be disabled."
      })
    }

    // Build the update query dynamically
    let updateQuery = "UPDATE Accounts SET "
    const values = []

    if (email) {
      updateQuery += "email = ?, "
      values.push(email)
    }

    if (accountStatus) {
      updateQuery += "accountStatus = ?, "
      values.push(accountStatus)
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updateQuery += "password = ?, "
      values.push(hashedPassword)
    }

    // Execute update if there are fields to update
    if (values.length > 0) {
      updateQuery = updateQuery.slice(0, -2) + " WHERE username = ?"
      values.push(username)
      await db.query(updateQuery, values)
    }

    // Handle group updates if groups are provided
    if (groups) {
      const deleteGroupsQuery = "DELETE FROM UserGroup WHERE username = ?"
      await db.query(deleteGroupsQuery, [username])

      const insertGroupQuery = "INSERT INTO UserGroup (username, user_group) VALUES (?, ?)"
      for (const groupName of groups) {
        await db.query(insertGroupQuery, [username, groupName])
      }
    }

    res.json({ message: "User updated successfully" })
  } catch (error) {
    console.error("Error updating user:", error)
    res.status(500).json({ error: "An error occurred while updating the user" })
  }
}

// Get the authenticated user's profile
exports.getProfile = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized access" })
  }

  const username = req.user.username

  try {
    const query = "SELECT username, email, accountStatus FROM Accounts WHERE username = ?"
    const [userResults] = await db.query(query, [username])

    if (userResults.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({
      username: userResults[0].username,
      email: userResults[0].email,
      accountStatus: userResults[0].accountStatus
    })
  } catch (error) {
    console.error("Error fetching profile:", error)
    res.status(500).json({ error: "An error occurred while retrieving the profile" })
  }
}

// Update authenticated user's profile information
exports.updateProfile = async (req, res) => {
  const username = req.user.username
  const { email, newPassword } = req.body

  const errors = []

  if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    errors.push({ msg: "Email format entered must match the pattern {username}@{domain}" })
  }

  if (newPassword && !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,10}$/.test(newPassword)) {
    errors.push({
      msg: "Password can only consist of alphabets, numbers and special characters, minimum 8-10 characters"
    })
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: "Validation failed", details: errors })
  }

  try {
    let query = "UPDATE Accounts SET "
    const values = []

    if (email) {
      query += "email = ?, "
      values.push(email)
    }

    if (newPassword) {
      const hashedNewPassword = await bcrypt.hash(newPassword, 10)
      query += "password = ?, "
      values.push(hashedNewPassword)
    }

    if (values.length === 0) {
      return res.status(400).json({ error: "Please enter either an email or password." })
    }

    query = query.slice(0, -2) + " WHERE username = ?"
    values.push(username)

    const [result] = await db.query(query, values)

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error updating profile:", error)
    res.status(500).json({ error: "An error occurred while updating the profile" })
  }
}

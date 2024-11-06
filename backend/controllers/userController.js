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
      details: [
        { msg: "Username is required", param: "username" },
        { msg: "Password is required", param: "password" }
      ]
    })
  }

  try {
    // Query to retrieve user details and groups
    const query = `
      SELECT 
        Accounts.*, 
        GROUP_CONCAT(UserGroup.user_group) AS user_groups 
      FROM 
        Accounts 
      LEFT JOIN 
        UserGroup 
        ON Accounts.username = UserGroup.username 
      WHERE 
        Accounts.username = ? 
      GROUP BY 
        Accounts.username
    `
    const [results] = await db.query(query, [username])

    // Check if user exists
    if (results.length === 0) {
      return res.status(401).json({
        error: "Invalid Credentials.",
        details: [{ msg: "Username or password is incorrect", param: "username" }]
      })
    }

    const user = results[0]

    // Verify account status
    if (user.accountStatus !== "Active") {
      return res.status(403).json({
        error: "Invalid Credentials.",
        details: [{ msg: "Your account is currently disabled", param: "accountStatus" }]
      })
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid Credentials.",
        details: [{ msg: "Username or password is incorrect", param: "password" }]
      })
    }

    // Retrieve IP and browser information for the token
    const ipAddress = req.ip
    const browserType = req.headers["user-agent"]

    // Sign JWT token with user details
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
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
        message: "Login Success",
        user: { username: user.username, email: user.email }
      })
  } catch (error) {
    console.error("Login Error:", error)
    res.status(500).json({ error: "An error occurred during login" })
  }
}

// Logout function to clear the JWT cookie
exports.logoutUser = (req, res) => {
  res.clearCookie("token").json({ message: "Logout successful" })
}

// Get all users for user management
exports.getUserManagement = [
  async (_req, res) => {
    try {
      // Query to fetch all users and their groups
      const query = `
        SELECT 
          Accounts.username, 
          Accounts.email, 
          Accounts.accountStatus, 
          GROUP_CONCAT(UserGroup.user_group) AS user_groups 
        FROM 
          Accounts 
        LEFT JOIN 
          UserGroup 
        ON 
          Accounts.username = UserGroup.username
        GROUP BY 
          Accounts.username
      `
      const [results] = await db.query(query)

      // Format user data for response
      const userData = results.map(user => ({
        username: user.username,
        email: user.email,
        accountStatus: user.accountStatus,
        password: "********", // Masked password
        groups: user.user_groups ? user.user_groups.split(",") : [],
        canEdit: user.username !== "admin" // Hardcoded admin cannot be edited
      }))

      res.json(userData)
    } catch (error) {
      console.error("Error retrieving user data:", error)
      res.status(500).json({ error: "An error occurred while retrieving user data" })
    }
  }
]

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
    .matches(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,10}$/)
    .withMessage("Password must be 8-10 characters long and include letters, numbers, and special characters."),

  // Email validation
  body("email").optional({ checkFalsy: true }).isEmail().withMessage("Email format must match the pattern username@domain.com.").isLength({ max: 100 }).withMessage("Email must have a maximum of 100 characters."),

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
        details: errors.array().map(error => ({ msg: error.msg, param: error.param }))
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
        details: errors.array().map(error => ({ msg: error.msg, param: error.param }))
      })
    }

    const { group } = req.body

    try {
      const groupExistsQuery = "SELECT * FROM UserGroup WHERE user_group = ?"
      const [existingGroup] = await db.query(groupExistsQuery, [group])

      if (existingGroup.length > 0) {
        return res.status(400).json({
          error: "Validation failed",
          details: [{ msg: "Group name already exists.", param: "group" }]
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

// Remove a group from a user, with checks to prevent removing the hardcoded admin from admin group
exports.removeUserGroup = async (req, res) => {
  const { username, group } = req.body

  if (username === "admin" && group === "admin") {
    return res.status(403).json({ error: "The hardcoded admin cannot be removed from the admin group." })
  }

  try {
    const userExistsQuery = "SELECT * FROM Accounts WHERE username = ?"
    const [userExists] = await db.query(userExistsQuery, [username])

    if (!userExists.length) {
      return res.status(404).json({ error: "User not found" })
    }

    const groupExistsQuery = "SELECT * FROM UserGroup WHERE user_group = ? AND username = ?"
    const [groupExists] = await db.query(groupExistsQuery, [group, username])

    if (!groupExists.length) {
      return res.status(404).json({ error: "Group not found for this user" })
    }

    const deleteGroupQuery = "DELETE FROM UserGroup WHERE username = ? AND user_group = ?"
    await db.query(deleteGroupQuery, [username, group])

    res.status(200).json({ message: `Removed ${group} group from user ${username}` })
  } catch (error) {
    console.error("Error removing user group:", error)
    res.status(500).json({ error: "An error occurred while removing the user from the group" })
  }
}

// Retrieve a specific user's details by username
exports.getUserByUsername = async (req, res) => {
  const { username } = req.body

  try {
    const query = `
      SELECT 
        Accounts.username, 
        Accounts.email, 
        Accounts.accountStatus, 
        GROUP_CONCAT(UserGroup.user_group) AS user_groups 
      FROM 
        Accounts 
      LEFT JOIN 
        UserGroup 
      ON 
        Accounts.username = UserGroup.username 
      WHERE 
        Accounts.username = ? 
      GROUP BY 
        Accounts.username
    `
    const [results] = await db.query(query, [username])

    if (results.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const user = results[0]
    res.json({
      username: user.username,
      email: user.email,
      accountStatus: user.accountStatus,
      groups: user.user_groups ? user.user_groups.split(",") : []
    })
  } catch (error) {
    console.error("Error fetching user by username:", error)
    res.status(500).json({ error: "An error occurred while fetching the user details" })
  }
}

// Retrieve all available groups
exports.getGroups = async (req, res) => {
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

// Admin-only edit user functionality
exports.editUser = async (req, res) => {
  const { username, email, accountStatus, groups, password } = req.body

  const validationErrors = []

  // Validate account status
  if (accountStatus && !["Active", "Disabled"].includes(accountStatus)) {
    validationErrors.push({ msg: "Invalid account status.", param: "accountStatus" })
  }

  // Validate email format
  if (email && !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    validationErrors.push({ msg: "Email format entered must match the pattern username@domain.com", param: "email" })
  }

  // Validate password complexity
  if (password && !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,10}$/.test(password)) {
    validationErrors.push({
      msg: "Password must contain letters, numbers, and special characters, between 8-10 characters.",
      param: "password"
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
        error: "The hardcoded admin must remain in the admin group and cannot be disabled."
      })
    }

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

    if (values.length > 0) {
      updateQuery = updateQuery.slice(0, -2) + " WHERE username = ?"
      values.push(username)
      await db.query(updateQuery, values)
    }

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

    const groupQuery = "SELECT * FROM UserGroup WHERE username = ? AND user_group = 'admin'"
    const [groupResults] = await db.query(groupQuery, [username])
    const isAdmin = groupResults.length > 0

    res.json({
      username: userResults[0].username,
      email: userResults[0].email,
      accountStatus: userResults[0].accountStatus,
      isAdmin
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
    errors.push({ msg: "Email format entered must match the pattern username@domain.com", param: "email" })
  }

  if (newPassword && !/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,10}$/.test(newPassword)) {
    errors.push({
      msg: "Password can only consist of alphabets, numbers and special characters, minimum 8-10 characters",
      param: "newPassword"
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

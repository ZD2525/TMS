const mysql = require("mysql2")
require("dotenv").config()

// Create MySQL DB Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
})

// Use the promise wrapper for connection
const db = pool.promise()

// Testing db connection on start
db.getConnection()
  .then(() => {
    console.log("Connected to the MySQL database")
  })
  .catch(err => {
    console.error("Error connecting to the database", err.message)
  })

module.exports = db

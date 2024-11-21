require("dotenv").config()
const express = require("express")
const userRoutes = require("./routes/userRoutes")
const cors = require("cors")
const cookieParser = require("cookie-parser")

const app = express()
const PORT = process.env.PORT || 3000

app.use(cookieParser())
app.use(
  cors({
    // Allow request from frontend origin
    origin: "http://localhost:5000",

    // Allow cookies to be sent with requests
    credentials: true
  })
)

app.use(express.json())
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString() // Capture raw body for debugging
    }
  })
)

// Handle invalid routes
app.use((req, res, next) => {
  res.status(400).json({
    MsgCode: "U_001",
    remarks: "Invalid URL. URL does not match the expected format."
  })
})

// Enhanced error handling for invalid JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    console.error("Invalid JSON received:", req.rawBody) // Log the raw body for debugging
    return res.status(400).json({
      MsgCode: "P_002",
      remarks: "Invalid JSON format in request body."
    })
  }
  next()
})

app.use(userRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

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
    // Allow requests from frontend origin
    origin: "http://localhost:5000",
    credentials: true // Allow cookies to be sent with requests
  })
)

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString() // Capture raw body for debugging
    }
  })
)

// Apply routes
app.use(userRoutes)

// Enhanced error handling for invalid JSON
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.json({
      MsgCode: "P_003"
    })
  }
  next()
})

// Handle invalid routes
app.use((req, res) => {
  res.json({
    MsgCode: "U_001"
  })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

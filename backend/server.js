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

app.use("/", userRoutes)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

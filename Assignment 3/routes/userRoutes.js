const express = require("express")
const router = express.Router()
const apis = require("../api.js")

// Assignment 3
router.post("/CreateTask", apis.CreateTaskController)
router.post("/GetTaskbyState", apis.GetTaskbyStateController)
router.put("/PromoteTask2Done", apis.PromoteTask2DoneController)

module.exports = router

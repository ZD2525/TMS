const express = require("express")
const router = express.Router()
const apis = require("../api.js")

// Assignment 3
router.post("/CreateTask", apis.CreateTaskController)
router.post("/GetTaskByState", apis.GetTaskByStateController)
router.patch("/PromoteTask2Done", apis.PromoteTask2DoneController)

module.exports = router

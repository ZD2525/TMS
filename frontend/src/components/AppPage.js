import React, { useState, useEffect } from "react"
import axios from "axios"
import "../assets/styles/AppPage.css"
import { useLocation } from "react-router-dom"

const AppPage = ({ currentUser }) => {
  const [tasks, setTasks] = useState([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [plans, setPlans] = useState([]) // Add state for plans
  const [planData, setPlanData] = useState({
    Plan_MVP_name: "",
    Plan_startDate: "",
    Plan_endDate: "",
    Plan_color: "#ffffff"
  })
  const [taskData, setTaskData] = useState({
    Task_creator: currentUser.username,
    Task_createDate: new Date().toLocaleDateString(),
    Task_status: "OPEN", // Display value for UI; actual state will be 0 (OPEN) in the backend
    Task_name: "",
    Task_owner: currentUser.username,
    Task_description: "",
    Task_plan: "",
    Task_planStartDate: "",
    Task_planEndDate: ""
  })
  const [error, setError] = useState("")
  const [logs, setLogs] = useState([])

  const location = useLocation()
  const { appAcronym } = location.state || {}

  useEffect(() => {
    const fetchTasks = async () => {
      if (!appAcronym) {
        setError("No application selected.")
        return
      }
      try {
        const response = await axios.post("http://localhost:3000/tasks", { App_Acronym: appAcronym })
        setTasks(response.data)
      } catch (error) {
        console.error("Error fetching tasks:", error)
      }
    }

    const fetchPlans = async () => {
      try {
        const response = await axios.get("http://localhost:3000/plans")
        setPlans(response.data)
      } catch (error) {
        console.error("Error fetching plans:", error)
      }
    }

    fetchTasks()
    fetchPlans()
  }, [appAcronym])

  const handleOpenPlanModal = () => {
    setShowPlanModal(true)
  }

  const handleOpenTaskModal = () => {
    setShowTaskModal(true)
  }

  const handleClosePlanModal = () => {
    setShowPlanModal(false)
    setPlanData({
      Plan_MVP_name: "",
      Plan_startDate: "",
      Plan_endDate: "",
      Plan_color: "#ffffff"
    })
    setError("")
  }

  const handleCloseTaskModal = () => {
    setShowTaskModal(false)
    setTaskData({
      Task_creator: currentUser.username,
      Task_createDate: new Date().toLocaleDateString(),
      Task_status: "OPEN",
      Task_name: "",
      Task_owner: currentUser.username,
      Task_description: "",
      Task_plan: "",
      Task_planStartDate: "",
      Task_planEndDate: ""
    })
    setLogs([])
    setError("")
  }

  const handleChange = e => {
    const { name, value } = e.target
    setPlanData(prevData => ({ ...prevData, [name]: value }))
  }

  const handleTaskChange = e => {
    const { name, value } = e.target
    setTaskData(prevData => ({ ...prevData, [name]: value }))
  }

  const handlePlanSelection = e => {
    const selectedPlan = plans.find(plan => plan.Plan_MVP_name === e.target.value)
    setTaskData(prevData => ({
      ...prevData,
      Task_plan: selectedPlan ? selectedPlan.Plan_MVP_name : "", // Set to empty if no plan selected
      Task_planStartDate: selectedPlan?.Plan_startDate ? new Date(selectedPlan.Plan_startDate).toISOString().split("T")[0] : "",
      Task_planEndDate: selectedPlan?.Plan_endDate ? new Date(selectedPlan.Plan_endDate).toISOString().split("T")[0] : ""
    }))
  }

  const handleCreatePlan = async () => {
    try {
      await axios.post("http://localhost:3000/create-plan", { ...planData, Plan_app_Acronym: appAcronym })
      handleClosePlanModal()
    } catch (err) {
      setError(err.response?.data?.error || "An unexpected error occurred.")
    }
  }

  const handleCreateTask = async () => {
    if (!taskData.Task_name) {
      setError("Task name is required.")
      return
    }

    const payload = { ...taskData, App_Acronym: appAcronym }

    // Remove Task_plan-related fields if Task_plan is empty
    if (!taskData.Task_plan) {
      delete payload.Task_plan
      delete payload.Task_planStartDate
      delete payload.Task_planEndDate
    }

    try {
      const response = await axios.post("http://localhost:3000/create-task", payload)
      if (response.data && response.data.log) {
        setLogs(prevLogs => [response.data.log, ...prevLogs])
      }
      handleCloseTaskModal()
    } catch (err) {
      setError(err.response?.data?.error || "An unexpected error occurred.")
    }
  }

  return (
    <div className="app-page">
      <h1>Task Board for {appAcronym || "Application"}</h1>
      <button onClick={handleOpenPlanModal} className="create-plan-button">
        Create Plan
      </button>
      <button onClick={handleOpenTaskModal} className="create-task-button">
        Create Task
      </button>
      <div className="task-columns">
        {["open", "todo", "doing", "done", "closed"].map(state => (
          <div key={state} className="task-column">
            <h2>{state.toUpperCase()}</h2>
            {(Array.isArray(tasks[state]) ? tasks[state] : []).map(task => (
              <div key={task.id} className="task-card">
                <h3>{task.name}</h3>
                <p>{task.description}</p>
              </div>
            ))}
          </div>
        ))}
      </div>

      {showPlanModal && (
        <div className="modal-overlay" onClick={handleClosePlanModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create Plan</h2>
            {error && <div className="error-box">{error}</div>}
            <div className="form-group">
              <label>
                Plan Name:
                <input type="text" name="Plan_MVP_name" value={planData.Plan_MVP_name} onChange={handleChange} />
              </label>
              <label>
                Start Date:
                <input type="date" name="Plan_startDate" value={planData.Plan_startDate} onChange={handleChange} />
              </label>
              <label>
                End Date:
                <input type="date" name="Plan_endDate" value={planData.Plan_endDate} onChange={handleChange} />
              </label>
              <label>
                Color:
                <input type="color" name="Plan_color" value={planData.Plan_color} onChange={handleChange} />
              </label>
            </div>
            <button onClick={handleCreatePlan}>Create</button>
            <button onClick={handleClosePlanModal}>Cancel</button>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay" onClick={handleCloseTaskModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: "80%", maxWidth: "800px" }}>
            <div className="task-modal-container">
              <div className="task-creation-section">
                <h2>Create Task</h2>
                {error && <div className="error-box">{error}</div>}
                <div className="form-group">
                  <label>Creator:</label>
                  <input type="text" value={taskData.Task_creator} readOnly />

                  <label>Creation Date:</label>
                  <input type="text" value={taskData.Task_createDate} readOnly />

                  <label>Status:</label>
                  <input type="text" value={taskData.Task_status} readOnly />

                  <label>Task Name:</label>
                  <input type="text" name="Task_name" value={taskData.Task_name} onChange={handleTaskChange} />

                  <label>Task Owner:</label>
                  <input type="text" value={taskData.Task_owner} readOnly />

                  <label>Description:</label>
                  <textarea name="Task_description" value={taskData.Task_description} onChange={handleTaskChange} />

                  <label>Plan Name:</label>
                  <select name="Task_plan" value={taskData.Task_plan} onChange={handlePlanSelection}>
                    <option value="">Select Plan</option>
                    {plans.map(plan => (
                      <option key={plan.Plan_MVP_name} value={plan.Plan_MVP_name}>
                        {plan.Plan_MVP_name}
                      </option>
                    ))}
                  </select>

                  <label>Plan Start Date:</label>
                  <input type="text" value={taskData.Task_planStartDate} readOnly />

                  <label>Plan End Date:</label>
                  <input type="text" value={taskData.Task_planEndDate} readOnly />
                </div>
                <button onClick={handleCreateTask}>Create</button>
                <button onClick={handleCloseTaskModal}>Cancel</button>
              </div>

              <div className="task-logs-section">
                <h3>Logs</h3>
                <div>{logs.length > 0 ? logs.map((log, index) => <p key={index}>{log}</p>) : <p>No logs available.</p>}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppPage

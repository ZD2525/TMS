import React, { useState, useEffect } from "react"
import axios from "axios"
import "../assets/styles/AppPage.css"
import { useLocation } from "react-router-dom"

const AppPage = ({ currentUser }) => {
  const [tasks, setTasks] = useState([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showTaskViewModal, setShowTaskViewModal] = useState(false)
  const [plans, setPlans] = useState([])
  const [planData, setPlanData] = useState({
    Plan_MVP_name: "",
    Plan_startDate: "",
    Plan_endDate: "",
    Plan_color: "#ffffff"
  })
  const [taskData, setTaskData] = useState({
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
  const [selectedTask, setSelectedTask] = useState(null)
  const [error, setError] = useState("")
  const [logs, setLogs] = useState([])

  const location = useLocation()
  const { appAcronym } = location.state || {}

  // Fetch tasks function
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
    if (!appAcronym) {
      setError("No application selected.")
      return
    }

    try {
      const response = await axios.post("http://localhost:3000/plans", { appAcronym })
      setPlans(response.data)
    } catch (error) {
      console.error("Error fetching plans:", error)
    }
  }

  useEffect(() => {
    fetchTasks() // Call fetchTasks on component mount
    fetchPlans()
  }, [appAcronym])

  const handleOpenPlanModal = () => {
    setShowPlanModal(true)
  }

  const handleOpenTaskModal = () => {
    setShowTaskModal(true)
  }

  const handleOpenTaskViewModal = async task => {
    try {
      const response = await axios.post("http://localhost:3000/task", { taskId: task.id })
      setSelectedTask(response.data)
      setShowTaskViewModal(true)
    } catch (error) {
      console.error("Error fetching task details:", error)
      setError("Unable to fetch task details.")
    }
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

  const handleCloseTaskViewModal = () => {
    setShowTaskViewModal(false)
    setSelectedTask(null)
  }

  const handleChange = e => {
    const { name, value } = e.target
    setPlanData(prevData => ({ ...prevData, [name]: value }))

    // Dynamically update the background color for the color input
    if (name === "Plan_color") {
      e.target.style.backgroundColor = value
    }
  }

  const handleTaskChange = e => {
    const { name, value } = e.target
    setTaskData(prevData => ({ ...prevData, [name]: value }))
  }

  const handlePlanSelection = e => {
    const selectedPlan = plans.find(plan => plan.Plan_MVP_name === e.target.value)
    setTaskData(prevData => ({
      ...prevData,
      Task_plan: selectedPlan ? selectedPlan.Plan_MVP_name : "",
      Task_planStartDate: selectedPlan?.Plan_startDate ? new Date(selectedPlan.Plan_startDate).toISOString().split("T")[0] : "",
      Task_planEndDate: selectedPlan?.Plan_endDate ? new Date(selectedPlan.Plan_endDate).toISOString().split("T")[0] : ""
    }))
  }

  const handleCreatePlan = async () => {
    try {
      await axios.post("http://localhost:3000/create-plan", { ...planData, Plan_app_Acronym: appAcronym })
      handleClosePlanModal()
      fetchPlans() // Refresh the list of plans
    } catch (err) {
      setError(err.response?.data?.error || "An unexpected error occurred.")
    }
  }

  const handleCreateTask = async () => {
    if (!taskData.Task_name) {
      setError("Task name is required.")
      return
    }

    try {
      const response = await axios.post("http://localhost:3000/create-task", { ...taskData, App_Acronym: appAcronym })
      if (response.data && response.data.log) {
        setLogs(prevLogs => [response.data.log, ...prevLogs])
      }
      handleCloseTaskModal() // Close the modal after successful creation
      await fetchTasks() // Refresh the task list to show the new task
    } catch (err) {
      setError(err.response?.data?.error || "An unexpected error occurred.")
    }
  }

  const hasReleasePermission = () => {
    // Example permission check logic, update based on your app logic
    return currentUser.groups && currentUser.groups.includes("PM")
  }

  return (
    <div className="app-page">
      <h3>{appAcronym}</h3>
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
              <div key={task.id} className="task-card" onClick={() => handleOpenTaskViewModal(task)}>
                <h3>{task.id}</h3> {/* Display Task ID */}
                <p>{task.description}</p> {/* Display Task Description */}
                <div className="task-card-footer">
                  <span className="plan-name" style={{ backgroundColor: task.colour }}>
                    {task.planName || "No Plan"}
                  </span>{" "}
                  {/* Plan Name on bottom left */}
                  <span className="task-owner">{task.owner}</span> {/* Owner on bottom right */}
                </div>
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
          <div className="modal-content task-modal-content" onClick={e => e.stopPropagation()} style={{ width: "80%", maxWidth: "800px" }}>
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

      {showTaskViewModal && selectedTask && (
        <div className="modal-overlay" onClick={handleCloseTaskViewModal}>
          <div className="modal-content task-modal-content" onClick={e => e.stopPropagation()} style={{ width: "80%", maxWidth: "800px" }}>
            <div className="task-modal-container">
              <div className="task-creation-section">
                <h2>View Task</h2>
                <div className="form-group">
                  <label>Creator:</label>
                  <input type="text" value={selectedTask.Task_creator || ""} readOnly />

                  <label>Creation Date:</label>
                  <input type="text" value={selectedTask.Task_createDate || ""} readOnly />

                  <label>Status:</label>
                  <input type="text" value={selectedTask.Task_state || ""} readOnly />

                  <label>Task Name:</label>
                  <input type="text" value={selectedTask.Task_name || ""} readOnly />

                  <label>Task Owner:</label>
                  <input type="text" value={selectedTask.Task_owner || ""} readOnly />

                  <label>Description:</label>
                  <textarea value={selectedTask.Task_description || ""} readOnly />

                  <label>Plan Name:</label>
                  <input type="text" value={selectedTask.Task_plan || "No Plan"} readOnly />

                  <label>Plan Start Date:</label>
                  <input type="text" value={selectedTask.Plan_startDate || ""} readOnly />

                  <label>Plan End Date:</label>
                  <input type="text" value={selectedTask.Plan_endDate || ""} readOnly />
                </div>
                {hasReleasePermission() && (
                  <div>
                    <button>Release</button>
                    <button>Save</button>
                  </div>
                )}
                <button onClick={handleCloseTaskViewModal}>Cancel</button>
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

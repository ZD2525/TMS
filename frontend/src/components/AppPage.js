import React, { useState, useEffect } from "react"
import axios from "axios"
import "../assets/styles/AppPage.css"
import { useLocation } from "react-router-dom" // Import useLocation to access passed state

const AppPage = () => {
  const [tasks, setTasks] = useState([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planData, setPlanData] = useState({
    planName: "",
    startDate: "",
    endDate: "",
    color: ""
  })
  const [error, setError] = useState("")

  const location = useLocation() // Access location to retrieve passed state
  const { appAcronym } = location.state || {} // Extract the appAcronym from state if available

  useEffect(() => {
    // Fetch tasks for the specific application using appAcronym
    const fetchTasks = async () => {
      if (!appAcronym) {
        setError("No application selected.")
        return
      }

      try {
        const response = await axios.post("http://localhost:3000/tasks", { App_Acronym: appAcronym })
        console.log("Fetched tasks:", response.data) // Add this line to inspect the response
        setTasks(response.data)
      } catch (error) {
        console.error("Error fetching tasks:", error)
      }
    }

    fetchTasks()
  }, [appAcronym])

  const handleOpenPlanModal = () => {
    setShowPlanModal(true)
  }

  const handleClosePlanModal = () => {
    setShowPlanModal(false)
    setPlanData({
      planName: "",
      startDate: "",
      endDate: "",
      color: ""
    })
    setError("")
  }

  const handleChange = e => {
    const { name, value } = e.target
    setPlanData(prevData => ({ ...prevData, [name]: value }))
  }

  const handleCreatePlan = async () => {
    try {
      await axios.post("http://localhost:3000/create-plan", { ...planData, App_Acronym: appAcronym })
      handleClosePlanModal()
      // Optionally, fetch plans or tasks to update the view
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
      <button className="create-task-button">Create Task</button>
      <div className="task-columns">
        {["open", "todo", "doing", "done", "closed"].map(state => (
          <div key={state} className="task-column">
            <h2>{state.toUpperCase()}</h2>
            {(Array.isArray(tasks[state]) ? tasks[state] : []).map(task => (
              <div key={task.id} className="task-card">
                <h3>{task.name}</h3>
                <p>{task.description}</p>
                {/* Additional task details */}
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
                <input type="text" name="planName" value={planData.planName} onChange={handleChange} />
              </label>
              <label>
                Start Date:
                <input type="date" name="startDate" value={planData.startDate} onChange={handleChange} />
              </label>
              <label>
                End Date:
                <input type="date" name="endDate" value={planData.endDate} onChange={handleChange} />
              </label>
              <label>
                Color:
                <input type="color" name="color" value={planData.color} onChange={handleChange} />
              </label>
            </div>
            <button onClick={handleCreatePlan}>Create</button>
            <button onClick={handleClosePlanModal}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppPage

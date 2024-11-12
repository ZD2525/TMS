import React, { useState, useEffect } from "react"
import axios from "axios"
import "../assets/styles/AppPage.css"
import { useLocation } from "react-router-dom"

const AppPage = ({ currentUser }) => {
  const [tasks, setTasks] = useState([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planData, setPlanData] = useState({
    Plan_MVP_name: "",
    Plan_startDate: "",
    Plan_endDate: "",
    Plan_color: "#ffffff"
  })
  const [error, setError] = useState("")
  const [userGroups, setUserGroups] = useState([]) // State for storing user groups

  const location = useLocation()
  const { appAcronym } = location.state || {}

  // Fetch tasks and user groups on mount
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

    const fetchUserGroups = async () => {
      try {
        const response = await axios.get("http://localhost:3000/user-groups", { params: { username: currentUser.username } })
        setUserGroups(response.data.groups)
      } catch (error) {
        console.error("Error fetching user groups:", error)
      }
    }

    fetchTasks()
    fetchUserGroups()
  }, [appAcronym, currentUser.username])

  const handleOpenPlanModal = () => {
    setShowPlanModal(true)
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

  const handleChange = e => {
    const { name, value } = e.target
    setPlanData(prevData => ({ ...prevData, [name]: value }))
  }

  const handleCreatePlan = async () => {
    try {
      await axios.post("http://localhost:3000/create-plan", { ...planData, Plan_app_Acronym: appAcronym })
      handleClosePlanModal()
    } catch (err) {
      setError(err.response?.data?.error || "An unexpected error occurred.")
    }
  }

  // Conditional rendering functions
  const isUserInGroup = group => userGroups.includes(group)

  return (
    <div className="app-page">
      <h1>Task Board for {appAcronym || "Application"}</h1>
      {isUserInGroup("PM") && (
        <button onClick={handleOpenPlanModal} className="create-plan-button">
          Create Plan
        </button>
      )}
      {isUserInGroup("PL") && <button className="create-task-button">Create Task</button>}
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
    </div>
  )
}

export default AppPage

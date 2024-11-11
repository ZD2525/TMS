import React, { useState, useEffect } from "react"
import axios from "axios"
import "../assets/styles/AppPage.css"

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

  useEffect(() => {
    // Fetch tasks for the specific application (you may need to use params or state)
    const fetchTasks = async () => {
      try {
        const response = await axios.get("http://localhost:3000/tasks") // Adjust URL as needed
        setTasks(response.data)
      } catch (error) {
        console.error("Error fetching tasks:", error)
      }
    }

    fetchTasks()
  }, [])

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
      await axios.post("http://localhost:3000/create-plan", planData)
      handleClosePlanModal()
      // Optionally, fetch plans or tasks to update the view
    } catch (err) {
      setError(err.response?.data?.error || "An unexpected error occurred.")
    }
  }

  return (
    <div className="app-page">
      <h1>Task Board</h1>
      <button onClick={handleOpenPlanModal} className="create-plan-button">
        Create Plan
      </button>
      <button className="create-task-button">Create Task</button>
      <div className="task-columns">
        {["OPEN", "TODO", "DOING", "DONE", "CLOSED"].map(state => (
          <div key={state} className="task-column">
            <h2>{state}</h2>
            {tasks
              .filter(task => task.state === state)
              .map(task => (
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

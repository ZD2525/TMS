import React, { useState, useEffect } from "react"
import axios from "axios"
import "../assets/styles/AppPage.css"
import { useLocation } from "react-router-dom"

const AppPage = ({ currentUser }) => {
  const [tasks, setTasks] = useState([])
  const [taskPermissions, setTaskPermissions] = useState([])
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [showTaskViewModal, setShowTaskViewModal] = useState(false)
  const [plans, setPlans] = useState([])
  const [hasPlanChanged, setHasPlanChanged] = useState(false)
  const [planData, setPlanData] = useState({
    Plan_MVP_name: "",
    Plan_startDate: "",
    Plan_endDate: "",
    Plan_color: "#ffffff"
  })
  const [taskData, setTaskData] = useState({
    Task_creator: currentUser.username,
    Task_createDate: new Date().toLocaleDateString(),
    Task_state: "Open",
    Task_name: "",
    Task_owner: currentUser.username,
    Task_description: "",
    Task_plan: "",
    Task_planStartDate: "",
    Task_planEndDate: ""
  })
  const [selectedTask, setSelectedTask] = useState(null)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [logs, setLogs] = useState([])
  const [hasTaskCreatePermission, setHasTaskCreatePermission] = useState(false)
  const [hasPlanCreatePermission, setHasPlanCreatePermission] = useState(false)
  const [hasGroupPermission, setHasGroupPermission] = useState(false)

  const location = useLocation()
  const { appAcronym } = location.state || {}

  // const fetchTasks = async () => {
  //   if (!appAcronym) {
  //     setError("No application selected.")
  //     return
  //   }
  //   try {
  //     const response = await axios.post("http://localhost:3000/tasks", {
  //       App_Acronym: appAcronym
  //     })
  //     // Group tasks by their state
  //     const groupedTasks = response.data.reduce(
  //       (acc, task) => {
  //         const stateKey = task.Task_state.toLowerCase().replace(/-/g, "")
  //         if (!acc[stateKey]) acc[stateKey] = []
  //         acc[stateKey].push(task)
  //         return acc
  //       },
  //       { open: [], todo: [], doing: [], done: [], closed: [] }
  //     )

  //     setTasks(groupedTasks)
  //   } catch (error) {
  //     console.error("Error fetching tasks:", error)
  //   }
  // }
  const fetchTasks = async () => {
    if (!appAcronym) {
      setError("No application selected.")
      return
    }
    try {
      const response = await axios.post("http://localhost:3000/tasks", {
        App_Acronym: appAcronym
      })
      const groupedTasks = response.data.reduce(
        (acc, task) => {
          const stateKey = task.Task_state.toLowerCase().replace(/-/g, "")
          if (!acc[stateKey]) acc[stateKey] = []
          acc[stateKey].push(task)
          return acc
        },
        { open: [], todo: [], doing: [], done: [], closed: [] }
      )

      setTasks(groupedTasks)

      // Check permissions after fetching tasks
      await checkPermissionsForCreateTask()
      await checkPermissionsForCreatePlan()
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
      console.error("Error fetching plans:", error.response?.data || error.message)
    }
  }

  const checkUserGroupPermission = async requiredGroup => {
    try {
      const response = await axios.post("http://localhost:3000/checkgroup", { group: Array.isArray(requiredGroup) ? requiredGroup : [requiredGroup] })
      return response.data.success || false
    } catch (error) {
      console.error("Error checking user group permission:", error.response?.data || error.message)
      return false
    }
  }

  const checkPermissionsForCreateTask = async () => {
    try {
      const appResponse = await axios.get("http://localhost:3000/applications")
      const appDetails = appResponse.data?.find(app => app.App_Acronym === appAcronym)
      if (!appDetails || !appDetails.App_permit_Create) {
        console.error("No matching application or `app_permit_create` value found.")
        setHasTaskCreatePermission(false)
        return
      }
      const appPermitCreate = appDetails.App_permit_Create
      const hasPermission = await checkUserGroupPermission(appPermitCreate)
      setHasTaskCreatePermission(hasPermission)
    } catch (error) {
      console.error("Error checking permissions for creating tasks:", error)
      setHasTaskCreatePermission(false)
    }
  }

  const checkPermissionsForCreatePlan = async () => {
    try {
      const hasPermission = await checkUserGroupPermission("PM")
      setHasPlanCreatePermission(hasPermission)
    } catch (error) {
      console.error("Error checking permissions for creating plans:", error)
      setHasPlanCreatePermission(false)
    }
  }

  const handleOpenPlanModal = () => {
    setShowPlanModal(true)
  }

  const handleOpenTaskModal = () => {
    setShowTaskModal(true)
  }

  const handleOpenTaskViewModal = async task => {
    if (!task || !task.Task_id) {
      console.error("Task ID is missing.")
      setError("Unable to open task view - task ID is missing.")
      return
    }

    try {
      setHasPlanChanged(false)

      const response = await axios.post("http://localhost:3000/task", { taskId: task.Task_id })
      const taskData = response.data
      taskData.Task_app_Acronym = task.Task_app_Acronym || taskData.Task_app_Acronym

      // Prepopulate the dropdown with the current plan if it exists
      setTaskData(prevData => ({
        ...prevData,
        Task_plan: taskData.Task_plan || "",
        Task_planStartDate: taskData.Plan_startDate || "",
        Task_planEndDate: taskData.Plan_endDate || ""
      }))

      setSelectedTask(taskData)

      // Fetch permissions if needed
      const permissionResponse = await axios.post("http://localhost:3000/check-permissions", {
        Task_id: response.data.Task_id,
        App_Acronym: response.data.Task_app_Acronym
      })

      if (permissionResponse.data && permissionResponse.data.success) {
        setTaskPermissions(permissionResponse.data.requiredGroup || [])
        const hasPermission = await checkUserGroupPermission(permissionResponse.data.requiredGroup)
        setHasGroupPermission(hasPermission)
      } else {
        setTaskPermissions([])
        setHasGroupPermission(false)
      }

      setShowTaskViewModal(true)
    } catch (error) {
      console.error("Error fetching task details or permissions:", error)
      setError("Unable to fetch task details or permissions.")
    }
  }

  const handleAssignTask = async () => {
    // Save notes first if there are any notes entered
    if (taskData.newNote?.trim()) {
      try {
        await handleSaveNotes() // Call the save notes function
      } catch (error) {
        console.error("Error saving notes before assigning the task:", error)
        setError("Unable to save notes. Task assignment aborted.")
        return // Stop execution if notes could not be saved
      }
    }

    // Proceed with assigning the task
    try {
      const response = await axios.put("http://localhost:3000/assign-task", {
        Task_id: selectedTask.Task_id,
        App_Acronym: selectedTask.Task_app_Acronym,
        Task_owner: currentUser.username
      })
      fetchTasks() // Refresh tasks
      setShowTaskViewModal(false) // Close modal
    } catch (error) {
      console.error("Error assigning task:", error.response?.data || error.message)
      setError("Unable to assign task.")
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
      Task_state: "Open",
      Task_name: "",
      Task_owner: currentUser.username,
      Task_description: "",
      Task_plan: "", // Clear the plan selection
      Task_planStartDate: "", // Clear the plan start date
      Task_planEndDate: "" // Clear the plan end date
    })
    setLogs([])
    setError("")
    setSelectedTask(null) // Clear selected task
  }

  const handleCloseTaskViewModal = () => {
    setShowTaskViewModal(false)
    setSelectedTask(null) // Clear selected task
    setTaskData({
      Task_creator: currentUser.username,
      Task_createDate: new Date().toLocaleDateString(),
      Task_state: "Open",
      Task_name: "",
      Task_owner: currentUser.username,
      Task_description: "",
      Task_plan: "", // Clear the plan selection
      Task_planStartDate: "", // Clear the plan start date
      Task_planEndDate: "" // Clear the plan end date
    })
    setError("")
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
    const newPlanName = selectedPlan ? selectedPlan.Plan_MVP_name : ""

    // Check if the new plan is different from the existing plan
    const isPlanChanged = newPlanName !== selectedTask?.Task_plan

    // Handle changing to an empty plan ("SELECT PLAN")
    const isEmptyPlan = !newPlanName

    // Update state to reflect the change for an existing task
    setHasPlanChanged(isPlanChanged || isEmptyPlan)

    // Update taskData to reflect the change
    setTaskData(prevData => ({
      ...prevData,
      Task_plan: newPlanName,
      Task_planStartDate: selectedPlan?.Plan_startDate ? new Date(selectedPlan.Plan_startDate).toISOString().split("T")[0] : "",
      Task_planEndDate: selectedPlan?.Plan_endDate ? new Date(selectedPlan.Plan_endDate).toISOString().split("T")[0] : ""
    }))
  }

  const handleCreatePlan = async () => {
    try {
      await axios.post("http://localhost:3000/create-plan", {
        ...planData,
        Plan_app_Acronym: appAcronym
      })
      handleClosePlanModal()
      fetchPlans() // Refresh the list of plans
      setSuccessMessage("Plan created successfully.") // Set success message
      setTimeout(() => setSuccessMessage(""), 2000) // Clear success message after 2 seconds
    } catch (err) {
      if (err.response && err.response.data && Array.isArray(err.response.data.details)) {
        // Display validation errors
        const errorMessages = err.response.data.details.map(detail => detail.msg).join(". ")
        setError(errorMessages)
      } else {
        setError(err.response?.data?.error || "An unexpected error occurred.")
      }
      setTimeout(() => setError(""), 2000) // Clear error after 2 seconds
    }
  }

  const handleCreateTask = async () => {
    if (!taskData.Task_name) {
      setError("Task name is required.")
      clearErrorAfterDelay()
      return
    }

    try {
      const response = await axios.post("http://localhost:3000/create-task", {
        ...taskData,
        App_Acronym: appAcronym
      })
      handleCloseTaskModal() // Close the modal after successful creation
      await fetchTasks() // Refresh the task list to show the new task
      setSuccessMessage("Task created successfully.") // Set success message
      setTimeout(() => setSuccessMessage(""), 2000) // Clear success message after 2 seconds
    } catch (err) {
      if (err.response && err.response.data && Array.isArray(err.response.data.details)) {
        // Display validation errors
        const errorMessages = err.response.data.details.map(detail => detail.msg).join(". ")
        setError(errorMessages)
      } else {
        setError(err.response?.data?.error || "An unexpected error occurred.")
      }
      clearErrorAfterDelay() // Clear error after 2 seconds
    }
  }

  const clearErrorAfterDelay = () => {
    setTimeout(() => {
      setError("")
    }, 2000)
  }

  const handleReleaseTask = async () => {
    if (taskData.newNote?.trim()) {
      try {
        await handleSaveNotes() // Save notes before releasing
      } catch (error) {
        console.error("Error saving notes before releasing the task:", error)
        setError("Unable to save notes. Task release aborted.")
        return
      }
    }

    try {
      const requestData = {
        Task_id: selectedTask.Task_id,
        App_Acronym: selectedTask.Task_app_Acronym,
        Task_owner: currentUser.username // Include current user as owner
      }

      // Conditionally include new plan data if there is a change
      if (hasPlanChanged) {
        requestData.newPlan = taskData.Task_plan
      }

      const response = await axios.put("http://localhost:3000/release-task", requestData)
      fetchTasks() // Refresh tasks
      setShowTaskViewModal(false) // Close modal
    } catch (error) {
      console.error("Error releasing task:", error.response?.data || error.message)
      setError("Unable to release task.")
    }
  }

  const handleUnassignTask = async () => {
    if (taskData.newNote?.trim()) {
      try {
        await handleSaveNotes()
      } catch (error) {
        console.error("Error saving notes before unassigning the task:", error)
        setError("Unable to save notes. Task unassignment aborted.")
        return
      }
    }

    try {
      const response = await axios.put("http://localhost:3000/unassign-task", {
        Task_id: selectedTask.Task_id,
        Task_owner: currentUser.username // Include current user as owner
      })
      fetchTasks()
      setShowTaskViewModal(false)
    } catch (error) {
      console.error("Error unassigning task:", error.response?.data || error.message)
      setError("Unable to unassign task.")
    }
  }

  const handleReviewTask = async () => {
    if (taskData.newNote?.trim()) {
      try {
        await handleSaveNotes()
      } catch (error) {
        console.error("Error saving notes before reviewing the task:", error)
        setError("Unable to save notes. Task review aborted.")
        return
      }
    }

    try {
      const response = await axios.put("http://localhost:3000/review-task", {
        Task_id: selectedTask.Task_id,
        app_acronym: selectedTask.Task_app_Acronym,
        Task_owner: currentUser.username // Include current user as owner
      })
      fetchTasks()
      setShowTaskViewModal(false)
    } catch (error) {
      console.error("Error reviewing task:", error.response?.data || error.message)
      setError("Unable to review task.")
    }
  }

  const handleApproveTask = async () => {
    if (taskData.newNote?.trim()) {
      try {
        await handleSaveNotes()
      } catch (error) {
        console.error("Error saving notes before approving the task:", error)
        setError("Unable to save notes. Task approval aborted.")
        return
      }
    }

    try {
      const response = await axios.put("http://localhost:3000/approve-task", {
        Task_id: selectedTask.Task_id,
        Task_owner: currentUser.username // Include current user as owner
      })
      fetchTasks()
      setShowTaskViewModal(false)
    } catch (error) {
      console.error("Error approving task:", error.response?.data || error.message)
      setError("Unable to approve task.")
    }
  }

  const handleRejectTask = async () => {
    if (taskData.newNote?.trim()) {
      try {
        await handleSaveNotes()
      } catch (error) {
        console.error("Error saving notes before rejecting the task:", error)
        setError("Unable to save notes. Task rejection aborted.")
        return
      }
    }

    try {
      const requestData = {
        Task_id: selectedTask.Task_id,
        Task_owner: currentUser.username
      }

      if (hasPlanChanged) {
        requestData.newPlan = taskData.Task_plan
      }

      const response = await axios.put("http://localhost:3000/reject-task", requestData)
      fetchTasks()
      setShowTaskViewModal(false)
    } catch (error) {
      console.error("Error rejecting task:", error.response?.data || error.message)
      setError("Unable to reject task.")
    }
  }

  const handleSaveNotes = async () => {
    if (!selectedTask) {
      setError("No task is selected.")
      return
    }

    // Skip saving if there are no additional notes and no plan change
    if (!taskData.newNote && !hasPlanChanged) {
      setError("No changes detected to save.")
      return
    }

    try {
      let updatedPlan = selectedTask.Task_plan

      // If there is a plan change, update the Task_plan field
      if (hasPlanChanged) {
        updatedPlan = taskData.Task_plan // Update the plan to the new value
      }

      // Call the save-task-notes route
      await axios.put("http://localhost:3000/save-task-notes", {
        Task_id: selectedTask.Task_id,
        newNote: taskData.newNote ? taskData.newNote.trim() : undefined,
        Task_plan: hasPlanChanged ? updatedPlan : undefined,
        Task_owner: currentUser.username, // Pass the current user as Task_owner
        username: currentUser.username // Pass username to the backend if needed
      })

      // Fetch updated task details to reflect changes immediately
      const updatedTaskResponse = await axios.post("http://localhost:3000/task", {
        taskId: selectedTask.Task_id
      })

      // Update the state of selectedTask and refresh the task data
      setSelectedTask(updatedTaskResponse.data)
      setTaskData(prevData => ({
        ...prevData,
        newNote: "",
        Task_plan: updatedTaskResponse.data.Task_plan, // Update taskData with the new plan
        Task_owner: currentUser.username // Update Task_owner
      }))

      // Refresh the task list to show the updated plan in the display
      await fetchTasks()

      // Optionally, clear any error messages
      setError("")
    } catch (error) {
      console.error("Error saving changes:", error)
      setError("Unable to save changes.")
    }
  }

  useEffect(() => {
    fetchTasks() // Call fetchTasks on component mount
    fetchPlans()
  }, [appAcronym])

  useEffect(() => {
    // Fetch currentUser data here if needed
  }, [currentUser])

  useEffect(() => {
    if (appAcronym) {
      checkPermissionsForCreateTask()
      checkPermissionsForCreatePlan()
    }
  }, [appAcronym])

  return (
    <div className="app-page">
      <h3>{appAcronym}</h3>
      {successMessage && <div className="success-box">{successMessage}</div>}
      {/* Conditionally render the "Create Plan" button */}
      {hasPlanCreatePermission && (
        <button onClick={handleOpenPlanModal} className="create-plan-button">
          Create Plan
        </button>
      )}
      {hasTaskCreatePermission && (
        <button onClick={handleOpenTaskModal} className="create-task-button">
          Create Task
        </button>
      )}
      <div className="task-columns">
        {["open", "todo", "doing", "done", "closed"].map(state => (
          <div key={state} className="task-column">
            <h2>{state.toUpperCase()}</h2>
            {(Array.isArray(tasks[state]) ? tasks[state] : []).map(task => {
              const planColor = plans.find(plan => plan.Plan_MVP_name === task.Task_plan)?.Plan_color || "#d3d3d3"
              return (
                <div key={task.Task_id} className="task-card" onClick={() => handleOpenTaskViewModal(task)}>
                  <h3>{task.Task_id}</h3>
                  <p>{task.Task_description || "No description provided."}</p>
                  <div className="task-card-footer">
                    <span className="plan-name" style={{ backgroundColor: planColor }}>
                      {task.Task_plan || "No Plan"}
                    </span>
                    {/* Plan Name on bottom left */}
                    <span className="task-owner">{task.Task_owner}</span> {/* Owner on bottom right */}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {showPlanModal && (
        <div className="modal-overlay" onClick={handleClosePlanModal}>
          <div className="create-plan-modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create Plan</h2>
            {error && <div className="create-plan-error-box">{error}</div>}
            <div className="form-group">
              {/* Displaying the App Acronym */}
              <label>
                App Acronym:
                <input type="text" value={appAcronym} readOnly style={{ backgroundColor: "#f0f0f0", color: "black", border: "1px solid #ccc", cursor: "not-allowed" }} />
              </label>
            </div>
            <div className="form-group">
              <label>
                Plan Name*:
                <input type="text" name="Plan_MVP_name" value={planData.Plan_MVP_name} onChange={handleChange} />
              </label>
              <label>
                Start Date*:
                <input type="date" name="Plan_startDate" value={planData.Plan_startDate} onChange={handleChange} />
              </label>
              <label>
                End Date*:
                <input type="date" name="Plan_endDate" value={planData.Plan_endDate} onChange={handleChange} />
              </label>
              <label>
                Color*:
                <input type="color" name="Plan_color" value={planData.Plan_color} onChange={handleChange} />
              </label>
            </div>
            <button onClick={handleCreatePlan} className="create-button">
              Create
            </button>
            <button onClick={handleClosePlanModal} className="cancel-button">
              Cancel
            </button>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="modal-overlay" onClick={handleCloseTaskModal}>
          <div className="view-task-modal-content" onClick={e => e.stopPropagation()} style={{ width: "80%", maxWidth: "1200px" }}>
            <div className="task-modal-container">
              <div className="task-creation-section">
                <h2>Create Task</h2>
                {error && <div className="create-task-error-box">{error}</div>}
                <div className="form-group">
                  <label>Creator:</label>
                  <input type="text" value={taskData.Task_creator} readOnly />
                  <label>Creation Date:</label>
                  <input type="text" value={taskData.Task_createDate} readOnly />
                  <label>Status:</label>
                  <input type="text" value={taskData.Task_state} readOnly />
                  <label>Task Name*:</label>
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
                  <input type="text" value={taskData.Task_planStartDate || ""} readOnly />
                  <label>Plan End Date:</label>
                  <input type="text" value={taskData.Task_planEndDate || ""} readOnly />
                </div>
              </div>

              <div className="task-logs-section">
                <h2>Logs</h2>
                <div className="task-notes">
                  <p>No logs available.</p>
                </div>
                <div className="modal-footer">
                  <button className="create-button" onClick={handleCreateTask}>
                    Create
                  </button>
                  <button className="cancel-button" onClick={handleCloseTaskModal}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTaskViewModal && selectedTask && (
        <div className="modal-overlay" onClick={handleCloseTaskViewModal}>
          <div className="view-task-modal-content" onClick={e => e.stopPropagation()} style={{ width: "80%", maxWidth: "1200px" }}>
            <div className="task-modal-container">
              {/* Task Creation / Details Section */}
              <div className="task-creation-section">
                <h2>{selectedTask.Task_name}</h2>
                <div className="form-group">
                  {/* Task fields */}
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
                  {selectedTask && (selectedTask.Task_state === "Open" || selectedTask.Task_state === "Done") && hasGroupPermission ? (
                    <select name="Task_plan" value={taskData.Task_plan} onChange={handlePlanSelection}>
                      <option value="">Select Plan</option>
                      {plans.map(plan => (
                        <option key={plan.Plan_MVP_name} value={plan.Plan_MVP_name}>
                          {plan.Plan_MVP_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input type="text" value={selectedTask?.Task_plan || "No Plan"} readOnly />
                  )}
                  <label>Plan Start Date:</label>
                  <input type="text" value={taskData.Task_planStartDate || ""} readOnly />
                  <label>Plan End Date:</label>
                  <input type="text" value={taskData.Task_planEndDate || ""} readOnly />
                </div>
              </div>

              {/* Logs and Notes Section */}
              <div className="task-logs-section">
                <h2>Logs</h2>
                <div className="task-notes">{selectedTask?.Task_notes ? selectedTask.Task_notes.split("\n").map((note, index) => <p key={index}>{note}</p>) : <p>No logs available.</p>}</div>

                {/* Conditionally render the Notes Input Area based on Task State */}
                {selectedTask.Task_state !== "Closed" && hasGroupPermission && (
                  <div className="task-notes-container">
                    <label>Notes:</label>
                    <textarea value={taskData.newNote || ""} onChange={e => setTaskData(prevData => ({ ...prevData, newNote: e.target.value }))} placeholder="Add notes here..." />
                  </div>
                )}

                {/* Buttons for the modal footer */}
                <div className="modal-footer">
                  {selectedTask && selectedTask.Task_state === "Open" && hasGroupPermission && (
                    <>
                      <button className="release-button" onClick={handleReleaseTask}>
                        Release
                      </button>
                      <button className="save-button" onClick={handleSaveNotes}>
                        Save
                      </button>
                      <button className="cancel-button" onClick={handleCloseTaskViewModal}>
                        Cancel
                      </button>
                    </>
                  )}
                  {selectedTask && selectedTask.Task_state === "To-Do" && hasGroupPermission && (
                    <>
                      <button className="assign-button" onClick={handleAssignTask}>
                        Assign
                      </button>
                      <button className="save-button" onClick={handleSaveNotes}>
                        Save
                      </button>
                      <button className="cancel-button" onClick={handleCloseTaskViewModal}>
                        Cancel
                      </button>
                    </>
                  )}
                  {selectedTask && selectedTask.Task_state === "Doing" && hasGroupPermission && (
                    <>
                      <button className="review-button" onClick={handleReviewTask}>
                        Review
                      </button>
                      <button className="unassign-button" onClick={handleUnassignTask}>
                        Unassign
                      </button>
                      <button className="save-button" onClick={handleSaveNotes}>
                        Save
                      </button>
                      <button className="cancel-button" onClick={handleCloseTaskViewModal}>
                        Cancel
                      </button>
                    </>
                  )}
                  {selectedTask && selectedTask.Task_state === "Done" && hasGroupPermission && (
                    <>
                      {!hasPlanChanged && (
                        <>
                          <button className="approve-button" onClick={handleApproveTask}>
                            Approve
                          </button>
                        </>
                      )}
                      <button className="reject-button" onClick={handleRejectTask}>
                        {hasPlanChanged ? "Reject" : "Reject"}
                      </button>
                      {!hasPlanChanged && (
                        <>
                          <button className="save-button" onClick={handleSaveNotes}>
                            Save
                          </button>
                        </>
                      )}
                      <button className="cancel-button" onClick={handleCloseTaskViewModal}>
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AppPage

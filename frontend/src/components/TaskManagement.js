import React, { useState, useEffect } from "react"
import axios from "axios"
import "../assets/styles/TaskManagement.css"
import { useNavigate } from "react-router-dom" // Assuming you are using react-router for navigation

const TaskManagementSystem = () => {
  const [applications, setApplications] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editMode, setEditMode] = useState(false) // State to track edit mode
  const [formData, setFormData] = useState({
    App_Acronym: "",
    App_RNumber: "",
    App_Description: "",
    App_startDate: "",
    App_endDate: "",
    App_permit_Open: "",
    App_permit_Todo: "",
    App_permit_Doing: "",
    App_permit_Done: "",
    App_permit_Create: ""
  })
  const [userGroups, setUserGroups] = useState([]) // State to hold user groups
  const [error, setError] = useState("")
  const navigate = useNavigate() // To handle navigation

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axios.get("http://localhost:3000/applications")
        setApplications(response.data)
      } catch (error) {
        console.error("Error fetching applications:", error)
      }
    }

    const checkUserRole = async () => {
      try {
        const response = await axios.post("http://localhost:3000/checkgroup", { group: "PL" })
        if (response.data.success) {
          setUserRole("PL")
        }
      } catch (error) {
        console.error("Error checking user role:", error)
      }
    }

    const fetchUserGroups = async () => {
      try {
        const response = await axios.get("http://localhost:3000/groups")
        console.log("Fetched User Groups:", response.data)
        setUserGroups(response.data)
      } catch (error) {
        console.error("Error fetching user groups:", error)
        setUserGroups([])
      }
    }

    fetchApplications()
    checkUserRole()
    fetchUserGroups()
  }, [])

  const handleCreateApplication = () => {
    setShowCreateModal(true)
    setEditMode(false) // Set to create mode
  }

  const handleEditApplication = app => {
    setFormData({
      App_Acronym: app.App_Acronym,
      App_RNumber: app.App_RNumber,
      App_Description: app.App_Description,
      App_startDate: app.App_startDate,
      App_endDate: app.App_endDate,
      App_permit_Open: app.App_permit_Open,
      App_permit_Todo: app.App_permit_Todo,
      App_permit_Doing: app.App_permit_Doing,
      App_permit_Done: app.App_permit_Done,
      App_permit_Create: app.App_permit_Create
    })
    setShowCreateModal(true)
    setEditMode(true) // Set to edit mode
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setFormData({
      App_Acronym: "",
      App_RNumber: "",
      App_Description: "",
      App_startDate: "",
      App_endDate: "",
      App_permit_Open: "",
      App_permit_Todo: "",
      App_permit_Doing: "",
      App_permit_Done: "",
      App_permit_Create: ""
    })
    setError("")
  }

  const handleChange = e => {
    const { name, value } = e.target
    setFormData(prevData => ({ ...prevData, [name]: value }))
  }

  const handleSubmit = async () => {
    try {
      if (editMode) {
        // Edit mode: update application
        await axios.put("http://localhost:3000/update-application", formData)
      } else {
        // Create mode: create application
        await axios.post("http://localhost:3000/create-application", formData)
      }
      handleCloseModal()
      const response = await axios.get("http://localhost:3000/applications")
      setApplications(response.data)
    } catch (err) {
      setError(err.response?.data?.error || "An unexpected error occurred.")
    }
  }

  const handleCardClick = app => {
    navigate("/app", { state: { appAcronym: app.App_Acronym } }) // Pass App_Acronym as state
  }

  return (
    <div className="task-management-system">
      <h2>Applications</h2>
      {userRole === "PL" && (
        <button onClick={handleCreateApplication} className="create-app-button">
          Create App
        </button>
      )}
      <div className="application-grid">
        {applications.length > 0 ? (
          applications.map((app, index) => (
            <div key={index} className="application-card" onClick={() => handleCardClick(app)} style={{ position: "relative", cursor: "pointer" }}>
              <h3>{app.App_Acronym}</h3>
              <p>
                <strong>Description:</strong> {app.App_Description}
              </p>
              <p>
                <strong>Start Date:</strong> {new Date(app.App_startDate).toLocaleDateString()}
              </p>
              <p>
                <strong>End Date:</strong> {new Date(app.App_endDate).toLocaleDateString()}
              </p>
              {userRole === "PL" && (
                <button
                  className="edit-button"
                  onClick={e => {
                    e.stopPropagation() // Prevent card click when editing
                    handleEditApplication(app)
                  }}
                  style={{ position: "absolute", top: "5px", right: "5px", cursor: "pointer" }}
                >
                  ✏️ Edit
                </button>
              )}
            </div>
          ))
        ) : (
          <p>No applications available</p>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>{editMode ? "Edit App" : "Create App"}</h2>
            {error && <div className="error-box">{error}</div>}
            <div className="form-group">
              <label>
                Name:
                <input type="text" name="App_Acronym" value={formData.App_Acronym} onChange={handleChange} />
              </label>
              <label>
                RNumber:
                <input type="text" name="App_RNumber" value={formData.App_RNumber} onChange={handleChange} />
              </label>
            </div>
            <div className="form-group">
              <label>
                Description:
                <textarea name="App_Description" value={formData.App_Description} onChange={handleChange} rows="4" />
              </label>
            </div>
            <div className="form-group">
              <label>
                Start Date:
                <input type="date" name="App_startDate" value={formData.App_startDate} onChange={handleChange} />
              </label>
              <label>
                End Date:
                <input type="date" name="App_endDate" value={formData.App_endDate} onChange={handleChange} />
              </label>
            </div>
            <div className="form-group">
              <label>
                Permit Open:
                <select name="App_permit_Open" value={formData.App_permit_Open} onChange={handleChange}>
                  <option value="">Select Group</option>
                  {userGroups.map((group, index) => (
                    <option key={index} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Permit Todo:
                <select name="App_permit_Todo" value={formData.App_permit_Todo} onChange={handleChange}>
                  <option value="">Select Group</option>
                  {userGroups.map((group, index) => (
                    <option key={index} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Permit Doing:
                <select name="App_permit_Doing" value={formData.App_permit_Doing} onChange={handleChange}>
                  <option value="">Select Group</option>
                  {userGroups.map((group, index) => (
                    <option key={index} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Permit Done:
                <select name="App_permit_Done" value={formData.App_permit_Done} onChange={handleChange}>
                  <option value="">Select Group</option>
                  {userGroups.map((group, index) => (
                    <option key={index} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Permit Create:
                <select name="App_permit_Create" value={formData.App_permit_Create} onChange={handleChange}>
                  <option value="">Select Group</option>
                  {userGroups.map((group, index) => (
                    <option key={index} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button onClick={handleSubmit}>{editMode ? "Update" : "Create"}</button>
            <button onClick={handleCloseModal}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskManagementSystem

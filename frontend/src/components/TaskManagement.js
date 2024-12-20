import React, { useState, useEffect } from "react"
import axios from "axios"
import Modal from "react-modal"
import "../assets/styles/TaskManagement.css"
import { useNavigate } from "react-router-dom"

Modal.setAppElement("#app") // Ensure this matches the root element ID of your app

const TaskManagementSystem = () => {
  const [applications, setApplications] = useState([])
  const [originalAppAcronym, setOriginalAppAcronym] = useState("")
  const [userRole, setUserRole] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
    App_Acronym: "",
    App_Rnumber: "",
    App_Description: "",
    App_startDate: "",
    App_endDate: "",
    App_permit_Create: "",
    App_permit_Open: "",
    App_permit_toDoList: "",
    App_permit_Doing: "",
    App_permit_Done: ""
  })
  const [userGroups, setUserGroups] = useState([])
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("") // State to manage success message
  const navigate = useNavigate()

  const handleCreateApplication = () => {
    setShowCreateModal(true)
    setEditMode(false)
    setFormData({
      App_Acronym: "",
      App_Rnumber: "",
      App_Description: "",
      App_startDate: "",
      App_endDate: "",
      App_permit_Open: "",
      App_permit_toDoList: "",
      App_permit_Doing: "",
      App_permit_Done: "",
      App_permit_Create: ""
    })
  }

  const handleEditApplication = app => {
    const formatDate = date => (date ? new Date(date).toISOString().split("T")[0] : "")

    setFormData({
      App_Acronym: app.App_Acronym,
      App_Rnumber: app.App_Rnumber ? app.App_Rnumber.toString() : "",
      App_Description: app.App_Description,
      App_startDate: formatDate(app.App_startDate),
      App_endDate: formatDate(app.App_endDate),
      App_permit_Create: app.App_permit_Create,
      App_permit_Open: app.App_permit_Open,
      App_permit_toDoList: app.App_permit_toDoList,
      App_permit_Doing: app.App_permit_Doing,
      App_permit_Done: app.App_permit_Done
    })
    setOriginalAppAcronym(app.App_Acronym) // Store the original App_Acronym
    setShowCreateModal(true)
    setEditMode(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setFormData({
      App_Acronym: "",
      App_Rnumber: "",
      App_Description: "",
      App_startDate: "",
      App_endDate: "",
      App_permit_Open: "",
      App_permit_toDoList: "",
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
      // Perform basic client-side validation if needed
      if (!formData.App_Acronym) {
        setError("App_Acronym cannot be empty.")
        setTimeout(() => setError(""), 2000) // Clear error after 2 seconds
        return
      }

      let response
      if (editMode) {
        response = await axios.put("http://localhost:3000/update-application", {
          ...formData,
          originalAppAcronym // Pass the original App_Acronym for updates
        })
      } else {
        response = await axios.post("http://localhost:3000/create-application", formData)
      }
      handleCloseModal() // Close the modal on success
      const fetchResponse = await axios.get("http://localhost:3000/applications") // Refresh applications list
      setApplications(fetchResponse.data)
      setSuccessMessage(editMode ? "Application updated successfully." : "Application created successfully.") // Set success message
      setTimeout(() => setSuccessMessage(""), 2000) // Clear success message after 2 seconds
    } catch (err) {
      // Check if error response contains validation errors
      if (err.response && err.response.data) {
        const errorData = err.response.data

        // Handle validation error
        if (errorData.details && Array.isArray(errorData.details)) {
          // Map through the error details and set them as a single string or show them individually
          const errorMessages = errorData.details.map(detail => detail.msg).join(". ")
          setError(errorMessages)
        } else if (errorData.error) {
          // Handle general error messages
          setError(errorData.error)
        } else {
          setError("An unexpected error occurred.")
        }
      } else {
        // Fallback for network or other unexpected errors
        setError("An unexpected error occurred.")
      }
      setTimeout(() => setError(""), 2000) // Clear error after 2 seconds
    }
  }

  const handleViewApplication = app => {
    navigate("/app", { state: { appAcronym: app.App_Acronym } })
  }

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
      setUserGroups(response.data)
    } catch (error) {
      console.error("Error fetching user groups:", error)
      setUserGroups([])
    }
  }

  useEffect(() => {
    fetchApplications()
    checkUserRole()
    fetchUserGroups()
  }, [])

  return (
    <div className="task-management-system">
      <h2>Applications</h2>
      {successMessage && <div className="success-box">{successMessage}</div>} {/* Success message box */}
      {userRole === "PL" && (
        <button onClick={handleCreateApplication} className="create-app-button">
          Create App
        </button>
      )}
      <div className="application-grid">
        {applications.length > 0 ? (
          applications.map((app, index) => (
            <div key={index} className="application-card">
              {userRole === "PL" && (
                <button
                  className="edit-button"
                  onClick={e => {
                    e.stopPropagation()
                    handleEditApplication(app)
                  }}
                >
                  ✏️
                </button>
              )}
              <p>
                <strong>App Name: </strong>
                {app.App_Acronym}
              </p>
              <p>
                <strong>Description:</strong>
                <textarea
                  value={app.App_Description}
                  disabled
                  rows={4} // Adjust the number of rows as needed
                  className="app-description-textarea"
                />
              </p>
              <p>
                <strong>Start Date:</strong> {new Date(app.App_startDate).toLocaleDateString()}
              </p>
              <p>
                <strong>End Date:</strong> {new Date(app.App_endDate).toLocaleDateString()}
              </p>
              <button className="view-application-button" onClick={() => handleViewApplication(app)}>
                View
              </button>
            </div>
          ))
        ) : (
          <p>No applications available</p>
        )}
      </div>
      <Modal isOpen={showCreateModal} onRequestClose={handleCloseModal} contentLabel={editMode ? "Edit Application Modal" : "Create Application Modal"} className="app-modal-content" overlayClassName="app-modal-overlay">
        <h2>{editMode ? "Update App" : "Create App"}</h2>
        {error && <div className="error-box">{error}</div>}
        <div className="form-group">
          <label>
            App_Acronym{!editMode && "*"}:
            <input
              type="text"
              name="App_Acronym"
              value={formData.App_Acronym}
              onChange={handleChange}
              disabled={!editMode && !showCreateModal} // Ensure it's editable in edit mode or when creating
            />
          </label>
        </div>
        <div className="form-group">
          <label>
            RNumber{!editMode && "*"}:
            <input
              type="text"
              name="App_Rnumber"
              value={formData.App_Rnumber}
              onChange={handleChange}
              readOnly={editMode} // Make it readonly only in edit mode
            />
          </label>
        </div>
        <div className="form-group">
          <label>
            Description:
            <textarea name="App_Description" value={formData.App_Description} onChange={handleChange} />
          </label>
        </div>
        <div className="form-group">
          <label>
            Start Date{!editMode && "*"}:
            <input
              type="date"
              name="App_startDate"
              value={formData.App_startDate}
              onChange={handleChange}
              disabled={!editMode && !showCreateModal} // Ensure it's editable in edit mode or when creating
            />
          </label>
        </div>
        <div className="form-group">
          <label>
            End Date{!editMode && "*"}:
            <input
              type="date"
              name="App_endDate"
              value={formData.App_endDate}
              onChange={handleChange}
              disabled={!editMode && !showCreateModal} // Ensure it's editable in edit mode or when creating
            />
          </label>
        </div>
        <div className="form-group">
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
        </div>
        <div className="form-group">
          <label>
            Permit Todo:
            <select name="App_permit_toDoList" value={formData.App_permit_toDoList} onChange={handleChange}>
              <option value="">Select Group</option>
              {userGroups.map((group, index) => (
                <option key={index} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-group">
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
        </div>
        <div className="form-group">
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
        </div>
        <div className="button-container">
          <button onClick={handleSubmit} className="create-button">
            {editMode ? "Update" : "Create"}
          </button>
        </div>
      </Modal>
    </div>
  )
}

export default TaskManagementSystem

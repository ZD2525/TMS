import React, { useState, useEffect } from "react"
import axios from "axios"
import Modal from "react-modal"
import "../assets/styles/TaskManagement.css"
import { useNavigate } from "react-router-dom"

Modal.setAppElement("#app") // Ensure this matches the root element ID of your app

const TaskManagementSystem = () => {
  const [applications, setApplications] = useState([])
  const [userRole, setUserRole] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [formData, setFormData] = useState({
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
  const [userGroups, setUserGroups] = useState([])
  const [error, setError] = useState("")
  const navigate = useNavigate()

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
    setEditMode(false)
  }

  const handleEditApplication = app => {
    const formatDate = date => (date ? new Date(date).toISOString().split("T")[0] : "")

    setFormData({
      App_Acronym: app.App_Acronym,
      App_Rnumber: app.App_Rnumber ? app.App_Rnumber.toString() : "",
      App_Description: app.App_Description,
      App_startDate: formatDate(app.App_startDate),
      App_endDate: formatDate(app.App_endDate),
      App_permit_Open: app.App_permit_Open,
      App_permit_toDoList: app.App_permit_toDoList,
      App_permit_Doing: app.App_permit_Doing,
      App_permit_Done: app.App_permit_Done,
      App_permit_Create: app.App_permit_Create
    })
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
      if (editMode) {
        await axios.put("http://localhost:3000/update-application", formData)
      } else {
        await axios.post("http://localhost:3000/create-application", formData)
      }
      handleCloseModal()
      const response = await axios.get("http://localhost:3000/applications")
      setApplications(response.data)
    } catch (err) {
      setError(err.response?.data?.error || "An unexpected error occurred.")
    }
  }

  const handleViewApplication = app => {
    navigate("/app", { state: { appAcronym: app.App_Acronym } })
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
              <span
                className="view-application"
                onClick={() => handleViewApplication(app)}
                style={{
                  display: "block",
                  marginTop: "10px",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                View
              </span>
            </div>
          ))
        ) : (
          <p>No applications available</p>
        )}
      </div>

      <Modal isOpen={showCreateModal} onRequestClose={handleCloseModal} contentLabel={editMode ? "Edit Application Modal" : "Create Application Modal"} className="app-modal-content" overlayClassName="app-modal-overlay">
        <h2>{editMode ? "Edit App" : "Create App"}</h2>
        {error && <div className="error-box">{error}</div>}
        <div className="form-group-row">
          <div className="form-group">
            <label>
              Name:
              <input type="text" name="App_Acronym" value={formData.App_Acronym} onChange={handleChange} />
            </label>
          </div>
          <div className="form-group">
            <label>
              RNumber:
              <input type="text" name="App_Rnumber" value={formData.App_Rnumber} onChange={handleChange} />
            </label>
          </div>
        </div>
        <div className="form-group">
          <label>
            Description:
            <textarea name="App_Description" value={formData.App_Description} onChange={handleChange} rows="4" />
          </label>
        </div>
        <div className="form-group-row">
          <div className="form-group">
            <label>
              Start Date:
              <input type="date" name="App_startDate" value={formData.App_startDate} onChange={handleChange} />
            </label>
          </div>
          <div className="form-group">
            <label>
              End Date:
              <input type="date" name="App_endDate" value={formData.App_endDate} onChange={handleChange} />
            </label>
          </div>
        </div>
        <div className="form-group-row">
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
        </div>
        <div className="form-group-row">
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
        </div>
        <button onClick={handleSubmit}>{editMode ? "Update" : "Create"}</button>
        <button onClick={handleCloseModal}>Cancel</button>
      </Modal>
    </div>
  )
}

export default TaskManagementSystem

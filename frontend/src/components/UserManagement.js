import React, { useState, useEffect } from "react"
import axios from "axios"
import Select from "react-select"
import { useNavigate } from "react-router-dom"
import Header from "./Header"
import "../assets/styles/UserManagement.css"

axios.defaults.withCredentials = true

const UserManagement = ({ fetchUserProfile, username, isAdmin, handleLogout }) => {
  const [users, setUsers] = useState([]) // List of all users
  const [groups, setGroups] = useState([]) // List of all groups
  const [newGroup, setNewGroup] = useState("") // Input value for creating a new group
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    group: [],
    accountStatus: "Active"
  })
  const [editingUser, setEditingUser] = useState(null) // Username of the user being edited
  const [editFormData, setEditFormData] = useState({}) // Form data for editing a user
  const [errorMessage, setErrorMessage] = useState("") // Error message in UI
  const [successMessage, setSuccessMessage] = useState("") // Success message in UI

  const navigate = useNavigate() // Navigation hook

  // Function to check if the user is still an admin and active
  const validateAdminStatus = async () => {
    try {
      const profile = await fetchUserProfile()
      if (!profile) {
        handleLogout() // This will log the user out if the profile fetch fails
        return
      }
      if (!profile.isAdmin) {
        navigate("/taskmanagementsystem")
        return
      }
      if (profile.accountStatus !== "Active") {
        handleLogout()
      }
    } catch (error) {
      console.error("Error validating admin status:", error)
      handleLogout() // Fallback logout in case of errors
    }
  }

  // Fetch initial data on component mount
  useEffect(() => {
    const initializeData = async () => {
      try {
        await fetchUserProfile() // Verify user session
        await fetchUsers() // Fetch all users
        await fetchGroups() // Fetch all groups
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate("/login") // Redirect based on response
        } else {
          console.error("Failed to initialize data:", error)
        }
      }
    }
    initializeData()
  }, [fetchUserProfile, navigate])

  // Fetches all users from the backend
  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:3000/getallusers")
      setUsers(response.data || [])
    } catch (error) {
      handleUnauthorizedAccess(error.response?.status)
    }
  }

  // Fetches all groups from the backend
  const fetchGroups = async () => {
    try {
      const response = await axios.get("http://localhost:3000/groups")
      setGroups(response.data?.map(group => ({ value: group, label: group })) || [])
    } catch (error) {
      handleUnauthorizedAccess(error.response?.status)
    }
  }

  // Handles redirection based on error status
  const handleUnauthorizedAccess = status => {
    if (status === 401 || status === 403) {
      navigate("/login") // Redirects to login if unauthorized or forbidden
    }
  }

  // Display temporary message
  const showMessageWithTimeout = (setterFunction, message, duration = 2000) => {
    setterFunction(message)
    setTimeout(() => {
      setterFunction("")
    }, duration)
  }

  // Initiates edit mode for a selected user
  const handleEditClick = async user => {
    await validateAdminStatus() // Validate status before performing action
    try {
      const response = await axios.post("http://localhost:3000/getuserbyusername", { username: user.username })
      if (response.data) {
        setEditingUser(user.username)
        setEditFormData({
          email: response.data.email || "",
          accountStatus: response.data.accountStatus || "Active",
          groups: response.data.groups || [],
          password: ""
        })
        setErrorMessage("")
        setSuccessMessage("")
      }
    } catch (error) {
      showMessageWithTimeout(setErrorMessage, "Error fetching user details.")
    }
  }

  // Saves edited user details to backend
  const handleSaveClick = async username => {
    await validateAdminStatus() // Validate status before performing action
    const payload = {
      username,
      email: editFormData.email || "",
      accountStatus: editFormData.accountStatus,
      groups: editFormData.groups
    }

    if (editFormData.password) {
      payload.password = editFormData.password
    }

    try {
      await axios.put("http://localhost:3000/updateuser", payload)
      showMessageWithTimeout(setSuccessMessage, "User updated successfully.")
      await fetchUsers()
      setEditingUser(null)
      setEditFormData({})
    } catch (error) {
      const backendErrors = error.response?.data?.details || []
      const errorMessage = backendErrors.length > 0 ? backendErrors.map(err => err.msg).join(", ") : "Error updating user."
      showMessageWithTimeout(setErrorMessage, errorMessage)
    }
  }

  // Create new group
  const handleCreateGroup = async () => {
    await validateAdminStatus() // Validate status before performing action
    setErrorMessage("")
    setSuccessMessage("")
    try {
      await axios.post("http://localhost:3000/creategroup", { group: newGroup })
      showMessageWithTimeout(setSuccessMessage, "Group created successfully.")
      fetchGroups()
      setNewGroup("")
    } catch (error) {
      const backendMessage = error.response?.data?.details?.[0]?.msg || "Error creating group."
      showMessageWithTimeout(setErrorMessage, backendMessage)
    }
  }

  // Create new user
  const handleCreateUser = async () => {
    await validateAdminStatus() // Validate status before performing action
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const groups = newUser.group.map(option => (typeof option === "string" ? option : option.value))
      await axios.post("http://localhost:3000/createuser", { ...newUser, group: groups })
      showMessageWithTimeout(setSuccessMessage, "User created successfully.")
      fetchUsers()
      setNewUser({ username: "", email: "", password: "", group: [], accountStatus: "Active" })
    } catch (error) {
      const backendMessage = error.response?.data?.details?.[0]?.msg || "Error creating user."
      showMessageWithTimeout(setErrorMessage, backendMessage)
    }
  }

  // Handles group selection change
  const handleGroupChange = selectedOptions => {
    setEditFormData(prevData => ({
      ...prevData,
      groups: selectedOptions ? selectedOptions.map(option => option.value) : []
    }))
  }

  // Exits edit mode
  const handleCancelClick = () => {
    setEditingUser(null)
    setEditFormData({})
    setErrorMessage("")
  }

  // Updates editFormData as the user types
  const handleEditInputChange = e => {
    const { name, value } = e.target
    setEditFormData(prevData => ({ ...prevData, [name]: value || "" }))
  }

  // Main rendering with form and table structure
  return (
    <>
      <Header username={username} handleLogout={handleLogout} isAdmin={isAdmin} />
      <div className="user-management-container">
        <h2>User Management</h2>
        {successMessage && <div className="success-box">{successMessage}</div>}
        {errorMessage && <div className="error-box">{errorMessage}</div>}

        <div className="group-creation-section">
          <input type="text" placeholder="Enter group name" value={newGroup} onChange={e => setNewGroup(e.target.value || "")} />
          <button onClick={handleCreateGroup}>Create Group</button>
        </div>

        <div className="create-user-section">
          <input type="text" placeholder="Username*" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
          <input type="email" placeholder="Email (optional)" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
          <input type="password" placeholder="Password*" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
          <Select isMulti options={groups} value={newUser.group.map(group => ({ value: group, label: group }))} onChange={selectedOptions => setNewUser({ ...newUser, group: selectedOptions ? selectedOptions.map(option => option.value) : [] })} placeholder="Select Groups (optional)" />
          <select value={newUser.accountStatus} onChange={e => setNewUser({ ...newUser, accountStatus: e.target.value })}>
            <option value="Active">Active</option>
            <option value="Disabled">Disabled</option>
          </select>
          <button onClick={handleCreateUser}>Create User</button>
        </div>

        <table className="user-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Password</th>
              <th>Groups</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.username}>
                <td>{user.username}</td>
                <td>{editingUser === user.username ? <input type="text" name="email" value={editFormData.email || ""} onChange={handleEditInputChange} /> : user.email || ""}</td>
                <td>{editingUser === user.username ? <input type="password" name="password" value={editFormData.password || ""} onChange={handleEditInputChange} placeholder="Password" /> : "*".repeat(user.password.length)}</td>
                <td>{editingUser === user.username ? <Select isMulti value={(editFormData.groups || []).map(group => ({ value: group, label: group }))} options={groups} onChange={handleGroupChange} /> : (user.groups || []).join(", ") || ""}</td>
                <td>
                  {editingUser === user.username ? (
                    <select name="accountStatus" value={editFormData.accountStatus || "Active"} onChange={handleEditInputChange}>
                      <option value="Active">Active</option>
                      <option value="Disabled">Disabled</option>
                    </select>
                  ) : (
                    user.accountStatus
                  )}
                </td>
                <td>
                  {editingUser === user.username ? (
                    <>
                      <button onClick={() => handleSaveClick(user.username)}>Save</button>
                      <button onClick={handleCancelClick}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => handleEditClick(user)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default UserManagement

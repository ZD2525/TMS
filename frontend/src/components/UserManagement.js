import React, { useState, useEffect } from "react"
import axios from "axios"
import Select from "react-select"
import { useNavigate } from "react-router-dom"
import Header from "./Header"
import "../assets/styles/UserManagement.css"

axios.defaults.withCredentials = true

const UserManagement = ({ fetchUserProfile, isAdmin, username, handleLogout }) => {
  // State variables for user, group, and form data management
  const [users, setUsers] = useState([]) // List of all users
  const [groups, setGroups] = useState([]) // List of all groups
  const [newGroup, setNewGroup] = useState("") // Input value for creating a new group
  const [newUser, setNewUser] = useState({
    // Form data for creating a new user
    username: "",
    email: "",
    password: "",
    group: [],
    accountStatus: "Active"
  })
  const [editingUser, setEditingUser] = useState(null) // Stores the username of the user being edited
  const [editFormData, setEditFormData] = useState({}) // Form data for editing an existing user
  const [errorMessage, setErrorMessage] = useState("") // Error message displayed in the UI
  const [successMessage, setSuccessMessage] = useState("") // Success message displayed in the UI

  const navigate = useNavigate() // Navigation hook for programmatic redirection

  // Effect hook that runs on component mount and whenever `isAdmin` changes
  useEffect(() => {
    if (!isAdmin) {
      // Redirects non-admin users to the task management page
      console.log("Non-admin access detected. Redirecting...")
      navigate("/taskmanagementsystem")
      return
    }
    fetchUserProfile() // Fetches the current user profile to check session
    fetchUsers() // Fetches all users
    fetchGroups() // Fetches all groups
  }, [isAdmin, fetchUserProfile, navigate])

  // Fetches all users from the backend
  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:3000/usermanagement")
      setUsers(response.data || []) // Sets the user data in state
    } catch (error) {
      handleUnauthorizedAccess(error.response?.status) // Handles unauthorized access
    }
  }

  // Fetches all groups from the backend
  const fetchGroups = async () => {
    try {
      const response = await axios.get("http://localhost:3000/groups")
      // Maps each group to an object suitable for `react-select`
      setGroups(response.data?.map(group => ({ value: group, label: group })) || [])
    } catch (error) {
      handleUnauthorizedAccess(error.response?.status)
    }
  }

  // Handles redirection based on the error status
  const handleUnauthorizedAccess = status => {
    if (status === 401) {
      navigate("/login") // Redirects to login if user is unauthorized
    } else if (status === 403) {
      navigate("/taskmanagementsystem") // Redirects to task management if access is forbidden
    }
  }

  // Validates admin privileges and session status before performing actions
  const validateAdminStatus = async () => {
    try {
      const profile = await fetchUserProfile()

      if (!profile) {
        console.error("Profile data is missing or fetch failed.")
        navigate("/login") // Redirects to login if profile fetch fails
        return
      }

      if (!profile.isAdmin) {
        console.warn("User no longer has admin privileges. Redirecting...")
        navigate("/taskmanagementsystem")
        return
      }

      if (profile.accountStatus !== "Active") {
        console.warn("User account is disabled. Redirecting to login...")
        navigate("/login")
      }
    } catch (error) {
      console.error("Error validating admin status:", error)
      navigate("/login")
    }
  }

  // Displays a message temporarily using a timeout
  const showMessageWithTimeout = (setterFunction, message, duration = 2000) => {
    setterFunction(message)
    setTimeout(() => {
      setterFunction("")
    }, duration)
  }

  // Initiates edit mode for a selected user and populates the edit form data
  const handleEditClick = async user => {
    await validateAdminStatus()
    try {
      // Fetches details of the selected user
      const response = await axios.post("http://localhost:3000/get-user", { username: user.username })
      if (response.data) {
        setEditingUser(user.username) // Sets the current user in edit mode
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

  // Saves the edited user details to the backend
  const handleSaveClick = async username => {
    await validateAdminStatus()
    const payload = {
      username,
      email: editFormData.email || "",
      accountStatus: editFormData.accountStatus,
      groups: editFormData.groups
    }

    if (editFormData.password) {
      payload.password = editFormData.password // Adds password if it's updated
    }

    try {
      await axios.put("http://localhost:3000/update-user", payload)
      showMessageWithTimeout(setSuccessMessage, "User updated successfully.")
      await fetchUsers() // Refreshes the user list after saving
      setEditingUser(null) // Exits edit mode
      setEditFormData({})
    } catch (error) {
      // Check if there is a validation error
      const backendErrors = error.response?.data?.details
      if (backendErrors && backendErrors.length > 0) {
        // Extract each error message and join them
        const errorMessage = backendErrors.map(err => err.msg).join(" ")
        showMessageWithTimeout(setErrorMessage, errorMessage)
      } else {
        const backendMessage = error.response?.data?.error || "An error occurred while updating the user."
        showMessageWithTimeout(setErrorMessage, backendMessage)
      }
    }
  }

  // Handles `Enter` key events to trigger actions
  const handleKeyDown = (event, action) => {
    if (event.key === "Enter") {
      action()
    }
  }

  // Creates a new group by sending data to the backend
  const handleCreateGroup = async () => {
    await validateAdminStatus()
    setErrorMessage("")
    setSuccessMessage("")
    try {
      await axios.post("http://localhost:3000/create-group", { group: newGroup })
      showMessageWithTimeout(setSuccessMessage, "Group created successfully.")
      fetchGroups() // Refreshes the group list
      setNewGroup("") // Clears the input
    } catch (error) {
      const backendMessage = error.response?.data?.details?.[0]?.msg || "Error creating group."
      showMessageWithTimeout(setErrorMessage, backendMessage)
    }
  }

  // Creates a new user by sending form data to the backend
  const handleCreateUser = async () => {
    await validateAdminStatus()
    setErrorMessage("")
    setSuccessMessage("")

    try {
      // Converts group options to an array of strings
      const groups = newUser.group.map(option => (typeof option === "string" ? option : option.value))

      await axios.post("http://localhost:3000/usermanagement", {
        ...newUser,
        group: groups
      })

      showMessageWithTimeout(setSuccessMessage, "User created successfully.")
      fetchUsers() // Refreshes the user list
      // Resets the form fields
      setNewUser({ username: "", email: "", password: "", group: [], accountStatus: "Active" })
    } catch (error) {
      const backendMessage = error.response?.data?.details?.[0]?.msg || "Error creating user."
      showMessageWithTimeout(setErrorMessage, backendMessage)
    }
  }

  // Updates `editFormData.groups` when group selection changes
  const handleGroupChange = selectedOptions => {
    setEditFormData(prevData => ({
      ...prevData,
      groups: selectedOptions ? selectedOptions.map(option => option.value) : []
    }))
  }

  // Exits edit mode without saving changes
  const handleCancelClick = () => {
    setEditingUser(null)
    setEditFormData({})
    setErrorMessage("")
  }

  // Updates `editFormData` as the user types in edit fields
  const handleEditInputChange = e => {
    const { name, value } = e.target
    setEditFormData(prevData => ({
      ...prevData,
      [name]: value || ""
    }))
  }

  // Main component rendering with form and table structure
  return (
    <>
      <Header username={username} isAdmin={isAdmin} handleLogout={handleLogout} />
      <div className="user-management-container">
        <h2>User Management</h2>
        {successMessage && <div className="success-box">{successMessage}</div>}
        {errorMessage && <div className="error-box">{errorMessage}</div>}

        <div className="group-creation-section">
          <input type="text" placeholder="Enter group name" value={newGroup} onChange={e => setNewGroup(e.target.value || "")} onKeyDown={e => handleKeyDown(e, handleCreateGroup)} />
          <button onClick={handleCreateGroup} disabled={!isAdmin}>
            Create Group
          </button>
        </div>

        {isAdmin && (
          <div className="create-user-section">
            <input type="text" placeholder="Username*" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} onKeyDown={e => handleKeyDown(e, handleCreateUser)} />
            <input type="email" placeholder="Email (optional)" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} onKeyDown={e => handleKeyDown(e, handleCreateUser)} />
            <input type="password" placeholder="Password*" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} onKeyDown={e => handleKeyDown(e, handleCreateUser)} />
            <Select
              isMulti
              options={groups}
              value={newUser.group.map(group => ({ value: group, label: group }))}
              onChange={selectedOptions =>
                setNewUser({
                  ...newUser,
                  group: selectedOptions ? selectedOptions.map(option => option.value) : []
                })
              }
              placeholder="Select Groups (optional)"
            />
            <select value={newUser.accountStatus} onChange={e => setNewUser({ ...newUser, accountStatus: e.target.value })} onKeyDown={e => handleKeyDown(e, handleCreateUser)}>
              <option value="Active">Active</option>
              <option value="Disabled">Disabled</option>
            </select>
            <button onClick={handleCreateUser}>Create User</button>
          </div>
        )}

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
                      <button onClick={() => handleSaveClick(user.username)} disabled={!isAdmin}>
                        Save
                      </button>
                      <button onClick={handleCancelClick}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => handleEditClick(user)} disabled={!isAdmin}>
                      Edit
                    </button>
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

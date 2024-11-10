import React, { useState, useEffect } from "react"
import axios from "axios"
import Select from "react-select"
import { useNavigate } from "react-router-dom"
import Header from "./Header"
import "../assets/styles/UserManagement.css"

axios.defaults.withCredentials = true

const UserManagement = ({ username, isAdmin, handleLogout, setIsAdmin, setIsAuthenticated }) => {
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [newGroup, setNewGroup] = useState("")
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    group: [],
    accountStatus: "Active"
  })
  const [editingUser, setEditingUser] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const navigate = useNavigate()

  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log("Fetching users and groups on initialization.")
        await fetchUsers()
        await fetchGroups()
      } catch (error) {
        console.error("Error during initialization:", error)
        if (error.response?.status === 401) {
          console.log("User not authenticated, navigating to /login.")
          setIsAuthenticated(false)
          navigate("/login")
        } else if (error.response?.status === 403) {
          console.log("User does not have admin access, navigating to /taskmanagementsystem.")
          setIsAdmin(false)
          navigate("/taskmanagementsystem")
        } else {
          console.error("Failed to initialize data:", error)
        }
      }
    }
    initializeData()
  }, [navigate, setIsAuthenticated])

  const fetchUsers = async () => {
    try {
      console.log("Fetching users from API.")
      const response = await axios.get("http://localhost:3000/getallusers")
      setUsers(response.data || [])
      console.log("Users fetched successfully:", response.data)
    } catch (error) {
      console.error("Error fetching users:", error)
      if (error.response?.status === 401) {
        console.log("User not authenticated, navigating to /login.")
        setIsAuthenticated(false)
        navigate("/login")
      } else if (error.response?.status === 403) {
        console.log("User does not have admin access, navigating to /taskmanagementsystem.")
        setIsAdmin(false)
        navigate("/taskmanagementsystem")
      }
    }
  }

  const fetchGroups = async () => {
    try {
      console.log("Fetching groups from API.")
      const response = await axios.get("http://localhost:3000/groups")
      setGroups(response.data?.map(group => ({ value: group, label: group })) || [])
      console.log("Groups fetched successfully:", response.data)
    } catch (error) {
      console.error("Error fetching groups:", error)
      if (error.response?.status === 401) {
        console.log("User not authenticated, navigating to /login.")
        setIsAuthenticated(false)
        navigate("/login")
      } else if (error.response?.status === 403) {
        console.log("User does not have admin access, navigating to /taskmanagementsystem.")
        setIsAdmin(false)
        navigate("/taskmanagementsystem")
      }
    }
  }

  const showMessageWithTimeout = (setterFunction, message, duration = 2000) => {
    console.log("Displaying message:", message)
    setterFunction(message)
    setTimeout(() => {
      setterFunction("")
    }, duration)
  }

  const handleEditClick = user => {
    console.log("Editing user:", user)
    const { username, email, accountStatus, groups } = user
    setEditingUser(username)
    setEditFormData({
      email: email || "",
      accountStatus: accountStatus || "Active",
      groups: groups || [],
      password: ""
    })
    setErrorMessage("")
    setSuccessMessage("")
  }

  const handleSaveClick = async username => {
    console.log("Saving edits for user:", username)
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
      console.log("Sending update request for user:", payload)
      await axios.put("http://localhost:3000/updateuser", payload)
      showMessageWithTimeout(setSuccessMessage, "User updated successfully.")
      await fetchUsers()
      setEditingUser(null)
      setEditFormData({})
    } catch (error) {
      console.error("Error updating user:", error)
      if (error.response?.status === 401) {
        console.log("User not authenticated, navigating to /login.")
        setIsAuthenticated(false)
        navigate("/login")
      } else if (error.response?.status === 403) {
        console.log("User does not have admin access, navigating to /taskmanagementsystem.")
        setIsAdmin(false)
        navigate("/taskmanagementsystem")
      } else {
        const backendErrors = error.response?.data?.details || []
        const errorMessage = backendErrors.length > 0 ? backendErrors.map(err => err.msg).join(", ") : "Error updating user."
        showMessageWithTimeout(setErrorMessage, errorMessage)
      }
    }
  }

  const handleCreateUser = async () => {
    console.log("Creating new user:", newUser)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const groups = newUser.group.map(option => (typeof option === "string" ? option : option.value))
      console.log("Creating user with groups:", groups)
      await axios.post("http://localhost:3000/createuser", { ...newUser, group: groups })
      showMessageWithTimeout(setSuccessMessage, "User created successfully.")
      fetchUsers()
      setNewUser({ username: "", email: "", password: "", group: [], accountStatus: "Active" })
    } catch (error) {
      console.error("Error creating user:", error)
      if (error.response?.status === 401) {
        console.log("User not authenticated, navigating to /login.")
        setIsAuthenticated(false)
        navigate("/login")
      } else if (error.response?.status === 403) {
        console.log("User does not have admin access, navigating to /taskmanagementsystem.")
        setIsAdmin(false)
        navigate("/taskmanagementsystem")
      } else {
        const backendMessage = error.response?.data?.details?.[0]?.msg || "Error creating user."
        showMessageWithTimeout(setErrorMessage, backendMessage)
      }
    }
  }

  const handleCreateGroup = async () => {
    console.log("Creating new group:", newGroup)
    setErrorMessage("")
    setSuccessMessage("")
    try {
      await axios.post("http://localhost:3000/creategroup", { group: newGroup })
      showMessageWithTimeout(setSuccessMessage, "Group created successfully.")
      fetchGroups()
      setNewGroup("")
    } catch (error) {
      console.error("Error creating group:", error)
      if (error.response?.status === 401) {
        console.log("User not authenticated, navigating to /login.")
        setIsAuthenticated(false)
        navigate("/login")
      } else if (error.response?.status === 403) {
        console.log("User does not have admin access, navigating to /taskmanagementsystem.")
        setIsAdmin(false)
        navigate("/taskmanagementsystem")
      } else {
        const backendMessage = error.response?.data?.details?.[0]?.msg || "Error creating group."
        showMessageWithTimeout(setErrorMessage, backendMessage)
      }
    }
  }

  const handleGroupChange = selectedOptions => {
    console.log("Group change detected:", selectedOptions)
    setEditFormData(prevData => ({
      ...prevData,
      groups: selectedOptions ? selectedOptions.map(option => option.value) : []
    }))
  }

  const handleCancelClick = () => {
    console.log("Canceling edit.")
    setEditingUser(null)
    setEditFormData({})
    setErrorMessage("")
  }

  const handleEditInputChange = e => {
    const { name, value } = e.target
    console.log(`Input change detected: ${name} = ${value}`)
    setEditFormData(prevData => ({ ...prevData, [name]: value || "" }))
  }

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

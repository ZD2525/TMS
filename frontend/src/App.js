import React, { useState, useEffect, useCallback } from "react"
import { Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import TaskManagementSystem from "./components/TaskManagement"
import UserManagementSystem from "./components/UserManagement"
import Login from "./components/Login"
import Header from "./components/Header"
import EditProfile from "./components/EditProfile"
import NotFound from "./components/NotFound"

axios.defaults.withCredentials = true

const App = () => {
  const [username, setUsername] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)

  const location = useLocation()
  const navigate = useNavigate()

  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:3000/getprofile")
      setUsername(response.data.username)
      setUserProfile(response.data)
      setIsAuthenticated(true)
      return response.data
    } catch (err) {
      setIsAuthenticated(false)
      setUsername("")
      setUserProfile(null)
      navigate("/login")
      return null
    }
  }, [navigate])

  // Centralized account status validation
  const validateAccountStatus = useCallback(async () => {
    try {
      const profile = await fetchUserProfile()
      if (!profile) {
        handleLogout()
        return
      }
      if (profile.accountStatus !== "Active") {
        handleLogout()
      }
    } catch (error) {
      console.error("Error validating account status:", error)
      handleLogout()
    }
  }, [fetchUserProfile])

  useEffect(() => {
    if (location.pathname !== "/login") {
      fetchUserProfile().then(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [location.pathname, fetchUserProfile])

  const handleLogout = useCallback(async () => {
    try {
      await axios.post("http://localhost:3000/logout")
      setIsAuthenticated(false)
      setUsername("")
      setUserProfile(null)
      navigate("/login")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }, [navigate])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <>
      {isAuthenticated && <Header username={username} handleLogout={handleLogout} isAdmin={userProfile?.isAdmin} validateAccountStatus={validateAccountStatus} />}
      <div className="main-content">
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/taskmanagementsystem" /> : <Login fetchUserProfile={fetchUserProfile} />} />
          <Route path="/taskmanagementsystem" element={<TaskManagementSystem username={username} />} />
          <Route path="/usermanagement" element={isAuthenticated && userProfile?.isAdmin ? <UserManagementSystem fetchUserProfile={fetchUserProfile} username={username} isAdmin={userProfile?.isAdmin} handleLogout={handleLogout} validateAccountStatus={validateAccountStatus} /> : <Navigate to={isAuthenticated ? "/taskmanagementsystem" : "/login"} />} />
          <Route path="/editprofile" element={<EditProfile username={username} validateAccountStatus={validateAccountStatus} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  )
}

export default App

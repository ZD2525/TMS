import React, { useState, useEffect, useCallback } from "react"
import { Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import TaskManagementSystem from "./components/TaskManagement"
import AppPage from "./components/AppPage"
import UserManagementSystem from "./components/UserManagement"
import Login from "./components/Login"
import Header from "./components/Header"
import EditProfile from "./components/EditProfile"
import NotFound from "./components/NotFound"

axios.defaults.withCredentials = true

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const location = useLocation()
  const navigate = useNavigate()

  // Fetch user profile for displaying the username and determining admin status
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:3000/getprofile")
      if (!response.data.username) {
        throw new Error("User profile not found")
      }

      setUsername(response.data.username)
      setIsAuthenticated(true)

      // Check if user is admin
      try {
        const adminGroupCheck = await axios.post("http://localhost:3000/checkgroup", { group: "admin" })
        setIsAdmin(adminGroupCheck.data.success)
      } catch (err) {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error("Error fetching user profile:", error)
      setUsername("")
      setIsAdmin(false)
      setIsAuthenticated(false)
      navigate("/login")
    }
  }, [navigate])

  // Handle user logout
  const handleLogout = useCallback(async () => {
    try {
      await axios.post("http://localhost:3000/logout")
    } catch (error) {
      console.error("Logout failed:", error)
    } finally {
      setIsAuthenticated(false)
      setIsAdmin(false)
      setUsername("")
      navigate("/login")
    }
  }, [navigate])

  useEffect(() => {
    const initialize = async () => {
      if (location.pathname !== "/login") {
        try {
          await fetchUserProfile()
        } catch (error) {
          console.error("Failed to fetch user profile:", error)
        }
      }
      setIsLoading(false)
    }
    initialize()
  }, [location.pathname, fetchUserProfile])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <>
      {isAuthenticated && <Header username={username} handleLogout={handleLogout} isAdmin={isAdmin} />}
      <div className="main-content">
        <Routes>
          <Route path="/login" element={<Login onLoginSuccess={fetchUserProfile} />} />
          <Route path="/taskmanagementsystem" element={<TaskManagementSystem />} />
          <Route path="/app" element={<AppPage />} />
          <Route path="/usermanagement" element={isAuthenticated && isAdmin ? <UserManagementSystem handleLogout={handleLogout} username={username} isAdmin={isAdmin} setIsAdmin={setIsAdmin} setIsAuthenticated={setIsAuthenticated} /> : <Navigate to={isAuthenticated ? "/taskmanagementsystem" : "/login"} />} />
          <Route path="/editprofile" element={<EditProfile setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  )
}

export default App

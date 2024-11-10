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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const location = useLocation()
  const navigate = useNavigate()

  // Fetch user profile for displaying the username and determining admin status
  const fetchUserProfile = useCallback(async () => {
    console.log("Fetching user profile...")
    try {
      const response = await axios.get("http://localhost:3000/getprofile")
      console.log("User profile response:", response.data)

      if (!response.data.username) {
        throw new Error("User profile not found")
      }

      setUsername(response.data.username)
      setIsAuthenticated(true)

      // Additional group membership check
      try {
        const groupCheckResponse = await axios.post(
          "http://localhost:3000/checkgroup",
          { group: "admin" },
          {
            headers: {
              "Content-Type": "application/json"
            }
          }
        )
        console.log("Group check response:", groupCheckResponse.data)
        setIsAdmin(groupCheckResponse.data.success)
      } catch (groupCheckError) {
        console.warn("Failed to verify group membership:", groupCheckError)
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
      setIsAuthenticated(false) // Update state
      setIsAdmin(false)
      setUsername("")
      navigate("/login")
    }
  }, [navigate])

  // Effect to initialize session on app load
  useEffect(() => {
    const initialize = async () => {
      console.log("App component mounted. Initializing user session.")
      if (location.pathname !== "/login") {
        try {
          await fetchUserProfile()
          console.log("User profile fetched successfully.")
        } catch (error) {
          console.error("Failed to fetch user profile:", error)
        }
      }
      setIsLoading(false)
      console.log("Initialization complete.")
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
          <Route path="/usermanagement" element={isAuthenticated && isAdmin ? <UserManagementSystem handleLogout={handleLogout} username={username} isAdmin={isAdmin} setIsAdmin={setIsAdmin} setIsAuthenticated={setIsAuthenticated} /> : <Navigate to={isAuthenticated ? "/taskmanagementsystem" : "/login"} />} />
          <Route path="/editprofile" element={<EditProfile isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  )
}

export default App

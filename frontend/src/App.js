import React, { useState, useEffect, useCallback } from "react"
import { Route, Routes, Navigate, useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import TaskManagementSystem from "./components/TaskManagement"
import UserManagementSystem from "./components/UserManagement"
import Login from "./components/Login"
import Header from "./components/Header"
import EditProfile from "./components/EditProfile"
import NotFound from "./components/NotFound"

// Configures axios to include cookies with every request
axios.defaults.withCredentials = true

// Main App component definition
const App = () => {
  // State variables for managing user session, role, and loading state
  const [username, setUsername] = useState("") // Stores the logged-in username
  const [isAdmin, setIsAdmin] = useState(false) // Boolean to track admin status
  const [isAuthenticated, setIsAuthenticated] = useState(false) // Boolean to track authentication status
  const [isLoading, setIsLoading] = useState(true) // Boolean to indicate loading state

  const location = useLocation() // Hook to track the current route
  const navigate = useNavigate() // Hook for programmatic navigation

  // Fetches the user's profile and updates username, isAdmin, and authentication status
  const fetchUserProfile = useCallback(async () => {
    try {
      // Sends GET request to fetch profile information
      const response = await axios.get("http://localhost:3000/editprofile")
      setUsername(response.data.username) // Sets the username from response data
      setIsAdmin(response.data.isAdmin) // Sets the admin status from response data
      setIsAuthenticated(true) // Sets user as authenticated
      return response.data // Returns profile data for further use
    } catch (err) {
      console.warn("Failed to fetch user profile. Redirecting to login.")
      setIsAuthenticated(false) // Clears authentication status
      setIsAdmin(false) // Clears admin status
      setUsername("") // Clears username
      navigate("/login") // Redirects to login page
      return null
    }
  }, [navigate])

  // Checks authentication on page load and on route change
  useEffect(() => {
    if (location.pathname !== "/login") {
      // Fetches profile only if not on the login page
      fetchUserProfile().then(() => setIsLoading(false)) // Sets loading to false after fetching
    } else {
      setIsLoading(false) // Sets loading to false if on the login page
    }
  }, [location.pathname, fetchUserProfile]) // Re-runs on route change

  // Handles logout functionality
  const handleLogout = useCallback(async () => {
    try {
      await axios.post("http://localhost:3000/logout") // Sends POST request to logout
      setIsAuthenticated(false) // Clears authentication status
      setIsAdmin(false) // Clears admin status
      setUsername("") // Clears username
      navigate("/login") // Redirects to login page
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }, [navigate])

  // Shows a loading screen if the app is fetching the user's profile
  if (isLoading) {
    return <div>Loading...</div>
  }

  // Main rendering of the component
  return (
    <>
      {/* Conditionally renders Header component if the user is authenticated */}
      {isAuthenticated && <Header username={username} isAdmin={isAdmin} handleLogout={handleLogout} />}
      <div className="main-content">
        <Routes>
          {/* Root route that redirects based on authentication */}
          <Route path="/" element={isAuthenticated ? <Navigate to="/taskmanagementsystem" /> : <Navigate to="/login" />} />

          {/* Login route that redirects authenticated users to task management system */}
          <Route path="/login" element={isAuthenticated ? <Navigate to="/taskmanagementsystem" /> : <Login fetchUserProfile={fetchUserProfile} />} />

          {/* Task Management System route, accessible to all authenticated users */}
          <Route path="/taskmanagementsystem" element={<TaskManagementSystem username={username} />} />

          {/* User Management System route, restricted to admin users */}
          <Route path="/usermanagement" element={isAuthenticated && isAdmin ? <UserManagementSystem fetchUserProfile={fetchUserProfile} username={username} isAdmin={isAdmin} handleLogout={handleLogout} /> : <Navigate to={isAuthenticated ? "/taskmanagementsystem" : "/login"} />} />

          {/* Edit Profile route, accessible to authenticated users */}
          <Route path="/editprofile" element={<EditProfile username={username} />} />

          {/* Catch-all route for 404 pages */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  )
}

export default App

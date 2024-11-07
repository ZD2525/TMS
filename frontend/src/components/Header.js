import React, { useEffect } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import axios from "axios"
import "../assets/styles/Header.css"

// Header component definition
const Header = ({ username, isAdmin, handleLogout }) => {
  const navigate = useNavigate() // Navigation hook for programmatic redirection
  const location = useLocation() // Location hook to track the current route

  // Function to check the user's admin status and account status
  const checkAdminStatus = async () => {
    try {
      // Sends a GET request to the backend to check the account status
      const response = await axios.get("http://localhost:3000/getprofile")
      const { accountStatus } = response.data

      // Logs the user out if their account is not active
      if (accountStatus !== "Active") {
        console.warn("Account disabled. Logging out.")
        handleLogout()
      }
    } catch (error) {
      // Handles unauthorized access (401 error) by logging out the user
      if (error.response && error.response.status === 401) {
        console.warn("Unauthorized access. Redirecting to login.")
        handleLogout()
      } else {
        // Logs other errors to the console
        console.error("Admin status check failed:", error)
      }
    }
  }

  // Effect hook that runs every time the route changes, triggering `checkAdminStatus`
  useEffect(() => {
    checkAdminStatus()
  }, [location.pathname]) // Dependency array includes `location.pathname` to re-run on route change

  // Main component rendering
  return (
    <div className="header">
      {/* Welcome message with the user's name, defaulting to "Guest" if not logged in */}
      <div className="welcome">Welcome, {username || "Guest"}</div>
      <nav>
        {/* Conditional rendering of admin-only link to the User Management System */}
        {isAdmin && (
          <>
            <Link to="/usermanagement" className={location.pathname === "/usermanagement" ? "active" : ""}>
              User Management System
            </Link>
            <span> | </span>
          </>
        )}
        {/* Link to the Task Management System, accessible to all users */}
        <Link to="/taskmanagementsystem" className={location.pathname === "/taskmanagementsystem" ? "active" : ""}>
          Task Management System
        </Link>
      </nav>
      <div className="header-buttons">
        {/* Profile button navigates to the Edit Profile page */}
        <button onClick={() => navigate("/editprofile")}>Profile</button>
        {/* Logout button triggers the `handleLogout` function to end the session */}
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  )
}

export default Header

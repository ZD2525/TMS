import React from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import "../assets/styles/Header.css"

const Header = ({ username, isAdmin, handleLogout, validateAccountStatus }) => {
  const navigate = useNavigate()
  const location = useLocation()

  // Handler for clicking on navigation links
  const handleNavClick = async path => {
    if (validateAccountStatus) {
      await validateAccountStatus() // Validate before navigating
    }
    navigate(path)
  }

  return (
    <div className="header">
      <div className="welcome">Welcome, {username || "Guest"}</div>
      <nav>
        {isAdmin && (
          <>
            <Link to="/usermanagement" className={location.pathname.startsWith("/usermanagement") ? "active" : ""} onClick={() => handleNavClick("/usermanagement")}>
              User Management System
            </Link>
            <span> | </span>
          </>
        )}
        <Link to="/taskmanagementsystem" className={location.pathname === "/taskmanagementsystem" ? "active" : ""} onClick={() => handleNavClick("/taskmanagementsystem")}>
          Task Management System
        </Link>
      </nav>
      <div className="header-buttons">
        <button onClick={() => handleNavClick("/editprofile")}>Profile</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  )
}

export default Header

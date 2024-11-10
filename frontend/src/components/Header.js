import React from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import "../assets/styles/Header.css"

const Header = ({ username, isAdmin, handleLogout }) => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="header">
      <div className="welcome">Welcome, {username || "Guest"}</div>
      <nav>
        {isAdmin && (
          <>
            <Link to="/usermanagement" className={location.pathname.startsWith("/usermanagement") ? "active" : ""}>
              User Management System
            </Link>
            <span> | </span>
          </>
        )}
        <Link to="/taskmanagementsystem" className={location.pathname === "/taskmanagementsystem" ? "active" : ""}>
          Task Management System
        </Link>
      </nav>
      <div className="header-buttons">
        <button onClick={() => navigate("/editprofile")}>Profile</button>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </div>
  )
}

export default Header

import React, { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import "../assets/styles/EditProfile.css"

axios.defaults.withCredentials = true

const EditProfile = ({ setIsAuthenticated }) => {
  const [currentEmail, setCurrentEmail] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [message, setMessage] = useState("")
  const [errorMessages, setErrorMessages] = useState([])

  const navigate = useNavigate()

  const handleUpdate = async () => {
    setErrorMessages([])
    setMessage("")

    try {
      const response = await axios.put("http://localhost:3000/updateprofile", {
        email: newEmail,
        newPassword
      })

      // Successful response handling
      setMessage(response.data.message) // Use the success message from the backend
      setCurrentEmail(newEmail || currentEmail)
      setNewEmail("")
      setNewPassword("")

      setTimeout(() => {
        setMessage("")
      }, 2000)
    } catch (error) {
      if (error.response?.status === 401) {
        setIsAuthenticated(false)
        navigate("/login")
      } else if (error.response?.data?.details) {
        // Use detailed error messages if available
        const messages = error.response.data.details.map(err => err.msg)
        setErrorMessages(messages)
      } else if (error.response?.data?.error) {
        // Handle single error message from backend
        setErrorMessages([error.response.data.error])
      } else {
        console.error("Error updating profile:", error)
        setErrorMessages(["An error occurred while updating the profile."])
      }

      setTimeout(() => {
        setErrorMessages([])
      }, 2000)
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get("http://localhost:3000/getprofile")
        setCurrentEmail(response.data.email || "No Email")
      } catch (error) {
        console.error("Error fetching profile:", error)
        if (error.response?.status === 401) {
          setIsAuthenticated(false)
          navigate("/login")
        }
      }
    }
    fetchProfile()
  }, [navigate, setIsAuthenticated])

  return (
    <div className="edit-profile-container">
      <h2>Update Info</h2>
      {message && <p className="message success-box">{message}</p>}
      {errorMessages.length > 0 && (
        <div className="error-box">
          <strong>Error:</strong>
          {errorMessages.map((msg, index) => (
            <span key={index}>
              {msg}
              {index < errorMessages.length - 1 ? ", " : ""}
            </span>
          ))}
        </div>
      )}
      <div className="form-group">
        <label>Current Email Address</label>
        <p className="email-display">{currentEmail}</p>
      </div>
      <div className="form-group">
        <label>New Email</label>
        <input type="text" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Enter new email" />
      </div>
      <div className="form-group">
        <label>New Password</label>
        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" />
      </div>
      <button className="update-button" onClick={handleUpdate}>
        Update
      </button>
    </div>
  )
}

export default EditProfile

import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import "../assets/styles/EditProfile.css"

axios.defaults.withCredentials = true

const EditProfile = ({ validateAccountStatus }) => {
  const [currentEmail, setCurrentEmail] = useState("") // Stores the current email address
  const [newEmail, setNewEmail] = useState("") // Stores the new email entered by the user
  const [newPassword, setNewPassword] = useState("") // Stores the new password entered by the user
  const [message, setMessage] = useState("") // Success message to display after updating profile
  const [errorMessages, setErrorMessages] = useState([]) // Array of error messages to display for validation issues

  const navigate = useNavigate() // Navigation hook for programmatic redirection

  // Fetches the user's current profile details on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get("http://localhost:3000/getprofile")
        setCurrentEmail(response.data.email || "No Email") // Sets the current email if available
      } catch (error) {
        console.error("Error fetching profile:", error)
        // Redirects to login if unauthorized access (status 401) is detected
        if (error.response && error.response.status === 401) {
          navigate("/login")
        }
      }
    }
    fetchProfile()
  }, [navigate])

  // Handles the update of profile information (email and/or password)
  const handleUpdate = async () => {
    // Validate account status before allowing the update
    await validateAccountStatus()

    setErrorMessages([]) // Clears any previous error messages
    setMessage("") // Clears any previous success message

    try {
      // Sends a PUT request to update the user's profile
      await axios.put("http://localhost:3000/updateprofile", {
        email: newEmail,
        newPassword
      })

      // Sets success message and updates current email if a new one was provided
      setMessage("Profile updated successfully")
      setCurrentEmail(newEmail || currentEmail) // Only updates if newEmail is not empty
      setNewEmail("") // Clears the new email input field
      setNewPassword("") // Clears the new password input field

      // Clears success message after 2 seconds
      setTimeout(() => {
        setMessage("")
      }, 2000)
    } catch (error) {
      // Handles validation or server errors and displays relevant messages
      if (error.response && error.response.status === 400) {
        if (error.response.data.error === "Validation failed") {
          // Sets validation error messages from the backend response
          setErrorMessages(error.response.data.details.map(detail => detail.msg))
        } else {
          setErrorMessages([error.response.data.error || "An error occurred while updating the profile."])
        }
      } else {
        console.error("Error updating profile:", error)
        setErrorMessages(["An error occurred while updating the profile."])
      }

      // Clears error messages after 2 seconds
      setTimeout(() => {
        setErrorMessages([])
      }, 2000)
    }
  }

  // Triggers `handleUpdate` when the Enter key is pressed in input fields
  const handleKeyPress = async event => {
    if (event.key === "Enter") {
      await validateAccountStatus()
      handleUpdate()
    }
  }

  // Main component rendering
  return (
    <div className="edit-profile-container">
      <h2>Update Info</h2>
      {message && <p className="message success-box">{message}</p>} {/* Displays success message if profile update is successful */}
      {/* Displays validation or error messages */}
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
      {/* Current email display */}
      <div className="form-group">
        <label>Current Email Address</label>
        <p className="email-display">{currentEmail}</p>
      </div>
      {/* New email input field */}
      <div className="form-group">
        <label>New Email</label>
        <input
          type="text"
          value={newEmail}
          onChange={e => setNewEmail(e.target.value)}
          placeholder="Enter new email"
          onKeyDown={handleKeyPress} // Triggers update on Enter key
        />
      </div>
      {/* New password input field */}
      <div className="form-group">
        <label>New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="Enter new password"
          onKeyDown={handleKeyPress} // Triggers update on Enter key
        />
      </div>
      {/* Update button triggers handleUpdate */}
      <button className="update-button" onClick={handleUpdate}>
        Update
      </button>
    </div>
  )
}

export default EditProfile

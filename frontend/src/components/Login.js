import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import "../assets/styles/Login.css"

// Enables sending cookies with every axios request
axios.defaults.withCredentials = true

// Login component definition
const Login = ({ fetchUserProfile }) => {
  // State variables for managing username, password, and error message
  const [loginUsername, setLoginUsername] = useState("") // Stores the entered username
  const [password, setPassword] = useState("") // Stores the entered password
  const [error, setError] = useState(null) // Stores any error messages

  const navigate = useNavigate() // Navigation hook for programmatic redirection

  // Function to handle the login form submission
  const handleLogin = async e => {
    e.preventDefault() // Prevents the default form submission behavior
    setError(null) // Clears any previous error message

    try {
      // Sends a POST request to the backend login endpoint
      const response = await axios.post("http://localhost:3000/login", {
        username: loginUsername,
        password
      })

      // If login is successful and user data is returned
      if (response.data.user) {
        await fetchUserProfile() // Fetches the user profile to update session info
        navigate("/taskmanagementsystem") // Redirects the user to the task management page
      } else {
        // Throws an error if user data is missing in the response
        throw new Error("User data not found in the response.")
      }
    } catch (err) {
      // Sets the error message in case of a login failure
      setError(err.response?.data?.error || "An error occurred during login.")
      console.error("Login failed:", err)
    }
  }

  // Main component rendering
  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <div className="error">{error}</div>} {/* Displays error message if login fails */}
      <form onSubmit={handleLogin} className="login-form">
        <div className="form-group">
          <label>Username</label>
          {/* Input field for the username */}
          <input type="text" className="login-input" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Password</label>
          {/* Input field for the password */}
          <input type="password" className="login-input" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <button type="submit" className="login-button">
          Log In
        </button>
      </form>
    </div>
  )
}

export default Login

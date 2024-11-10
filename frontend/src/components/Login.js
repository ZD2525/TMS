import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import "../assets/styles/Login.css"

axios.defaults.withCredentials = true

const Login = ({ onLoginSuccess }) => {
  // Accept onLoginSuccess as a prop
  const [loginUsername, setLoginUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState(null)
  const [showPassword, setShowPassword] = useState(false) // State to manage password visibility

  const navigate = useNavigate()

  const handleLogin = async e => {
    e.preventDefault()
    setError(null)

    try {
      const response = await axios.post("http://localhost:3000/login", {
        username: loginUsername,
        password
      })

      if (response.data) {
        // Fetch profile only if the login is successful
        await onLoginSuccess()
        navigate("/taskmanagementsystem")
      } else {
        throw new Error("User data not found in the response.")
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid Credentials.")
      console.error("Login failed:", err)
    }
  }

  return (
    <div className="login-container">
      <h2>Login</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleLogin} className="login-form">
        <div className="form-group">
          <label>Username</label>
          <input type="text" className="login-input" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <div className="password-input-container">
            <input
              type={showPassword ? "text" : "password"} // Toggles between text and password
              className="login-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)} // Toggle show/hide
              className="toggle-password-button"
            >
              {showPassword ? "Hide" : "Show"} {/* Changes button text */}
            </button>
          </div>
        </div>
        <button type="submit" className="login-button">
          Log In
        </button>
      </form>
    </div>
  )
}

export default Login

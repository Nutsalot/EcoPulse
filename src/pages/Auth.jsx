import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

function Auth() {
  const [isLogin, setIsLogin] = useState(true)

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")

  const [showPassword, setShowPassword] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  const [message, setMessage] =
    useState("")

  const [messageType, setMessageType] =
    useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()

    setLoading(true)
    setMessage("")
    setMessageType("")

    if (isLogin) {
      // =========================
      // LOGIN
      // =========================

      const {
        data,
        error,
      } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

      console.log(
        "LOGIN DATA:",
        data
      )

      console.log(
        "LOGIN ERROR:",
        error
      )

      if (error) {
        setMessage(
          error.message
        )

        setMessageType(
          "error"
        )
      } else {
        setMessage(
          "Login successful!"
        )

        setMessageType(
          "success"
        )
      }
    } else {
      // =========================
      // SIGN UP
      // =========================

      if (
        !fullName.trim()
      ) {
        setMessage(
          "Please enter your full name."
        )

        setMessageType(
          "error"
        )

        setLoading(false)

        return
      }

      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,

          options: {
            data: {
              full_name:
                fullName.trim(),
            },
          },
        })

      console.log(
        "SIGNUP DATA:",
        data
      )

      console.log(
        "SIGNUP ERROR:",
        error
      )

      if (error) {
        setMessage(
          error.message
        )

        setMessageType(
          "error"
        )
      } else {
        setMessage(
          "Account created successfully!"
        )

        setMessageType(
          "success"
        )

        setFullName("")
        setEmail("")
        setPassword("")
      }
    }

    setLoading(false)
  }

  const switchMode = () => {
    setIsLogin(
      !isLogin
    )

    setEmail("")
    setFullName("")
    setPassword("")
    setMessage("")
    setMessageType("")
    setShowPassword(false)
  }

  return (
    <div className="auth-page">

      {/* =========================
          LEFT BRAND PANEL
          ========================= */}

      <div className="auth-brand-panel">

        <div className="auth-brand-content">

          <div className="auth-logo">

            <div className="auth-logo-icon">
              🌿
            </div>

            <span>
              EcoPulse
            </span>

          </div>

          <div className="auth-brand-main">

            <div className="auth-small-label">
              YOUR SUSTAINABILITY JOURNEY
            </div>

            <h1>
              Small actions.
              <br />
              <span>
                Meaningful impact.
              </span>
            </h1>

            <p>
              Track your everyday activities,
              understand your carbon footprint,
              and build more sustainable habits
              one step at a time.
            </p>

          </div>

          <div className="auth-impact-card">

            <div className="auth-impact-icon">
              🌍
            </div>

            <div>

              <strong>
                Make every choice count.
              </strong>

              <span>
                Your actions today shape
                the world of tomorrow.
              </span>

            </div>

          </div>

        </div>

        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />
        <div className="auth-decoration auth-decoration-three" />

      </div>

      {/* =========================
          RIGHT AUTH PANEL
          ========================= */}

      <div className="auth-form-panel">

        <div className="auth-form-container">

          {/* Mobile logo */}

          <div className="auth-mobile-logo">

            <div className="auth-logo-icon">
              🌿
            </div>

            <span>
              EcoPulse
            </span>

          </div>

          <div className="auth-form-header">

            <div className="auth-form-eyebrow">
              {isLogin
                ? "WELCOME BACK"
                : "GET STARTED"}
            </div>

            <h2>
              {isLogin
                ? "Welcome back"
                : "Create your account"}
            </h2>

            <p>
              {isLogin
                ? "Sign in to continue your sustainability journey."
                : "Start tracking your environmental impact today."}
            </p>

          </div>

          <form
            className="auth-form"
            onSubmit={
              handleSubmit
            }
          >

            {/* FULL NAME */}

            {!isLogin && (
              <div className="auth-field">

                <label htmlFor="fullName">
                  Full Name
                </label>

                <div className="auth-input-wrapper">

                  <span className="auth-input-icon">
                    👤
                  </span>

                  <input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={
                      fullName
                    }
                    onChange={(e) =>
                      setFullName(
                        e.target.value
                      )
                    }
                    required
                  />

                </div>

              </div>
            )}

            {/* EMAIL */}

            <div className="auth-field">

              <label htmlFor="email">
                Email Address
              </label>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  ✉️
                </span>

                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={
                    email
                  }
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  required
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div className="auth-field">

              <label htmlFor="password">
                Password
              </label>

              <div className="auth-input-wrapper">

                <span className="auth-input-icon">
                  🔒
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder={
                    isLogin
                      ? "Enter your password"
                      : "Create a password"
                  }
                  value={
                    password
                  }
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  required
                  minLength={
                    6
                  }
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword
                    ? "🙈"
                    : "👁️"}
                </button>

              </div>

              {!isLogin && (
                <span className="auth-helper">
                  Use at least 6 characters.
                </span>
              )}

            </div>

            {/* MESSAGE */}

            {message && (
              <div
                className={
                  messageType ===
                  "success"
                    ? "auth-message success"
                    : "auth-message error"
                }
              >
                <span>
                  {messageType ===
                  "success"
                    ? "✓"
                    : "!"}
                </span>

                <p>
                  {message}
                </p>

              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={
                loading
              }
            >
              {loading
                ? isLogin
                  ? "Signing in..."
                  : "Creating account..."
                : isLogin
                ? "Sign In"
                : "Create Account"}

              {!loading && (
                <span>
                  →
                </span>
              )}
            </button>

          </form>

          {/* SWITCH */}

          <div className="auth-switch">

            <span>
              {isLogin
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>

            <button
              type="button"
              onClick={
                switchMode
              }
            >
              {isLogin
                ? "Create one"
                : "Sign in"}
            </button>

          </div>

          <div className="auth-footer">

            <span>
              🌱
            </span>

            <span>
              Building a more sustainable
              future, one action at a time.
            </span>

          </div>

        </div>

      </div>

    </div>
  )
}

export default Auth
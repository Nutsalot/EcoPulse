import { useEffect, useState } from "react"
import Dashboard from "./pages/Dashboard"
import AddActivity from "./pages/AddActivity"
import Goals from "./pages/Goals"
import Auth from "./pages/Auth"
import { supabase } from "./lib/supabaseClient"
import "./ecopulse.css"

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState("dashboard")
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)

        if (!session) {
          setPage("dashboard")
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error("LOGOUT ERROR:", error)
      setLoggingOut(false)
      return
    }

    setSession(null)
    setPage("dashboard")
    setLoggingOut(false)
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!session) {
    return <Auth />
  }

  return (
    <div>

      {/* =========================
          NAVBAR
          ========================= */}

      <nav className="navbar">

        <div
          className="navbar-brand"
          onClick={() =>
            setPage("dashboard")
          }
        >
          <span className="brand-icon">
            🌿
          </span>

          <span>
            EcoPulse
          </span>
        </div>

        <div className="nav-links">

          <button
            className={
              page === "dashboard"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              setPage("dashboard")
            }
          >
            Dashboard
          </button>

          <button
            className={
              page === "add-activity"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              setPage("add-activity")
            }
          >
            Activities
          </button>

          <button
            className={
              page === "goals"
                ? "nav-link active"
                : "nav-link"
            }
            onClick={() =>
              setPage("goals")
            }
          >
            Goals
          </button>

        </div>

        <div className="navbar-user">

          <div className="navbar-avatar">
            {session.user.email
              ?.charAt(0)
              .toUpperCase()}
          </div>

          <span>
            {session.user.email}
          </span>

          <button
            className="logout-button"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            {loggingOut
              ? "Logging out..."
              : "Logout"}
          </button>

        </div>

      </nav>

      {/* =========================
          PAGES
          ========================= */}

      {page === "dashboard" && (
        <Dashboard />
      )}

      {page === "add-activity" && (
        <div className="page-container">
          <AddActivity />
        </div>
      )}

      {page === "goals" && (
        <div className="page-container">
          <Goals />
        </div>
      )}

    </div>
  )
}

export default App
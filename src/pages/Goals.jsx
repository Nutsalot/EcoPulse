import { useEffect, useState } from "react"
import { supabase } from "../lib/supabaseClient"

function Goals() {
  const [goals, setGoals] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [targetValue, setTargetValue] = useState("")
  const [unit, setUnit] = useState("kg CO₂")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { data: goalData, error: goalError } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (goalError) {
      console.error("GOAL ERROR:", goalError)
    } else {
      setGoals(goalData || [])
    }

    const { data: activityData, error: activityError } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)

    if (activityError) {
      console.error("ACTIVITY ERROR:", activityError)
    } else {
      setActivities(activityData || [])
    }

    setLoading(false)
  }

  const createGoal = async (e) => {
    e.preventDefault()

    if (!title.trim() || !targetValue || Number(targetValue) <= 0) {
      setMessage("Please enter a valid goal title and target.")
      return
    }

    setSaving(true)
    setMessage("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("You must be logged in.")
      setSaving(false)
      return
    }

    const { error } = await supabase.from("goals").insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      target_value: Number(targetValue),
      current_value: 0,
      unit,
    })

    if (error) {
      console.error("CREATE GOAL ERROR:", error)
      setMessage(error.message)
    } else {
      setTitle("")
      setDescription("")
      setTargetValue("")
      setUnit("kg CO₂")
      setMessage("Goal created successfully!")
      await loadData()
    }

    setSaving(false)
  }

  const getCurrentValue = (goal) => {
    if (goal.unit === "kg CO₂") {
      return activities.reduce(
        (total, activity) =>
          total + Number(activity.carbon_kg || 0),
        0
      )
    }

    if (goal.unit === "km") {
      return activities
        .filter((activity) => activity.unit === "km")
        .reduce(
          (total, activity) =>
            total + Number(activity.quantity || 0),
          0
        )
    }

    if (goal.unit === "kWh") {
      return activities
        .filter((activity) => activity.unit === "kWh")
        .reduce(
          (total, activity) =>
            total + Number(activity.quantity || 0),
          0
        )
    }

    if (goal.unit === "meals") {
      return activities
        .filter((activity) => activity.unit === "meals")
        .reduce(
          (total, activity) =>
            total + Number(activity.quantity || 0),
          0
        )
    }

    return 0
  }

  const calculateProgress = (goal) => {
    const current = getCurrentValue(goal)
    const target = Number(goal.target_value || 1)

    return Math.min((current / target) * 100, 100)
  }

  if (loading) {
    return <div>Loading goals...</div>
  }

  return (
    <div className="goals-page">
      <div className="goals-container">

        {/* Header */}
        <div className="goals-header">
          <div>
            <div className="goals-eyebrow">YOUR TARGETS</div>
            <h1>Environmental Goals</h1>
            <p>
              Set targets and track your progress toward a more sustainable
              lifestyle.
            </p>
          </div>

          <div className="goals-header-icon">🎯</div>
        </div>

        {/* Create Goal */}
        <section className="goal-create-card">
          <div className="goal-section-title">
            <span>✨</span>
            <div>
              <h2>Create a Goal</h2>
              <p>Choose something you want to track.</p>
            </div>
          </div>

          <form onSubmit={createGoal}>

            <div className="goal-form-grid">

              <div className="goal-form-group">
                <label>Goal Title</label>

                <input
                  type="text"
                  placeholder="e.g. Keep carbon below 20 kg"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="goal-form-group">
                <label>Target Value</label>

                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 20"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  className="form-input"
                />
              </div>

            </div>

            <div className="goal-form-group">
              <label>Description</label>

              <input
                type="text"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="goal-form-bottom">

              <div className="goal-form-group unit-group">
                <label>Measure</label>

                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="form-input"
                >
                  <option value="kg CO₂">Carbon (kg CO₂)</option>
                  <option value="km">Distance (km)</option>
                  <option value="kWh">Energy (kWh)</option>
                  <option value="meals">Meals</option>
                </select>
              </div>

              <button
                type="submit"
                className="create-goal-button"
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Goal"}
              </button>

            </div>

          </form>

          {message && (
            <div className="goal-message">
              {message}
            </div>
          )}
        </section>

        {/* Goals */}
        <section className="goals-list-section">

          <div className="goals-list-header">
            <div>
              <h2>Your Goals</h2>
              <p>
                {goals.length === 0
                  ? "No goals created yet."
                  : `${goals.length} goal${
                      goals.length === 1 ? "" : "s"
                    } being tracked`}
              </p>
            </div>
          </div>

          {goals.length === 0 ? (
            <div className="empty-goals">
              <div>🌱</div>
              <h3>No goals yet</h3>
              <p>
                Create your first environmental goal above and start tracking
                your progress.
              </p>
            </div>
          ) : (
            <div className="goals-grid">

              {goals.map((goal) => {
                const currentValue = getCurrentValue(goal)
                const progress = calculateProgress(goal)
                const completed = progress >= 100

                return (
                  <div
                    key={goal.id}
                    className={
                      completed
                        ? "goal-card completed"
                        : "goal-card"
                    }
                  >

                    <div className="goal-card-top">

                      <div className="goal-icon">
                        {completed ? "🏆" : "🎯"}
                      </div>

                      {completed && (
                        <span className="completed-badge">
                          Completed
                        </span>
                      )}

                    </div>

                    <h3>{goal.title}</h3>

                    {goal.description && (
                      <p className="goal-description">
                        {goal.description}
                      </p>
                    )}

                    <div className="goal-values">

                      <div>
                        <strong>
                          {currentValue.toFixed(2)}
                        </strong>

                        <span>
                          / {Number(goal.target_value).toFixed(2)}{" "}
                          {goal.unit}
                        </span>
                      </div>

                      <strong className="goal-percentage">
                        {progress.toFixed(0)}%
                      </strong>

                    </div>

                    <div className="goal-progress">
                      <div
                        className="goal-progress-fill"
                        style={{
                          width: `${progress}%`,
                        }}
                      />
                    </div>

                    <p className="goal-status">
                      {completed
                        ? "🎉 Goal reached!"
                        : `${Math.max(
                            Number(goal.target_value) - currentValue,
                            0
                          ).toFixed(2)} ${goal.unit} remaining`}
                    </p>

                  </div>
                )
              })}

            </div>
          )}

        </section>

      </div>
    </div>
  )
}

export default Goals
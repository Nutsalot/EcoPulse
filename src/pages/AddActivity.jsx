import { useState } from "react"
import { supabase } from "../lib/supabaseClient"

function AddActivity() {
  const [category, setCategory] = useState("Transport")
  const [activityType, setActivityType] = useState("Car")
  const [quantity, setQuantity] = useState("")
  const [activityDate, setActivityDate] = useState(
  new Date().toISOString().split("T")[0]
)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState("")

  const calculateCarbon = () => {
    const value = Number(quantity)

    if (!value || value <= 0) {
      return 0
    }

    // Demo emission factors
    if (category === "Transport") {
      if (activityType === "Car") return value * 0.192
      if (activityType === "Bike") return value * 0.103
      if (activityType === "Bus") return value * 0.089
      if (activityType === "Train") return value * 0.041
    }

    if (category === "Energy") {
      return value * 0.82
    }

    if (category === "Food") {
      if (activityType === "Meat") return value * 5
      if (activityType === "Vegetarian") return value * 1.5
    }

    return 0
  }

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory)

    if (newCategory === "Transport") {
      setActivityType("Car")
    }

    if (newCategory === "Energy") {
      setActivityType("Electricity")
    }

    if (newCategory === "Food") {
      setActivityType("Meat")
    }

    setMessage("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!quantity || Number(quantity) <= 0) {
      setMessage("Please enter a valid quantity.")
      setMessageType("error")
      return
    }

    setLoading(true)
    setMessage("")

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setMessage("You must be logged in.")
      setMessageType("error")
      setLoading(false)
      return
    }

    const carbon = calculateCarbon()

    let unit = "km"

    if (category === "Energy") {
      unit = "kWh"
    }

    if (category === "Food") {
      unit = "meals"
    }

    const { error } = await supabase
  .from("activities")
  .insert({
    user_id: user.id,
    activity_type: activityType,
    category: category,
    quantity: Number(quantity),
    unit: unit,
    carbon_kg: carbon,
    activity_date: activityDate,
  })

    if (error) {
      console.error("ACTIVITY ERROR:", error)
      setMessage(error.message)
      setMessageType("error")
    } else {
      setMessage(
        `Activity saved successfully! Estimated emissions: ${carbon.toFixed(
          2
        )} kg CO₂e`
      )
      setMessageType("success")
      setQuantity("")
      setActivityDate(new Date().toISOString().split("T")[0])
    }

    setLoading(false)
  }

  const estimatedCarbon = calculateCarbon()

  return (
    <div className="activity-page">
      <div className="activity-card">
        <div className="activity-header">
          <div>
            <div className="activity-eyebrow">CARBON TRACKER</div>
            <h1>Add Activity</h1>
            <p>
              Record your daily activity and estimate its environmental impact.
            </p>
          </div>

          <div className="activity-header-icon">🌱</div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Category */}
          <div className="form-group">
            <label>Activity Category</label>

            <div className="category-selector">
              <button
                type="button"
                className={
                  category === "Transport"
                    ? "category-option selected"
                    : "category-option"
                }
                onClick={() => handleCategoryChange("Transport")}
              >
                🚗
                <span>Transport</span>
              </button>

              <button
                type="button"
                className={
                  category === "Energy"
                    ? "category-option selected"
                    : "category-option"
                }
                onClick={() => handleCategoryChange("Energy")}
              >
                ⚡
                <span>Energy</span>
              </button>

              <button
                type="button"
                className={
                  category === "Food"
                    ? "category-option selected"
                    : "category-option"
                }
                onClick={() => handleCategoryChange("Food")}
              >
                🍽️
                <span>Food</span>
              </button>
            </div>
          </div>

<div className="form-group">
  <label htmlFor="activityDate">
    Activity Date
  </label>

  <input
    id="activityDate"
    type="date"
    value={activityDate}
    max={new Date().toISOString().split("T")[0]}
    onChange={(e) => setActivityDate(e.target.value)}
    className="form-input"
    required
  />
</div>

          {/* Activity Type */}
          <div className="form-group">
            <label htmlFor="activityType">Activity Type</label>

            <select
              id="activityType"
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="form-input"
            >
              {category === "Transport" && (
                <>
                  <option value="Car">Car</option>
                  <option value="Bike">Motorcycle</option>
                  <option value="Bus">Bus</option>
                  <option value="Train">Train</option>
                </>
              )}

              {category === "Energy" && (
                <option value="Electricity">Electricity</option>
              )}

              {category === "Food" && (
                <>
                  <option value="Meat">Meat-based meal</option>
                  <option value="Vegetarian">Vegetarian meal</option>
                </>
              )}
            </select>
          </div>

          {/* Quantity */}
          <div className="form-group">
            <label htmlFor="quantity">
              Quantity{" "}
              <span className="unit-hint">
                ({category === "Transport"
                  ? "kilometres"
                  : category === "Energy"
                  ? "kWh"
                  : "meals"})
              </span>
            </label>

            <input
              id="quantity"
              type="number"
              min="0"
              step="0.1"
              placeholder={
                category === "Transport"
                  ? "e.g. 25"
                  : category === "Energy"
                  ? "e.g. 8"
                  : "e.g. 1"
              }
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {/* Estimate */}
          <div className="carbon-estimate">
            <div>
              <span>Estimated carbon footprint</span>
              <strong>
                {estimatedCarbon.toFixed(2)}{" "}
                <small>kg CO₂e</small>
              </strong>
            </div>

            <span className="estimate-icon">♻️</span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="save-activity-button"
            disabled={loading}
          >
            {loading ? "Saving Activity..." : "Save Activity"}
          </button>
        </form>

        {message && (
          <div
            className={
              messageType === "success"
                ? "activity-message success"
                : "activity-message error"
            }
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}

export default AddActivity
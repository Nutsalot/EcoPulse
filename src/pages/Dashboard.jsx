import { useEffect, useState } from "react"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { supabase } from "../lib/supabaseClient"

function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [activities, setActivities] = useState([])
  const [nudge, setNudge] = useState(null)
  const [nudgeResponse, setNudgeResponse] = useState("")
  const [loading, setLoading] = useState(true)

  const [activityToDelete, setActivityToDelete] =
    useState(null)

  const [activityToEdit, setActivityToEdit] =
    useState(null)

  const [editCategory, setEditCategory] =
    useState("Transport")

  const [editActivityType, setEditActivityType] =
    useState("Car")

  const [editQuantity, setEditQuantity] =
    useState("")

  const [editDate, setEditDate] =
    useState("")

  const [editLoading, setEditLoading] =
    useState(false)

  const [editMessage, setEditMessage] =
    useState("")

  const [dateRange, setDateRange] =
    useState("7")

  useEffect(() => {
    loadDashboard()
  }, [])

  // =========================
  // LOAD DASHBOARD
  // =========================

  const loadDashboard = async () => {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // PROFILE

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error(
        "PROFILE ERROR:",
        profileError
      )
    } else {
      setProfile(profileData)
    }

    // ACTIVITIES

    const {
      data: activityData,
      error: activityError,
    } = await supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })

    if (activityError) {
      console.error(
        "ACTIVITY ERROR:",
        activityError
      )
    } else {
      setActivities(
        activityData || []
      )
    }

    // NUDGES

    const {
      data: nudgeData,
      error: nudgeError,
    } = await supabase
      .from("nudges")
      .select("*")

    if (nudgeError) {
      console.error(
        "NUDGE ERROR:",
        nudgeError
      )
    }

    // NUDGE RESPONSE HISTORY

    const {
      data: responseData,
      error: responseError,
    } = await supabase
      .from("nudge_responses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })

    if (responseError) {
      console.error(
        "NUDGE RESPONSE HISTORY ERROR:",
        responseError
      )
    }

    if (
      nudgeData &&
      nudgeData.length > 0
    ) {
      const personalizedNudge =
        generatePersonalizedNudge(
          activityData || [],
          nudgeData,
          responseData || []
        )

      setNudge(
        personalizedNudge
      )
    }

    setLoading(false)
  }

  // =========================
  // PERSONALIZED NUDGE ENGINE
  // =========================

  const generatePersonalizedNudge = (
    activityData,
    nudgeData,
    responseData
  ) => {
    if (
      !nudgeData ||
      nudgeData.length === 0
    ) {
      return null
    }

    if (
      !activityData ||
      activityData.length === 0
    ) {
      return nudgeData[0]
    }

    const categoryStats = {
      Transport: {
        carbon: 0,
        count: 0,
      },

      Food: {
        carbon: 0,
        count: 0,
      },

      Energy: {
        carbon: 0,
        count: 0,
      },
    }

    activityData.forEach(
      (activity) => {
        if (
          categoryStats[
            activity.category
          ]
        ) {
          categoryStats[
            activity.category
          ].carbon += Number(
            activity.carbon_kg || 0
          )

          categoryStats[
            activity.category
          ].count += 1
        }
      }
    )

    const categories =
      Object.keys(
        categoryStats
      )

    const dominantCategory =
      categories.reduce(
        (
          highest,
          category
        ) => {
          const current =
            categoryStats[
              category
            ]

          const highestStats =
            categoryStats[
              highest
            ]

          if (
            current.carbon >
            highestStats.carbon
          ) {
            return category
          }

          if (
            current.carbon ===
              highestStats.carbon &&
            current.count >
              highestStats.count
          ) {
            return category
          }

          return highest
        },
        categories[0]
      )

    const activityFrequency = {}

    activityData.forEach(
      (activity) => {
        const key =
          activity.activity_type

        activityFrequency[
          key
        ] =
          (activityFrequency[
            key
          ] || 0) + 1
      }
    )

    const responseStats = {}

    responseData.forEach(
      (response) => {
        if (
          !responseStats[
            response.nudge_id
          ]
        ) {
          responseStats[
            response.nudge_id
          ] = {
            accepted: 0,
            declined: 0,
          }
        }

        if (
          response.response ===
          "accepted"
        ) {
          responseStats[
            response.nudge_id
          ].accepted += 1
        }

        if (
          response.response ===
          "declined"
        ) {
          responseStats[
            response.nudge_id
          ].declined += 1
        }
      }
    )

    const scoredNudges =
      nudgeData.map(
        (item) => {
          let score = 0

          if (
            item.category ===
            dominantCategory
          ) {
            score += 50
          }

          score +=
            Number(
              item.carbon_impact ||
                0
            ) * 5

          const matchingActivities =
            activityData.filter(
              (activity) =>
                activity.category ===
                  item.category &&
                activity.activity_type
                  .toLowerCase()
                  .includes(
                    item.target_behavior
                      ?.toLowerCase()
                      .split(
                        " "
                      )[0] || ""
                  )
            )

          if (
            matchingActivities.length >
            0
          ) {
            score +=
              matchingActivities.length *
              2
          }

          const history =
            responseStats[
              item.id
            ]

          if (history) {
            score +=
              history.accepted *
              8

            score -=
              history.declined *
              12
          }

          const recentlyShown =
            responseData
              .slice(0, 3)
              .some(
                (response) =>
                  response.nudge_id ===
                  item.id
              )

          if (
            recentlyShown
          ) {
            score -= 15
          }

          return {
            ...item,
            recommendationScore:
              score,
          }
        }
      )

    scoredNudges.sort(
      (a, b) =>
        b.recommendationScore -
        a.recommendationScore
    )

    return scoredNudges[0]
  }

  // =========================
  // CARBON CALCULATION
  // =========================

  const calculateCarbon = (
    category,
    activityType,
    quantity
  ) => {
    const value =
      Number(quantity)

    if (
      !value ||
      value <= 0
    ) {
      return 0
    }

    if (
      category ===
      "Transport"
    ) {
      if (
        activityType ===
        "Car"
      ) {
        return value * 0.192
      }

      if (
        activityType ===
        "Bike"
      ) {
        return value * 0.103
      }

      if (
        activityType ===
        "Bus"
      ) {
        return value * 0.089
      }

      if (
        activityType ===
        "Train"
      ) {
        return value * 0.041
      }
    }

    if (
      category ===
      "Energy"
    ) {
      return value * 0.82
    }

    if (
      category ===
      "Food"
    ) {
      if (
        activityType ===
        "Meat"
      ) {
        return value * 5
      }

      if (
        activityType ===
        "Vegetarian"
      ) {
        return value * 1.5
      }
    }

    return 0
  }

  // =========================
  // EDIT ACTIVITY
  // =========================

  const openEditActivity = (
    activity
  ) => {
    setActivityToEdit(
      activity
    )

    setEditCategory(
      activity.category
    )

    setEditActivityType(
      activity.activity_type
    )

    setEditQuantity(
      activity.quantity
    )

    setEditDate(
      activity.activity_date
    )

    setEditMessage("")
  }

  const handleEditCategoryChange = (
    category
  ) => {
    setEditCategory(
      category
    )

    if (
      category ===
      "Transport"
    ) {
      setEditActivityType(
        "Car"
      )
    }

    if (
      category ===
      "Energy"
    ) {
      setEditActivityType(
        "Electricity"
      )
    }

    if (
      category ===
      "Food"
    ) {
      setEditActivityType(
        "Meat"
      )
    }
  }

  const saveEditedActivity =
    async () => {
      if (
        !activityToEdit
      ) {
        return
      }

      if (
        !editQuantity ||
        Number(editQuantity) <=
          0
      ) {
        setEditMessage(
          "Please enter a valid quantity."
        )

        return
      }

      if (!editDate) {
        setEditMessage(
          "Please select an activity date."
        )

        return
      }

      setEditLoading(
        true
      )

      setEditMessage("")

      const carbon =
        calculateCarbon(
          editCategory,
          editActivityType,
          editQuantity
        )

      let unit = "km"

      if (
        editCategory ===
        "Energy"
      ) {
        unit = "kWh"
      }

      if (
        editCategory ===
        "Food"
      ) {
        unit = "meals"
      }

      const {
        data,
        error,
      } = await supabase
        .from("activities")
        .update({
          category:
            editCategory,

          activity_type:
            editActivityType,

          quantity:
            Number(
              editQuantity
            ),

          unit,

          carbon_kg:
            carbon,

          activity_date:
            editDate,
        })
        .eq(
          "id",
          activityToEdit.id
        )
        .select()
        .single()

      if (error) {
        console.error(
          "EDIT ACTIVITY ERROR:",
          error
        )

        setEditMessage(
          error.message
        )

        setEditLoading(
          false
        )

        return
      }

      setActivities(
        (
          currentActivities
        ) =>
          currentActivities.map(
            (activity) =>
              activity.id ===
              activityToEdit.id
                ? data
                : activity
          )
      )

      setActivityToEdit(
        null
      )

      setEditLoading(
        false
      )
    }

  // =========================
  // DELETE ACTIVITY
  // =========================

  const deleteActivity = (
    activityId
  ) => {
    setActivityToDelete(
      activityId
    )
  }

  const confirmDeleteActivity =
    async () => {
      if (
        !activityToDelete
      ) {
        return
      }

      const {
        error,
      } = await supabase
        .from("activities")
        .delete()
        .eq(
          "id",
          activityToDelete
        )

      if (error) {
        console.error(
          "DELETE ACTIVITY ERROR:",
          error
        )

        setActivityToDelete(
          null
        )

        return
      }

      setActivities(
        (
          currentActivities
        ) =>
          currentActivities.filter(
            (activity) =>
              activity.id !==
              activityToDelete
          )
      )

      setActivityToDelete(
        null
      )
    }

  // =========================
  // NUDGE RESPONSE
  // =========================

  const handleNudgeResponse =
    async (
      response
    ) => {
      if (!nudge) {
        return
      }

      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser()

      if (!user) {
        return
      }

      const {
        error,
      } = await supabase
        .from(
          "nudge_responses"
        )
        .insert({
          user_id:
            user.id,

          nudge_id:
            nudge.id,

          response,

          completed:
            response ===
            "accepted",
        })

      if (error) {
        console.error(
          "NUDGE RESPONSE ERROR:",
          error
        )

        setNudgeResponse(
          "Something went wrong. Please try again."
        )

        return
      }

      if (
        response ===
        "accepted"
      ) {
        setNudgeResponse(
          "Great choice! 🌱 Your action has been recorded."
        )
      } else {
        setNudgeResponse(
          "No problem. We'll suggest another action later."
        )
      }
    }

  // =========================
  // LOADING
  // =========================

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",

          display:
            "flex",

          alignItems:
            "center",

          justifyContent:
            "center",

          color:
            "#5f6d64",
        }}
      >
        Loading your EcoPulse dashboard...
      </div>
    )
  }

  // =========================
  // DATE FILTER
  // =========================

  const today =
    new Date()

  today.setHours(
    23,
    59,
    59,
    999
  )

  const filteredActivities =
    activities.filter(
      (activity) => {
        if (
          dateRange ===
          "all"
        ) {
          return true
        }

        const activityDate =
          new Date(
            `${activity.activity_date}T00:00:00`
          )

        const days =
          Number(
            dateRange
          )

        const startDate =
          new Date(
            today
          )

        startDate.setDate(
          startDate.getDate() -
            (days - 1)
        )

        startDate.setHours(
          0,
          0,
          0,
          0
        )

        return (
          activityDate >=
            startDate &&
          activityDate <=
            today
        )
      }
    )

  // =========================
  // CARBON TOTALS
  // =========================

  const totalCarbon =
    filteredActivities.reduce(
      (
        total,
        activity
      ) =>
        total +
        Number(
          activity.carbon_kg ||
            0
        ),
      0
    )

  const transportCarbon =
    filteredActivities
      .filter(
        (activity) =>
          activity.category ===
          "Transport"
      )
      .reduce(
        (
          total,
          activity
        ) =>
          total +
          Number(
            activity.carbon_kg ||
              0
          ),
        0
      )

  const foodCarbon =
    filteredActivities
      .filter(
        (activity) =>
          activity.category ===
          "Food"
      )
      .reduce(
        (
          total,
          activity
        ) =>
          total +
          Number(
            activity.carbon_kg ||
              0
          ),
        0
      )

  const energyCarbon =
    filteredActivities
      .filter(
        (activity) =>
          activity.category ===
          "Energy"
      )
      .reduce(
        (
          total,
          activity
        ) =>
          total +
          Number(
            activity.carbon_kg ||
              0
          ),
        0
      )

  // =========================
  // INSIGHT ENGINE
  // =========================

  const categoryCarbon = {
    Transport:
      transportCarbon,

    Food:
      foodCarbon,

    Energy:
      energyCarbon,
  }

  const categoryCounts = {
    Transport:
      filteredActivities.filter(
        (activity) =>
          activity.category ===
          "Transport"
      ).length,

    Food:
      filteredActivities.filter(
        (activity) =>
          activity.category ===
          "Food"
      ).length,

    Energy:
      filteredActivities.filter(
        (activity) =>
          activity.category ===
          "Energy"
      ).length,
  }

  const insightCategories =
    Object.keys(
      categoryCarbon
    )

  const dominantInsightCategory =
    insightCategories.reduce(
      (
        highest,
        category
      ) =>
        categoryCarbon[
          category
        ] >
        categoryCarbon[
          highest
        ]
          ? category
          : highest,
      "Transport"
    )

  const dominantCarbon =
    categoryCarbon[
      dominantInsightCategory
    ]

  const dominantPercentage =
    totalCarbon > 0
      ? Math.round(
          (dominantCarbon /
            totalCarbon) *
            100
        )
      : 0

  const activityTypeCounts = {}

  filteredActivities.forEach(
    (activity) => {
      activityTypeCounts[
        activity.activity_type
      ] =
        (activityTypeCounts[
          activity.activity_type
        ] || 0) + 1
    }
  )

  const mostFrequentActivity =
    Object.keys(
      activityTypeCounts
    ).length > 0
      ? Object.keys(
          activityTypeCounts
        ).reduce(
          (
            highest,
            type
          ) =>
            activityTypeCounts[
              type
            ] >
            activityTypeCounts[
              highest
            ]
              ? type
              : highest
        )
      : null

  const mostFrequentCount =
    mostFrequentActivity
      ? activityTypeCounts[
          mostFrequentActivity
        ]
      : 0

  const insightRangeLabel =
    dateRange === "1"
      ? "today"
      : dateRange === "7"
      ? "the last 7 days"
      : dateRange === "30"
      ? "the last 30 days"
      : "all time"

  const getOpportunityText =
    () => {
      if (
        filteredActivities.length ===
        0
      ) {
        return "Start recording activities to unlock personalized sustainability insights."
      }

      if (
        dominantInsightCategory ===
        "Transport"
      ) {
        return "Transport is your main recorded impact area. Shorter car trips or alternative transport could be areas to explore."
      }

      if (
        dominantInsightCategory ===
        "Food"
      ) {
        return "Food is your main recorded impact area. Choosing lower-impact meals could be an opportunity to reduce your footprint."
      }

      return "Energy is your main recorded impact area. Reducing unnecessary electricity use could be an opportunity to lower your footprint."
    }

  // =========================
  // CHART DATA
  // =========================

  const carbonData = [
    {
      name:
        "Transport",

      value:
        Number(
          transportCarbon.toFixed(
            2
          )
        ),
    },

    {
      name:
        "Food",

      value:
        Number(
          foodCarbon.toFixed(
            2
          )
        ),
    },

    {
      name:
        "Energy",

      value:
        Number(
          energyCarbon.toFixed(
            2
          )
        ),
    },
  ].filter(
    (item) =>
      item.value > 0
  )

  const carbonTrendData =
    Object.values(
      filteredActivities.reduce(
        (
          acc,
          activity
        ) => {
          const date =
            activity.activity_date

          if (
            !acc[date]
          ) {
            acc[date] = {
              date,
              carbon:
                0,
            }
          }

          acc[
            date
          ].carbon +=
            Number(
              activity.carbon_kg ||
                0
            )

          return acc
        },
        {}
      )
    ).sort(
      (a, b) =>
        a.date.localeCompare(
          b.date
        )
    )

  const chartDataWithRoundedValues =
    carbonTrendData.map(
      (item) => ({
        ...item,

        carbon:
          Number(
            item.carbon.toFixed(
              2
            )
          ),
      })
    )

  // =========================
  // DISPLAY VALUES
  // =========================

  const firstName =
    profile?.full_name
      ?.trim()
      ?.split(
        " "
      )[0] ||
    "there"

  const userInitial =
    profile?.full_name
      ?.trim()
      ?.charAt(
        0
      )
      .toUpperCase() ||
    "U"

  const activityCount =
    filteredActivities.length

  const maxActivityCount =
    10

  const activityProgress =
    Math.min(
      (activityCount /
        maxActivityCount) *
        100,
      100
    )

  const rangeLabel =
    dateRange ===
    "1"
      ? "today"
      : dateRange ===
        "7"
      ? "the last 7 days"
      : dateRange ===
        "30"
      ? "the last 30 days"
      : "all time"

  const formatDate =
    (
      dateString
    ) => {
      if (
        !dateString
      ) {
        return ""
      }

      const date =
        new Date(
          `${dateString}T00:00:00`
        )

      return date.toLocaleDateString(
        "en-US",
        {
          month:
            "short",

          day:
            "numeric",

          year:
            "numeric",
        }
      )
    }

  const pieColors = [
    "#2e8b57",
    "#70a77c",
    "#b7d8be",
  ]

  return (
    <div className="dashboard">

      {/* =========================
          HEADER
          ========================= */}

      <div className="dashboard-header">

        <div>

          <h1>
            Welcome back,{" "}
            {firstName} 👋
          </h1>

          <p>
            Here's your environmental
            impact overview.
          </p>

        </div>

        <div className="profile">

          <div className="profile-circle">
            {userInitial}
          </div>

        </div>

      </div>

      {/* =========================
          DATE FILTER
          ========================= */}

      <div className="date-filter-card">

        <div>

          <strong>
            Carbon overview
          </strong>

          <span>
            Track your footprint across
            different time periods
          </span>

        </div>

        <div className="date-filter-buttons">

          <button
            className={
              dateRange ===
              "1"
                ? "date-filter active"
                : "date-filter"
            }
            onClick={() =>
              setDateRange(
                "1"
              )
            }
          >
            Today
          </button>

          <button
            className={
              dateRange ===
              "7"
                ? "date-filter active"
                : "date-filter"
            }
            onClick={() =>
              setDateRange(
                "7"
              )
            }
          >
            7 Days
          </button>

          <button
            className={
              dateRange ===
              "30"
                ? "date-filter active"
                : "date-filter"
            }
            onClick={() =>
              setDateRange(
                "30"
              )
            }
          >
            30 Days
          </button>

          <button
            className={
              dateRange ===
              "all"
                ? "date-filter active"
                : "date-filter"
            }
            onClick={() =>
              setDateRange(
                "all"
              )
            }
          >
            All Time
          </button>

        </div>

      </div>

      {/* =========================
          CARBON OVERVIEW
          ========================= */}

      <section className="carbon-overview">

        <div className="carbon-info">

          <div className="section-label">
            🌍 CARBON FOOTPRINT
          </div>

          <h2>
            {totalCarbon.toFixed(
              2
            )}{" "}
            kg
          </h2>

          <div className="carbon-change">

            <span>
              CO₂e
            </span>

            <span>
              •
            </span>

            <span>
              {rangeLabel}
            </span>

          </div>

        </div>

      </section>

      {/* =========================
          CATEGORY CARDS
          ========================= */}

      <div className="category-grid">

        <div className="category-card">

          <div className="category-icon">
            🚗
          </div>

          <div>

            <p>
              Transport
            </p>

            <h3>
              {transportCarbon.toFixed(
                2
              )}{" "}
              kg
            </h3>

          </div>

        </div>

        <div className="category-card">

          <div className="category-icon">
            🍽️
          </div>

          <div>

            <p>
              Food
            </p>

            <h3>
              {foodCarbon.toFixed(
                2
              )}{" "}
              kg
            </h3>

          </div>

        </div>

        <div className="category-card">

          <div className="category-icon">
            ⚡
          </div>

          <div>

            <p>
              Energy
            </p>

            <h3>
              {energyCarbon.toFixed(
                2
              )}{" "}
              kg
            </h3>

          </div>

        </div>

      </div>

      {/* =========================
          SUSTAINABILITY INSIGHTS
          ========================= */}

      <section className="insights-section">

        <div className="insights-header">

          <div>

            <div className="insights-eyebrow">
              DATA-DRIVEN INSIGHTS
            </div>

            <h2>
              Your Sustainability Insights
            </h2>

            <p>
              What your recorded activity
              tells us about your current
              footprint.
            </p>

          </div>

          <div className="insights-header-icon">
            💡
          </div>

        </div>

        {filteredActivities.length ===
        0 ? (

          <div className="insight-empty">

            <div>
              🌱
            </div>

            <h3>
              Start tracking to unlock insights
            </h3>

            <p>
              Once you record some activities,
              EcoPulse will analyze your
              behavior and highlight useful
              patterns.
            </p>

          </div>

        ) : (

          <div className="insights-grid">

            {/* BIGGEST IMPACT */}

            <div className="insight-card">

              <div className="insight-icon">
                🌍
              </div>

              <div className="insight-card-label">
                BIGGEST IMPACT
              </div>

              <h3>
                {dominantInsightCategory}
              </h3>

              <p>
                {dominantInsightCategory} accounts
                for{" "}
                <strong>
                  {dominantPercentage}%
                </strong>{" "}
                of your recorded carbon footprint
                for {insightRangeLabel}.
              </p>

            </div>

            {/* BEHAVIOR PATTERN */}

            <div className="insight-card">

              <div className="insight-icon">
                📊
              </div>

              <div className="insight-card-label">
                ACTIVITY PATTERN
              </div>

              <h3>
                {mostFrequentActivity ||
                  "No pattern yet"}
              </h3>

              <p>
                You recorded{" "}
                <strong>
                  {mostFrequentCount}
                </strong>{" "}
                {mostFrequentActivity
                  ? mostFrequentActivity.toLowerCase()
                  : "activity"}{" "}
                {mostFrequentCount === 1
                  ? "entry"
                  : "entries"}{" "}
                during {insightRangeLabel}.
              </p>

            </div>

            {/* OPPORTUNITY */}

            <div className="insight-card opportunity">

              <div className="insight-icon">
                🌱
              </div>

              <div className="insight-card-label">
                OPPORTUNITY
              </div>

              <h3>
                Focus on{" "}
                {dominantInsightCategory.toLowerCase()}
              </h3>

              <p>
                {getOpportunityText()}
              </p>

            </div>

          </div>

        )}

      </section>

      {/* =========================
          CHARTS
          ========================= */}

      <div
        style={{
          display:
            "grid",

          gridTemplateColumns:
            "repeat(auto-fit, minmax(320px, 1fr))",

          gap:
            "22px",
        }}
      >

        {/* PIE CHART */}

        <section
          style={{
            background:
              "white",

            borderRadius:
              "18px",

            padding:
              "25px",
          }}
        >

          <h2
            style={{
              marginTop:
                0,

              marginBottom:
                "5px",
            }}
          >
            Carbon by Category
          </h2>

          <p
            style={{
              color:
                "#718078",

              fontSize:
                "13px",

              marginTop:
                0,
            }}
          >
            Breakdown of your carbon footprint
          </p>

          <div
            style={{
              width:
                "100%",

              height:
                "300px",
            }}
          >

            {carbonData.length ===
            0 ? (

              <div
                style={{
                  height:
                    "100%",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  color:
                    "#7b877f",

                  fontSize:
                    "14px",
                }}
              >
                No carbon data for
                this period.
              </div>

            ) : (

              <ResponsiveContainer>

                <PieChart>

                  <Pie
                    data={
                      carbonData
                    }

                    dataKey="value"

                    nameKey="name"

                    cx="50%"

                    cy="50%"

                    outerRadius={
                      90
                    }

                    innerRadius={
                      55
                    }

                    paddingAngle={
                      3
                    }
                  >

                    {carbonData.map(
                      (
                        entry,
                        index
                      ) => (

                        <Cell
                          key={`cell-${index}`}

                          fill={
                            pieColors[
                              index %
                                pieColors.length
                            ]
                          }
                        />

                      )
                    )}

                  </Pie>

                  <Tooltip />

                  <Legend />

                </PieChart>

              </ResponsiveContainer>

            )}

          </div>

        </section>

        {/* LINE CHART */}

        <section
          style={{
            background:
              "white",

            borderRadius:
              "18px",

            padding:
              "25px",
          }}
        >

          <h2
            style={{
              marginTop:
                0,

              marginBottom:
                "5px",
            }}
          >
            Carbon Trend
          </h2>

          <p
            style={{
              color:
                "#718078",

              fontSize:
                "13px",

              marginTop:
                0,
            }}
          >
            Daily carbon emissions
          </p>

          <div
            style={{
              width:
                "100%",

              height:
                "300px",
            }}
          >

            {chartDataWithRoundedValues.length ===
            0 ? (

              <div
                style={{
                  height:
                    "100%",

                  display:
                    "flex",

                  alignItems:
                    "center",

                  justifyContent:
                    "center",

                  color:
                    "#7b877f",

                  fontSize:
                    "14px",
                }}
              >
                No trend data for
                this period.
              </div>

            ) : (

              <ResponsiveContainer>

                <LineChart
                  data={
                    chartDataWithRoundedValues
                  }
                >

                  <CartesianGrid
                    strokeDasharray="3 3"

                    stroke="#e8eee9"
                  />

                  <XAxis
                    dataKey="date"

                    tick={{
                      fontSize:
                        11,
                    }}
                  />

                  <YAxis
                    tick={{
                      fontSize:
                        11,
                    }}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"

                    dataKey="carbon"

                    stroke="#2e8b57"

                    strokeWidth={
                      3
                    }

                    dot={{
                      r: 4,
                    }}

                    activeDot={{
                      r: 6,
                    }}
                  />

                </LineChart>

              </ResponsiveContainer>

            )}

          </div>

        </section>

      </div>

      {/* =========================
          ACTIVITY TRACKING
          ========================= */}

      <section className="streak-card">

        <div className="streak-header">

          <div>

            <div className="section-label">
              🌱 ACTIVITY TRACKING
            </div>

            <h2>
              {activityCount}{" "}
              activities
            </h2>

          </div>

          <div className="streak-number">

            {activityCount >=
            10
              ? "🔥"
              : "🌿"}

          </div>

        </div>

        <div className="progress-bar">

          <div
            className="progress-fill"

            style={{
              width: `${activityProgress}%`,
            }}
          />

        </div>

        <p>

          {activityCount >=
          maxActivityCount
            ? "Great work! You've logged 10 or more activities."
            : `${
                maxActivityCount -
                activityCount
              } more activities to reach your tracking milestone.`}

        </p>

      </section>

      {/* =========================
          PERSONALIZED NUDGE
          ========================= */}

      {nudge && (

        <section className="nudge-card">

          <div className="nudge-label">
            PERSONALIZED SUGGESTION
          </div>

          <h2>
            {nudge.title}
          </h2>

          <p>
            {nudge.message}
          </p>

          <div className="nudge-actions">

            <button
              className="primary-button"

              onClick={() =>
                handleNudgeResponse(
                  "accepted"
                )
              }
            >
              I'll try this 🌱
            </button>

            <button
              className="secondary-button"

              onClick={() =>
                handleNudgeResponse(
                  "declined"
                )
              }
            >
              Maybe later
            </button>

          </div>

          {nudgeResponse && (

            <p
              style={{
                marginTop:
                  "15px",

                marginBottom:
                  0,

                fontWeight:
                  600,

                color:
                  "#2e8b57",
              }}
            >
              {nudgeResponse}
            </p>

          )}

        </section>

      )}

      {/* =========================
          RECENT ACTIVITY
          ========================= */}

      <section className="activity-history-card">

        <div className="activity-history-header">

          <div>

            <h2>
              Recent Activity
            </h2>

            <p>
              Your latest recorded
              environmental activities
            </p>

          </div>

          <span className="activity-history-icon">
            📋
          </span>

        </div>

        {filteredActivities.length ===
        0 ? (

          <div className="activity-empty">

            <div>
              🌱
            </div>

            <h3>
              No activities for this
              period
            </h3>

            <p>
              Add an activity or choose
              a wider date range to see
              your records.
            </p>

          </div>

        ) : (

          <div className="activity-list">

            {[...filteredActivities]
              .sort(
                (
                  a,
                  b
                ) =>
                  new Date(
                    b.created_at
                  ) -
                  new Date(
                    a.created_at
                  )
              )
              .slice(
                0,
                8
              )
              .map(
                (
                  activity
                ) => (

                  <div
                    className="activity-row"

                    key={
                      activity.id
                    }
                  >

                    <div className="activity-row-icon">

                      {activity.category ===
                      "Transport"
                        ? "🚗"
                        : activity.category ===
                          "Energy"
                        ? "⚡"
                        : "🍽️"}

                    </div>

                    <div className="activity-row-info">

                      <strong>
                        {
                          activity.activity_type
                        }
                      </strong>

                      <span>
                        {
                          activity.quantity
                        }{" "}
                        {
                          activity.unit
                        }{" "}
                        ·{" "}
                        {formatDate(
                          activity.activity_date
                        )}
                      </span>

                    </div>

                    <div className="activity-row-carbon">

                      <strong>
                        {Number(
                          activity.carbon_kg ||
                            0
                        ).toFixed(
                          2
                        )}{" "}
                        kg
                      </strong>

                      <span>
                        CO₂e
                      </span>

                    </div>

                    <div className="activity-row-actions">

                      <button
                        className="edit-activity-button"

                        onClick={() =>
                          openEditActivity(
                            activity
                          )
                        }

                        title="Edit activity"
                      >
                        ✏️
                      </button>

                      <button
                        className="delete-activity-button"

                        onClick={() =>
                          deleteActivity(
                            activity.id
                          )
                        }

                        title="Delete activity"
                      >
                        🗑️
                      </button>

                    </div>

                  </div>

                )
              )}

          </div>

        )}

      </section>

      {/* =========================
          DELETE MODAL
          ========================= */}

      {activityToDelete && (

        <div className="delete-modal-overlay">

          <div className="delete-modal">

            <div className="delete-modal-icon">
              🗑️
            </div>

            <h2>
              Delete activity?
            </h2>

            <p>
              This activity will be
              permanently removed from
              your carbon history.
            </p>

            <div className="delete-modal-actions">

              <button
                className="cancel-delete-button"

                onClick={() =>
                  setActivityToDelete(
                    null
                  )
                }
              >
                Cancel
              </button>

              <button
                className="confirm-delete-button"

                onClick={
                  confirmDeleteActivity
                }
              >
                Delete
              </button>

            </div>

          </div>

        </div>

      )}

      {/* =========================
          EDIT MODAL
          ========================= */}

      {activityToEdit && (

        <div className="edit-modal-overlay">

          <div className="edit-modal">

            <div className="edit-modal-header">

              <div>

                <div className="edit-eyebrow">
                  ACTIVITY MANAGEMENT
                </div>

                <h2>
                  Edit Activity
                </h2>

                <p>
                  Update the details of
                  your recorded activity.
                </p>

              </div>

              <button
                className="close-edit-button"

                onClick={() =>
                  setActivityToEdit(
                    null
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="edit-form-group">

              <label>
                Category
              </label>

              <div className="edit-category-selector">

                <button
                  type="button"

                  className={
                    editCategory ===
                    "Transport"
                      ? "edit-category-option selected"
                      : "edit-category-option"
                  }

                  onClick={() =>
                    handleEditCategoryChange(
                      "Transport"
                    )
                  }
                >
                  🚗
                  <span>
                    Transport
                  </span>
                </button>

                <button
                  type="button"

                  className={
                    editCategory ===
                    "Energy"
                      ? "edit-category-option selected"
                      : "edit-category-option"
                  }

                  onClick={() =>
                    handleEditCategoryChange(
                      "Energy"
                    )
                  }
                >
                  ⚡
                  <span>
                    Energy
                  </span>
                </button>

                <button
                  type="button"

                  className={
                    editCategory ===
                    "Food"
                      ? "edit-category-option selected"
                      : "edit-category-option"
                  }

                  onClick={() =>
                    handleEditCategoryChange(
                      "Food"
                    )
                  }
                >
                  🍽️
                  <span>
                    Food
                  </span>
                </button>

              </div>

            </div>

            <div className="edit-form-group">

              <label>
                Activity Type
              </label>

              <select
                value={
                  editActivityType
                }

                onChange={(e) =>
                  setEditActivityType(
                    e.target.value
                  )
                }

                className="form-input"
              >

                {editCategory ===
                  "Transport" && (
                  <>
                    <option value="Car">
                      Car
                    </option>

                    <option value="Bike">
                      Motorcycle
                    </option>

                    <option value="Bus">
                      Bus
                    </option>

                    <option value="Train">
                      Train
                    </option>
                  </>
                )}

                {editCategory ===
                  "Energy" && (
                  <option value="Electricity">
                    Electricity
                  </option>
                )}

                {editCategory ===
                  "Food" && (
                  <>
                    <option value="Meat">
                      Meat-based meal
                    </option>

                    <option value="Vegetarian">
                      Vegetarian meal
                    </option>
                  </>
                )}

              </select>

            </div>

            <div className="edit-form-row">

              <div className="edit-form-group">

                <label>
                  Quantity
                </label>

                <input
                  type="number"

                  min="0"

                  step="0.1"

                  value={
                    editQuantity
                  }

                  onChange={(e) =>
                    setEditQuantity(
                      e.target.value
                    )
                  }

                  className="form-input"
                />

              </div>

              <div className="edit-form-group">

                <label>
                  Date
                </label>

                <input
                  type="date"

                  value={
                    editDate
                  }

                  max={
                    new Date()
                      .toISOString()
                      .split(
                        "T"
                      )[0]
                  }

                  onChange={(e) =>
                    setEditDate(
                      e.target.value
                    )
                  }

                  className="form-input"
                />

              </div>

            </div>

            <div className="edit-estimate">

              <span>
                Updated estimated footprint
              </span>

              <strong>
                {calculateCarbon(
                  editCategory,
                  editActivityType,
                  editQuantity
                ).toFixed(
                  2
                )}{" "}
                kg CO₂e
              </strong>

            </div>

            {editMessage && (

              <div className="edit-message">
                {editMessage}
              </div>

            )}

            <div className="edit-modal-actions">

              <button
                className="cancel-edit-button"

                onClick={() =>
                  setActivityToEdit(
                    null
                  )
                }
              >
                Cancel
              </button>

              <button
                className="save-edit-button"

                onClick={
                  saveEditedActivity
                }

                disabled={
                  editLoading
                }
              >
                {editLoading
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  )
}

export default Dashboard
import { useEffect, useState } from "react"
import { supabase } from "../services/supabase"

export default function Activity() {
  const [activities, setActivities] = useState([])

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("timestamp", { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setActivities(data)
    }
  }

  return (
    <div>
      <h1>Activity Log</h1>

      {activities.length === 0 ? (
        <p>No activity found</p>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            style={{
              padding: "10px",
              borderBottom: "1px solid #ddd"
            }}
          >
            <p>{activity.action_description}</p>
            <small>{new Date(activity.timestamp).toLocaleString()}</small>
          </div>
        ))
      )}
    </div>
  )
}
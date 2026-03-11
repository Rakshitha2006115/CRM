import { useEffect, useState } from "react"
import { supabase } from "../services/supabase"

export default function Clients() {

  const [clients, setClients] = useState([])

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")

    if (!error) {
      setClients(data)
    }
  }

  return (
    <div>
      <h1>Clients</h1>

      <table style={{ marginTop: "20px", width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Name</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Company</th>
            <th style={{ border: "1px solid #ddd", padding: "8px" }}>Email</th>
          </tr>
        </thead>

        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {client.name}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {client.company}
              </td>
              <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                {client.email}
              </td>
            </tr>
          ))}
        </tbody>

      </table>
    </div>
  )
}
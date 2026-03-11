import { useEffect, useState } from "react"
import { supabase } from "../services/supabase"

export default function Dashboard() {

  const [leads, setLeads] = useState(0)
  const [clients, setClients] = useState(0)
  const [payments, setPayments] = useState(0)
  const [maintenance, setMaintenance] = useState(0)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {

    const { count: leadsCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })

    const { count: clientsCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })

    const { count: paymentsCount } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })

    const { count: maintenanceCount } = await supabase
      .from("maintenance")
      .select("*", { count: "exact", head: true })

    setLeads(leadsCount)
    setClients(clientsCount)
    setPayments(paymentsCount)
    setMaintenance(maintenanceCount)
  }

  return (
    <div>
      <h1>Dashboard</h1>
  
      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>
  
        <div style={{ background: "#f3f4f6", padding: "20px", borderRadius: "8px", width: "200px" }}>
          <h3>Total Leads</h3>
          <p style={{ fontSize: "24px" }}>{leads}</p>
        </div>
  
        <div style={{ background: "#f3f4f6", padding: "20px", borderRadius: "8px", width: "200px" }}>
          <h3>Total Clients</h3>
          <p style={{ fontSize: "24px" }}>{clients}</p>
        </div>
  
        <div style={{ background: "#f3f4f6", padding: "20px", borderRadius: "8px", width: "200px" }}>
          <h3>Total Payments</h3>
          <p style={{ fontSize: "24px" }}>{payments}</p>
        </div>
  
        <div style={{ background: "#f3f4f6", padding: "20px", borderRadius: "8px", width: "200px" }}>
          <h3>Maintenance Contracts</h3>
          <p style={{ fontSize: "24px" }}>{maintenance}</p>
        </div>
  
      </div>
    </div>
  )
}
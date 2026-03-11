import { useEffect, useState } from "react"
import { supabase } from "../services/supabase"

export default function Reports() {
  const [clients, setClients] = useState(0)
  const [leads, setLeads] = useState(0)
  const [payments, setPayments] = useState(0)
  const [maintenance, setMaintenance] = useState(0)

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {

    const { count: clientsCount } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })

    const { count: leadsCount } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })

    const { count: paymentsCount } = await supabase
      .from("payments")
      .select("*", { count: "exact", head: true })

    const { count: maintenanceCount } = await supabase
      .from("maintenance")
      .select("*", { count: "exact", head: true })

    setClients(clientsCount)
    setLeads(leadsCount)
    setPayments(paymentsCount)
    setMaintenance(maintenanceCount)
  }

  return (
    <div>
      <h1>Reports</h1>

      <div style={{ display: "flex", gap: "20px", marginTop: "20px" }}>

        <div style={{ padding: "20px", background: "#eee" }}>
          <h3>Total Clients</h3>
          <p>{clients}</p>
        </div>

        <div style={{ padding: "20px", background: "#eee" }}>
          <h3>Total Leads</h3>
          <p>{leads}</p>
        </div>

        <div style={{ padding: "20px", background: "#eee" }}>
          <h3>Total Payments</h3>
          <p>{payments}</p>
        </div>

        <div style={{ padding: "20px", background: "#eee" }}>
          <h3>Maintenance Contracts</h3>
          <p>{maintenance}</p>
        </div>

      </div>
    </div>
  )
}
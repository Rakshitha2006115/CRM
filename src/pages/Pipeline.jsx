import React, { useState, useEffect } from 'react'
import KanbanColumn from '../components/KanbanColumn'
import KanbanCard from '../components/KanbanCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { fetchClientsByStage, updateClientStage, calculatePipelineValue } from '../services/pipelineService'

export default function Pipeline() {
  const [clientsByStage, setClientsByStage] = useState({
    'New Lead': [],
    'Contacted': [],
    'Proposal Sent': [],
    'Negotiation': [],
    'Closed Won': [],
    'Closed Lost': []
  })
  const [pipelineValue, setPipelineValue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const stages = ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost']

  useEffect(() => {
    loadPipelineData()
  }, [])

  const loadPipelineData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch clients grouped by stage
      const { data: clients, error: clientsError } = await fetchClientsByStage()
      if (clientsError) throw clientsError

      setClientsByStage(clients)

      // Calculate pipeline value
      const { data: value, error: valueError } = await calculatePipelineValue()
      if (valueError) throw valueError

      setPipelineValue(value)
    } catch (err) {
      console.error('Error loading pipeline data:', err)
      setError('Failed to load pipeline data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = async (clientId, newStage) => {
    try {
      // Update the client's stage in the database
      const { data, error } = await updateClientStage(clientId, newStage)
      if (error) throw error

      // Reload pipeline data to reflect changes
      await loadPipelineData()
    } catch (err) {
      console.error('Error updating client stage:', err)
      setError('Failed to update client stage. Please try again.')
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header with Pipeline Value */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Sales Pipeline</h1>
            <p className="text-gray-500 mt-1">Drag and drop clients to update their pipeline stage</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Total Pipeline Value</p>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(pipelineValue)}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stages.map(stage => (
          <KanbanColumn
            key={stage}
            stage={stage}
            clients={clientsByStage[stage] || []}
            onDrop={handleDrop}
          >
            {(clientsByStage[stage] || []).map(client => (
              <KanbanCard key={client.id} client={client} />
            ))}
          </KanbanColumn>
        ))}
      </div>
    </div>
  )
}

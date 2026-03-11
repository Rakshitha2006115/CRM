import React from 'react'
import StatusBadge from './StatusBadge'

const KanbanCard = ({ client }) => {
  const handleDragStart = (e) => {
    e.dataTransfer.setData('clientId', client.id)
    e.currentTarget.classList.add('opacity-50')
  }

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50')
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow duration-200"
    >
      <div className="mb-2">
        <h4 className="font-semibold text-gray-800 text-sm">{client.name}</h4>
        {client.company && (
          <p className="text-xs text-gray-500 mt-1">{client.company}</p>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-3">
        <span className="text-sm font-medium text-blue-600">
          {formatCurrency(client.project_value)}
        </span>
        <StatusBadge status={client.client_status} />
      </div>
    </div>
  )
}

export default KanbanCard

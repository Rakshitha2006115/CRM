import React from 'react'

const KanbanColumn = ({ stage, clients, onDrop, children }) => {
  const handleDragOver = (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('bg-blue-50')
  }

  const handleDragLeave = (e) => {
    e.currentTarget.classList.remove('bg-blue-50')
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-blue-50')
    
    const clientId = e.dataTransfer.getData('clientId')
    if (clientId && onDrop) {
      onDrop(clientId, stage)
    }
  }

  return (
    <div className="flex flex-col bg-gray-50 rounded-lg p-4 min-h-[500px]">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{stage}</h3>
        <p className="text-sm text-gray-500">{clients.length} client{clients.length !== 1 ? 's' : ''}</p>
      </div>
      
      <div
        className="flex-1 space-y-3 transition-colors duration-200"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {children}
      </div>
    </div>
  )
}

export default KanbanColumn

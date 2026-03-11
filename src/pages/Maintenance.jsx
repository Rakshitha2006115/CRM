import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import LoadingSpinner from '../components/LoadingSpinner'
import { fetchClients } from '../services/clientService'
import {
  fetchMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  checkExpiredMaintenance,
} from '../services/maintenanceService'

export default function Maintenance() {
  const [maintenanceRecords, setMaintenanceRecords] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [formData, setFormData] = useState({
    client_id: '',
    maintenance_type: 'Monthly',
    amount: 0,
    start_date: '',
    renewal_date: '',
    status: 'Active',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const maintenanceTypes = ['Monthly', 'Quarterly', 'Yearly']
  const maintenanceStatuses = ['Active', 'On Hold', 'Expired']

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // First check for expired maintenance and update their status
      await checkExpiredMaintenance()

      const [{ data: maintenanceData, error: maintenanceError }, { data: clientsData, error: clientsError }] =
        await Promise.all([fetchMaintenance(), fetchClients()])

      if (maintenanceError) {
        setError('Failed to load maintenance records. Please try again.')
        console.error(maintenanceError)
      } else {
        setMaintenanceRecords(maintenanceData || [])
      }

      if (clientsError) {
        console.error('Failed to load clients:', clientsError)
      } else {
        setClients(clientsData || [])
      }
    } catch (err) {
      console.error('Error loading maintenance data:', err)
      setError('Failed to load maintenance data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateClick = () => {
    setFormData({
      client_id: '',
      maintenance_type: 'Monthly',
      amount: 0,
      start_date: '',
      renewal_date: '',
      status: 'Active',
    })
    setError(null)
    setIsCreateModalOpen(true)
  }

  const handleEditClick = (record) => {
    setSelectedRecord(record)
    setFormData({
      client_id: record.client_id || '',
      maintenance_type: record.maintenance_type || 'Monthly',
      amount: record.amount || 0,
      start_date: record.start_date || '',
      renewal_date: record.renewal_date || '',
      status: record.status || 'Active',
    })
    setError(null)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (record) => {
    setSelectedRecord(record)
    setIsDeleteModalOpen(true)
  }

  const validateForm = () => {
    if (!formData.client_id) {
      setError('Client is required')
      return false
    }

    if (!formData.maintenance_type) {
      setError('Maintenance type is required')
      return false
    }

    if (formData.amount <= 0) {
      setError('Amount must be greater than 0')
      return false
    }

    if (!formData.start_date || !formData.renewal_date) {
      setError('Start date and renewal date are required')
      return false
    }

    if (new Date(formData.renewal_date) < new Date(formData.start_date)) {
      setError('Renewal date cannot be before start date')
      return false
    }

    return true
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!validateForm()) {
      setSubmitting(false)
      return
    }

    try {
      const { error: createError } = await createMaintenance(formData)
      if (createError) {
        setError('Failed to create maintenance record. Please try again.')
        console.error(createError)
      } else {
        await loadData()
        setIsCreateModalOpen(false)
      }
    } catch (err) {
      console.error('Error creating maintenance record:', err)
      setError('Failed to create maintenance record. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!validateForm()) {
      setSubmitting(false)
      return
    }

    try {
      const { error: updateError } = await updateMaintenance(selectedRecord.id, formData)
      if (updateError) {
        setError('Failed to update maintenance record. Please try again.')
        console.error(updateError)
      } else {
        await loadData()
        setIsEditModalOpen(false)
      }
    } catch (err) {
      console.error('Error updating maintenance record:', err)
      setError('Failed to update maintenance record. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const { error: deleteError } = await deleteMaintenance(selectedRecord.id)
      if (deleteError) {
        setError('Failed to delete maintenance record. Please try again.')
        console.error(deleteError)
      } else {
        setMaintenanceRecords((prev) => prev.filter((record) => record.id !== selectedRecord.id))
        setIsDeleteModalOpen(false)
      }
    } catch (err) {
      console.error('Error deleting maintenance record:', err)
      setError('Failed to delete maintenance record. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatCurrency = (value) => {
    return `$${parseFloat(value || 0).toLocaleString()}`
  }

  const columns = [
    {
      key: 'clients',
      label: 'Client',
      render: (client) =>
        client ? `${client.name}${client.company ? ` (${client.company})` : ''}` : 'N/A',
    },
    {
      key: 'maintenance_type',
      label: 'Type',
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (value) => formatCurrency(value),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />,
    },
    {
      key: 'start_date',
      label: 'Start Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
    {
      key: 'renewal_date',
      label: 'Renewal Date',
      render: (value) => (value ? new Date(value).toLocaleDateString() : 'N/A'),
    },
  ]

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 flex justify-center">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Maintenance</h1>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Maintenance
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={maintenanceRecords}
          loading={loading}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          emptyMessage="No maintenance records found. Create your first maintenance agreement to get started!"
        />
      </div>

      {/* Create Maintenance Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Maintenance Record"
      >
        <form onSubmit={handleCreateSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                name="client_id"
                value={formData.client_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                    {client.company ? ` (${client.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Type <span className="text-red-500">*</span>
              </label>
              <select
                name="maintenance_type"
                value={formData.maintenance_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Renewal Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="renewal_date"
                  value={formData.renewal_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {maintenanceStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Maintenance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Maintenance Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Maintenance Record"
      >
        <form onSubmit={handleEditSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client
              </label>
              <input
                type="text"
                value={
                  selectedRecord?.clients
                    ? `${selectedRecord.clients.name}${
                        selectedRecord.clients.company ? ` (${selectedRecord.clients.company})` : ''
                      }`
                    : 'N/A'
                }
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maintenance Type <span className="text-red-500">*</span>
              </label>
              <select
                name="maintenance_type"
                value={formData.maintenance_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Renewal Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="renewal_date"
                  value={formData.renewal_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {maintenanceStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Updating...' : 'Update Maintenance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Maintenance Record"
      >
        <div>
          <p className="text-gray-700 mb-2">
            Are you sure you want to delete this maintenance record?
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Client:{' '}
            <span className="font-medium">
              {selectedRecord?.clients
                ? `${selectedRecord.clients.name}${
                    selectedRecord.clients.company ? ` (${selectedRecord.clients.company})` : ''
                  }`
                : 'N/A'}
            </span>
          </p>
          <p className="text-sm text-gray-600 mb-4">
            Type: <span className="font-medium">{selectedRecord?.maintenance_type}</span> | Amount:{' '}
            <span className="font-medium">{formatCurrency(selectedRecord?.amount)}</span>
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

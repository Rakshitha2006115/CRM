import { useState, useEffect } from 'react'
import DataTable from '../components/DataTable'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import { fetchPayments, createPayment, updatePayment } from '../services/paymentService'
import { fetchClients } from '../services/clientService'

export default function Payments() {
  const [payments, setPayments] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [formData, setFormData] = useState({
    client_id: '',
    total_amount: 0,
    amount_received: 0,
    due_date: ''
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    setError(null)
    
    // Load payments
    const { data: paymentsData, error: paymentsError } = await fetchPayments()
    if (paymentsError) {
      setError('Failed to load payments. Please try again.')
      console.error(paymentsError)
    } else {
      setPayments(paymentsData || [])
    }

    // Load clients for dropdown
    const { data: clientsData, error: clientsError } = await fetchClients()
    if (clientsError) {
      console.error('Failed to load clients:', clientsError)
    } else {
      setClients(clientsData || [])
    }

    setLoading(false)
  }

  const handleCreateClick = () => {
    setFormData({
      client_id: '',
      total_amount: 0,
      amount_received: 0,
      due_date: ''
    })
    setError(null)
    setIsCreateModalOpen(true)
  }

  const handleEditClick = (payment) => {
    setSelectedPayment(payment)
    setFormData({
      client_id: payment.client_id || '',
      total_amount: payment.total_amount || 0,
      amount_received: payment.amount_received || 0,
      due_date: payment.due_date || ''
    })
    setError(null)
    setIsEditModalOpen(true)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Validation
    if (!formData.client_id) {
      setError('Client is required')
      setSubmitting(false)
      return
    }
    if (formData.total_amount <= 0) {
      setError('Total amount must be greater than 0')
      setSubmitting(false)
      return
    }
    if (formData.amount_received < 0) {
      setError('Amount received cannot be negative')
      setSubmitting(false)
      return
    }
    if (formData.amount_received > formData.total_amount) {
      setError('Amount received cannot exceed total amount')
      setSubmitting(false)
      return
    }

    const { data, error } = await createPayment(formData)
    if (error) {
      setError('Failed to create payment. Please try again.')
      console.error(error)
    } else {
      // Reload payments to get the updated list with client info
      await loadData()
      setIsCreateModalOpen(false)
    }
    setSubmitting(false)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Validation
    if (formData.total_amount <= 0) {
      setError('Total amount must be greater than 0')
      setSubmitting(false)
      return
    }
    if (formData.amount_received < 0) {
      setError('Amount received cannot be negative')
      setSubmitting(false)
      return
    }
    if (formData.amount_received > formData.total_amount) {
      setError('Amount received cannot exceed total amount')
      setSubmitting(false)
      return
    }

    const { data, error } = await updatePayment(selectedPayment.id, formData)
    if (error) {
      setError('Failed to update payment. Please try again.')
      console.error(error)
    } else {
      // Reload payments to get the updated list with client info
      await loadData()
      setIsEditModalOpen(false)
    }
    setSubmitting(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const calculatePendingAmount = () => {
    return (parseFloat(formData.total_amount) || 0) - (parseFloat(formData.amount_received) || 0)
  }

  const columns = [
    {
      key: 'clients',
      label: 'Client',
      render: (client) => client ? `${client.name}${client.company ? ` (${client.company})` : ''}` : 'N/A'
    },
    {
      key: 'total_amount',
      label: 'Total Amount',
      render: (value) => `$${parseFloat(value || 0).toLocaleString()}`
    },
    {
      key: 'amount_received',
      label: 'Amount Received',
      render: (value) => `$${parseFloat(value || 0).toLocaleString()}`
    },
    {
      key: 'pending_amount',
      label: 'Pending Amount',
      render: (value) => `$${parseFloat(value || 0).toLocaleString()}`
    },
    {
      key: 'payment_status',
      label: 'Status',
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: 'due_date',
      label: 'Due Date',
      render: (value) => value ? new Date(value).toLocaleDateString() : 'N/A'
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      render: (value) => value ? new Date(value).toLocaleDateString() : '-'
    }
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Payments</h1>
          <button
            onClick={handleCreateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Payment
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <DataTable
          columns={columns}
          data={payments}
          loading={loading}
          onEdit={handleEditClick}
          emptyMessage="No payments found. Create your first payment record to get started!"
        />
      </div>

      {/* Create Payment Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Payment"
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
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}{client.company ? ` (${client.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="total_amount"
                value={formData.total_amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Received
              </label>
              <input
                type="number"
                name="amount_received"
                value={formData.amount_received}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pending Amount (Auto-calculated)
              </label>
              <input
                type="text"
                value={`$${calculatePendingAmount().toLocaleString()}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
              {submitting ? 'Creating...' : 'Create Payment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Payment Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Payment"
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
                value={selectedPayment?.clients ? `${selectedPayment.clients.name}${selectedPayment.clients.company ? ` (${selectedPayment.clients.company})` : ''}` : 'N/A'}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="total_amount"
                value={formData.total_amount}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount Received
              </label>
              <input
                type="number"
                name="amount_received"
                value={formData.amount_received}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pending Amount (Auto-calculated)
              </label>
              <input
                type="text"
                value={`$${calculatePendingAmount().toLocaleString()}`}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
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
              {submitting ? 'Updating...' : 'Update Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

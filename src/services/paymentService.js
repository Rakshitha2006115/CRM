import { supabase } from './supabase'

/**
 * Calculate payment status based on amounts and due date
 * @param {number} totalAmount - Total payment amount
 * @param {number} amountReceived - Amount already received
 * @param {string} dueDate - Payment due date (ISO string)
 * @returns {string} Payment status: 'Paid', 'Partially Paid', 'Pending', or 'Overdue'
 */
export function calculatePaymentStatus(totalAmount, amountReceived, dueDate) {
  const pending = totalAmount - amountReceived

  if (pending <= 0) return 'Paid'
  if (amountReceived > 0 && pending > 0) return 'Partially Paid'
  if (amountReceived === 0 && new Date() > new Date(dueDate)) return 'Overdue'
  return 'Pending'
}

/**
 * Fetch all payments from the database with client information
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchPayments() {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        clients (
          id,
          name,
          company
        )
      `)
      .order('updated_at', { ascending: false })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[paymentService] Error fetching payments:', error)
    return { data: null, error }
  }
}

/**
 * Create a new payment record
 * @param {Object} paymentData - Payment data to insert
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createPayment(paymentData) {
  try {
    // Calculate payment status
    const paymentStatus = calculatePaymentStatus(
      paymentData.total_amount,
      paymentData.amount_received || 0,
      paymentData.due_date
    )

    const dataToInsert = {
      ...paymentData,
      payment_status: paymentStatus
    }

    const { data, error } = await supabase
      .from('payments')
      .insert([dataToInsert])
      .select()
      .single()

    if (error) throw error

    // Fetch client name for activity log
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', data.client_id)
      .single()

    // Log the creation activity
    const activityData = {
      client_id: data.client_id,
      action_description: `Payment created for ${client?.name || 'client'}: $${data.total_amount} (Status: ${data.payment_status})`
    }

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert([activityData])

    if (activityError) {
      console.error('[paymentService] Error logging activity:', activityError)
      // Don't fail the creation if activity logging fails
    }

    return { data, error: null }
  } catch (error) {
    console.error('[paymentService] Error creating payment:', error)
    return { data: null, error }
  }
}

/**
 * Update an existing payment record
 * @param {string} id - Payment ID
 * @param {Object} paymentData - Updated payment data
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updatePayment(id, paymentData) {
  try {
    // Fetch current payment to get client_id and calculate new status
    const { data: currentPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    // Recalculate payment status with updated values
    const totalAmount = paymentData.total_amount ?? currentPayment.total_amount
    const amountReceived = paymentData.amount_received ?? currentPayment.amount_received
    const dueDate = paymentData.due_date ?? currentPayment.due_date

    const paymentStatus = calculatePaymentStatus(totalAmount, amountReceived, dueDate)

    const dataToUpdate = {
      ...paymentData,
      payment_status: paymentStatus
    }

    const { data, error } = await supabase
      .from('payments')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Fetch client name for activity log
    const { data: client } = await supabase
      .from('clients')
      .select('name')
      .eq('id', data.client_id)
      .single()

    // Log the update activity
    const activityData = {
      client_id: data.client_id,
      action_description: `Payment updated for ${client?.name || 'client'}: $${data.amount_received}/$${data.total_amount} (Status: ${data.payment_status})`
    }

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert([activityData])

    if (activityError) {
      console.error('[paymentService] Error logging activity:', activityError)
      // Don't fail the update if activity logging fails
    }

    return { data, error: null }
  } catch (error) {
    console.error('[paymentService] Error updating payment:', error)
    return { data: null, error }
  }
}

/**
 * Check and update overdue payment statuses
 * Updates payments where pending_amount > 0 and current date > due_date
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function checkOverduePayments() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Fetch payments that might be overdue
    const { data: payments, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .lt('due_date', today)
      .neq('payment_status', 'Paid')

    if (fetchError) throw fetchError

    if (!payments || payments.length === 0) {
      return { data: [], error: null }
    }

    // Update each payment that should be overdue
    const updates = []
    for (const payment of payments) {
      const pending = payment.total_amount - payment.amount_received
      if (pending > 0) {
        const { data, error } = await supabase
          .from('payments')
          .update({ payment_status: 'Overdue' })
          .eq('id', payment.id)
          .select()
          .single()

        if (!error && data) {
          updates.push(data)
        }
      }
    }

    return { data: updates, error: null }
  } catch (error) {
    console.error('[paymentService] Error checking overdue payments:', error)
    return { data: null, error }
  }
}

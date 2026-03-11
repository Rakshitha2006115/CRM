import { supabase } from './supabase'

/**
 * Fetch all clients from the database
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchClients() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[clientService] Error fetching clients:', error)
    return { data: null, error }
  }
}

/**
 * Create a new client
 * @param {Object} clientData - Client data to insert
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createClient(clientData) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    if (error) throw error

    // Log the creation activity
    const activityData = {
      client_id: data.id,
      action_description: `Client created: ${data.name} (${data.company || 'No company'})`
    }

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert([activityData])

    if (activityError) {
      console.error('[clientService] Error logging activity:', activityError)
      // Don't fail the creation if activity logging fails
    }

    return { data, error: null }
  } catch (error) {
    console.error('[clientService] Error creating client:', error)
    return { data: null, error }
  }
}

/**
 * Update an existing client
 * @param {string} id - Client ID
 * @param {Object} clientData - Updated client data
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateClient(id, clientData) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Log the update activity
    const activityData = {
      client_id: data.id,
      action_description: `Client updated: ${data.name}`
    }

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert([activityData])

    if (activityError) {
      console.error('[clientService] Error logging activity:', activityError)
      // Don't fail the update if activity logging fails
    }

    return { data, error: null }
  } catch (error) {
    console.error('[clientService] Error updating client:', error)
    return { data: null, error }
  }
}

/**
 * Delete a client (cascades to related records)
 * @param {string} id - Client ID
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function deleteClient(id) {
  try {
    const { data, error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[clientService] Error deleting client:', error)
    return { data: null, error }
  }
}

/**
 * Fetch a single client by ID with related data
 * @param {string} id - Client ID
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function fetchClientById(id) {
  try {
    // Fetch client data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single()

    if (clientError) throw clientError
    if (!client) throw new Error('Client not found')

    // Fetch related payments
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('client_id', id)
      .order('updated_at', { ascending: false })

    if (paymentsError) {
      console.error('[clientService] Error fetching payments:', paymentsError)
    }

    // Fetch related maintenance records
    const { data: maintenance, error: maintenanceError } = await supabase
      .from('maintenance')
      .select('*')
      .eq('client_id', id)
      .order('start_date', { ascending: false })

    if (maintenanceError) {
      console.error('[clientService] Error fetching maintenance:', maintenanceError)
    }

    // Fetch related activity logs
    const { data: activityLogs, error: activityError } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('client_id', id)
      .order('timestamp', { ascending: false })

    if (activityError) {
      console.error('[clientService] Error fetching activity logs:', activityError)
    }

    // Combine all data
    const clientWithRelations = {
      ...client,
      payments: payments || [],
      maintenance: maintenance || [],
      activityLogs: activityLogs || []
    }

    return { data: clientWithRelations, error: null }
  } catch (error) {
    console.error('[clientService] Error fetching client by ID:', error)
    return { data: null, error }
  }
}

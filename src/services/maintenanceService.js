import { supabase } from './supabase'

/**
 * Fetch all maintenance records with client information
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchMaintenance() {
  try {
    const { data, error } = await supabase
      .from('maintenance')
      .select(`
        *,
        clients (
          id,
          name,
          company
        )
      `)
      .order('renewal_date', { ascending: false })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[maintenanceService] Error fetching maintenance records:', error)
    return { data: null, error }
  }
}

/**
 * Create a new maintenance record
 * @param {Object} maintenanceData - Maintenance data to insert
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createMaintenance(maintenanceData) {
  try {
    const { data, error } = await supabase
      .from('maintenance')
      .insert([maintenanceData])
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
      action_description: `Maintenance created for ${client?.name || 'client'}: ${data.maintenance_type} - $${data.amount}`,
    }

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert([activityData])

    if (activityError) {
      console.error('[maintenanceService] Error logging activity:', activityError)
      // Do not fail the creation if activity logging fails
    }

    return { data, error: null }
  } catch (error) {
    console.error('[maintenanceService] Error creating maintenance record:', error)
    return { data: null, error }
  }
}

/**
 * Update an existing maintenance record
 * @param {string} id - Maintenance ID
 * @param {Object} maintenanceData - Updated maintenance data
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateMaintenance(id, maintenanceData) {
  try {
    const { data, error } = await supabase
      .from('maintenance')
      .update(maintenanceData)
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
      action_description: `Maintenance updated for ${client?.name || 'client'}: ${data.maintenance_type} - $${data.amount} (${data.status})`,
    }

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert([activityData])

    if (activityError) {
      console.error('[maintenanceService] Error logging activity:', activityError)
      // Do not fail the update if activity logging fails
    }

    return { data, error: null }
  } catch (error) {
    console.error('[maintenanceService] Error updating maintenance record:', error)
    return { data: null, error }
  }
}

/**
 * Delete a maintenance record
 * @param {string} id - Maintenance ID
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function deleteMaintenance(id) {
  try {
    const { data, error } = await supabase
      .from('maintenance')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[maintenanceService] Error deleting maintenance record:', error)
    return { data: null, error }
  }
}

/**
 * Check and update expired maintenance records
 * Marks maintenance as 'Expired' when renewal_date is in the past
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function checkExpiredMaintenance() {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: records, error: fetchError } = await supabase
      .from('maintenance')
      .select('*')
      .lt('renewal_date', today)
      .neq('status', 'Expired')

    if (fetchError) throw fetchError

    if (!records || records.length === 0) {
      return { data: [], error: null }
    }

    const updates = []

    for (const record of records) {
      const { data, error } = await supabase
        .from('maintenance')
        .update({ status: 'Expired' })
        .eq('id', record.id)
        .select()
        .single()

      if (!error && data) {
        updates.push(data)
      }
    }

    return { data: updates, error: null }
  } catch (error) {
    console.error('[maintenanceService] Error checking expired maintenance records:', error)
    return { data: null, error }
  }
}


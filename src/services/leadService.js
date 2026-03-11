import { supabase } from './supabase'

/**
 * Fetch all leads from the database
 * @returns {Promise<{data: Array, error: Error|null}>}
 */
export async function fetchLeads() {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[leadService] Error fetching leads:', error)
    return { data: null, error }
  }
}

/**
 * Create a new lead
 * @param {Object} leadData - Lead data to insert
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function createLead(leadData) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[leadService] Error creating lead:', error)
    return { data: null, error }
  }
}

/**
 * Update an existing lead
 * @param {string} id - Lead ID
 * @param {Object} leadData - Updated lead data
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateLead(id, leadData) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .update(leadData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[leadService] Error updating lead:', error)
    return { data: null, error }
  }
}

/**
 * Delete a lead
 * @param {string} id - Lead ID
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function deleteLead(id) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { data, error: null }
  } catch (error) {
    console.error('[leadService] Error deleting lead:', error)
    return { data: null, error }
  }
}

/**
 * Convert a lead to a client
 * Creates a new client record and logs the activity
 * @param {string} leadId - Lead ID to convert
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function convertLeadToClient(leadId) {
  try {
    // Fetch the lead data
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (fetchError) throw fetchError
    if (!lead) throw new Error('Lead not found')

    // Create client from lead data
    const clientData = {
      name: lead.name,
      company: lead.company || '',
      contact_details: `Email: ${lead.email || ''}, Phone: ${lead.phone || ''}`,
      project_value: 0,
      client_status: 'Active',
      pipeline_stage: lead.pipeline_stage || 'New Lead'
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single()

    if (clientError) throw clientError

    // Log the conversion activity
    const activityData = {
      client_id: client.id,
      action_description: `Converted from lead: ${lead.name} (${lead.company || 'No company'})`
    }

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert([activityData])

    if (activityError) {
      console.error('[leadService] Error logging activity:', activityError)
      // Don't fail the conversion if activity logging fails
    }

    // Delete the lead after successful conversion
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('id', leadId)

    if (deleteError) {
      console.error('[leadService] Error deleting lead after conversion:', deleteError)
      // Don't fail the conversion if lead deletion fails
    }

    return { data: client, error: null }
  } catch (error) {
    console.error('[leadService] Error converting lead to client:', error)
    return { data: null, error }
  }
}

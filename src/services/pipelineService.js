import { supabase } from './supabase'

/**
 * Fetch clients grouped by pipeline stage
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function fetchClientsByStage() {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group clients by pipeline_stage
    const groupedClients = {
      'New Lead': [],
      'Contacted': [],
      'Proposal Sent': [],
      'Negotiation': [],
      'Closed Won': [],
      'Closed Lost': []
    }

    data.forEach(client => {
      if (groupedClients[client.pipeline_stage]) {
        groupedClients[client.pipeline_stage].push(client)
      }
    })

    return { data: groupedClients, error: null }
  } catch (error) {
    console.error('[pipelineService] Error fetching clients by stage:', error)
    return { data: null, error }
  }
}

/**
 * Update client pipeline stage and log activity
 * @param {string} clientId - Client ID
 * @param {string} newStage - New pipeline stage
 * @returns {Promise<{data: Object, error: Error|null}>}
 */
export async function updateClientStage(clientId, newStage) {
  try {
    // Update the client's pipeline_stage
    const { data, error } = await supabase
      .from('clients')
      .update({ pipeline_stage: newStage })
      .eq('id', clientId)
      .select()
      .single()

    if (error) throw error

    // Log the stage change activity
    const activityData = {
      client_id: clientId,
      action_description: `Pipeline stage changed to: ${newStage}`
    }

    const { error: activityError } = await supabase
      .from('activity_logs')
      .insert([activityData])

    if (activityError) {
      console.error('[pipelineService] Error logging activity:', activityError)
      // Don't fail the update if activity logging fails
    }

    return { data, error: null }
  } catch (error) {
    console.error('[pipelineService] Error updating client stage:', error)
    return { data: null, error }
  }
}

/**
 * Calculate pipeline value (sum of project_value for active stages only)
 * @returns {Promise<{data: number, error: Error|null}>}
 */
export async function calculatePipelineValue() {
  try {
    const activeStages = ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation']

    const { data, error } = await supabase
      .from('clients')
      .select('project_value, pipeline_stage')
      .in('pipeline_stage', activeStages)

    if (error) throw error

    // Sum the project values
    const totalValue = data.reduce((sum, client) => {
      return sum + (parseFloat(client.project_value) || 0)
    }, 0)

    return { data: totalValue, error: null }
  } catch (error) {
    console.error('[pipelineService] Error calculating pipeline value:', error)
    return { data: null, error }
  }
}

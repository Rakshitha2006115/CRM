import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { updateClientStage, fetchClientsByStage, calculatePipelineValue } from './pipelineService'
import { supabase } from './supabase'

// Mock the supabase client
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('Pipeline Service - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Feature: agentic-ai-crm, Property 7: Pipeline Stage Update Logs Activity
  // Validates: Requirements 4.2, 4.3, 7.3
  test('Property 7: Pipeline Stage Update Logs Activity - changing pipeline stage creates activity log', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clientId: fc.uuid(),
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          oldStage: fc.constantFrom('New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'),
          newStage: fc.constantFrom('New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost')
        }),
        async (testData) => {
          // Clear mocks before each property test iteration
          vi.clearAllMocks()

          // Mock the client data before update
          const mockClientBefore = {
            id: testData.clientId,
            name: testData.clientName,
            company: 'Test Company',
            contact_details: 'test@example.com',
            project_value: 10000,
            client_status: 'Active',
            pipeline_stage: testData.oldStage,
            created_at: new Date().toISOString()
          }

          // Mock the client data after update
          const mockClientAfter = {
            ...mockClientBefore,
            pipeline_stage: testData.newStage
          }

          // Mock the activity log entry that should be created
          const mockActivityLog = {
            id: fc.sample(fc.uuid(), 1)[0],
            client_id: testData.clientId,
            action_description: `Pipeline stage changed to: ${testData.newStage}`,
            timestamp: new Date().toISOString()
          }

          // Setup mock for updating the client's pipeline_stage
          supabase.from.mockReturnValueOnce({
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockClientAfter,
                    error: null
                  })
                })
              })
            })
          })

          // Setup mock for inserting the activity log
          const mockActivityInsert = vi.fn().mockResolvedValue({
            data: mockActivityLog,
            error: null
          })

          supabase.from.mockReturnValueOnce({
            insert: mockActivityInsert
          })

          // Update the client's pipeline stage
          const updateResult = await updateClientStage(testData.clientId, testData.newStage)

          // Verify the update was successful
          expect(updateResult.error).toBeNull()
          expect(updateResult.data).toBeDefined()
          expect(updateResult.data.pipeline_stage).toBe(testData.newStage)

          // Property: An activity log entry should be created when pipeline stage changes
          // Verify that supabase.from was called for both update and activity log insert
          expect(supabase.from).toHaveBeenCalledTimes(2)
          
          // 1st call: update client
          expect(supabase.from).toHaveBeenNthCalledWith(1, 'clients')
          
          // 2nd call: insert activity log
          expect(supabase.from).toHaveBeenNthCalledWith(2, 'activity_logs')

          // Verify the activity log insert was called with correct data
          expect(mockActivityInsert).toHaveBeenCalledWith([{
            client_id: testData.clientId,
            action_description: `Pipeline stage changed to: ${testData.newStage}`
          }])

          // Additional verification: the activity log should contain the new stage
          const activityInsertCall = mockActivityInsert.mock.calls[0]
          const activityData = activityInsertCall[0][0]
          
          expect(activityData.client_id).toBe(testData.clientId)
          expect(activityData.action_description).toContain(testData.newStage)
          expect(activityData.action_description).toBe(`Pipeline stage changed to: ${testData.newStage}`)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: agentic-ai-crm, Property 8: Pipeline Value Excludes Closed Stages
  // Validates: Requirements 4.4, 4.5, 8.5
  test('Property 8: Pipeline Value Excludes Closed Stages - pipeline value only includes active stages', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            company: fc.string({ minLength: 1, maxLength: 100 }),
            project_value: fc.float({ min: 0, max: 1000000, noNaN: true }),
            pipeline_stage: fc.constantFrom(
              'New Lead', 'Contacted', 'Proposal Sent', 
              'Negotiation', 'Closed Won', 'Closed Lost'
            )
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (clientsData) => {
          // Clear mocks before each property test iteration
          vi.clearAllMocks()

          // Define active stages (should be included in pipeline value)
          const activeStages = ['New Lead', 'Contacted', 'Proposal Sent', 'Negotiation']
          
          // Calculate expected pipeline value (only active stages)
          const expectedValue = clientsData
            .filter(c => activeStages.includes(c.pipeline_stage))
            .reduce((sum, c) => sum + c.project_value, 0)

          // Filter clients to only those in active stages (what the query should return)
          const activeClients = clientsData
            .filter(c => activeStages.includes(c.pipeline_stage))
            .map(c => ({
              project_value: c.project_value,
              pipeline_stage: c.pipeline_stage
            }))

          // Mock the Supabase query
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: activeClients,
                error: null
              })
            })
          })

          // Call the calculatePipelineValue function
          const result = await calculatePipelineValue()

          // Verify no error occurred
          expect(result.error).toBeNull()
          expect(result.data).toBeDefined()

          // Property: Pipeline value should only include clients in active stages
          // and exclude Closed Won and Closed Lost
          expect(result.data).toBeCloseTo(expectedValue, 2)

          // Verify the query was called correctly
          expect(supabase.from).toHaveBeenCalledWith('clients')
          
          // Verify that the query filters by active stages only
          const selectCall = supabase.from.mock.results[0].value
          expect(selectCall.select).toHaveBeenCalledWith('project_value, pipeline_stage')
          expect(selectCall.select.mock.results[0].value.in).toHaveBeenCalledWith(
            'pipeline_stage',
            activeStages
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})

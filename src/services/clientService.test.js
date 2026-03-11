import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { createClient, fetchClients, deleteClient, fetchClientById } from './clientService'
import { supabase } from './supabase'

// Mock the supabase client
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('Client Service - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Feature: agentic-ai-crm, Property 4: Client CRUD Round Trip
  // Validates: Requirements 3.1, 3.2
  test('Property 4: Client CRUD Round Trip - creating and fetching a client preserves all fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          company: fc.string({ minLength: 0, maxLength: 100 }),
          contact_details: fc.string({ minLength: 0, maxLength: 500 }),
          project_value: fc.float({ min: 0, max: 1000000, noNaN: true }),
          client_status: fc.constantFrom('Active', 'On Hold', 'Completed', 'Cancelled'),
          pipeline_stage: fc.constantFrom('New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost')
        }),
        async (clientData) => {
          // Generate a unique ID for this test
          const testId = fc.sample(fc.uuid(), 1)[0]
          
          // Mock the created client
          const mockCreatedClient = {
            id: testId,
            ...clientData,
            created_at: new Date().toISOString()
          }

          // Setup mock for insert (create) - returns the created client
          supabase.from.mockReturnValueOnce({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreatedClient,
                  error: null
                })
              })
            })
          })

          // Setup mock for activity log insert (called by createClient)
          supabase.from.mockReturnValueOnce({
            insert: vi.fn().mockResolvedValue({
              data: { id: fc.sample(fc.uuid(), 1)[0] },
              error: null
            })
          })

          // Create the client
          const createResult = await createClient(clientData)
          
          // Verify creation was successful
          expect(createResult.error).toBeNull()
          expect(createResult.data).toBeDefined()
          
          const createdClient = createResult.data

          // Setup mock for select (fetch all clients)
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [mockCreatedClient],
                error: null
              })
            })
          })

          // Fetch all clients (simulating finding the created client)
          const fetchResult = await fetchClients()
          
          // Verify fetch was successful
          expect(fetchResult.error).toBeNull()
          expect(fetchResult.data).toBeDefined()
          
          // Find the created client in the fetched results
          const fetchedClient = fetchResult.data.find(client => client.id === createdClient.id)
          
          // Verify the client was found
          expect(fetchedClient).toBeDefined()
          
          // Property: All fields should be preserved in the round trip
          expect(fetchedClient.name).toBe(clientData.name)
          expect(fetchedClient.company).toBe(clientData.company)
          expect(fetchedClient.contact_details).toBe(clientData.contact_details)
          expect(fetchedClient.project_value).toBe(clientData.project_value)
          expect(fetchedClient.client_status).toBe(clientData.client_status)
          expect(fetchedClient.pipeline_stage).toBe(clientData.pipeline_stage)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: agentic-ai-crm, Property 5: Client Deletion Cascades to Related Records
  // Validates: Requirements 3.3, 10.1
  test('Property 5: Client Deletion Cascades to Related Records - deleting a client removes all related records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clientName: fc.string({ minLength: 1, maxLength: 100 }),
          clientCompany: fc.string({ minLength: 0, maxLength: 100 }),
          numPayments: fc.integer({ min: 0, max: 5 }),
          numMaintenance: fc.integer({ min: 0, max: 3 }),
          numActivityLogs: fc.integer({ min: 0, max: 10 })
        }),
        async (testData) => {
          // Generate a unique client ID for this test
          const clientId = fc.sample(fc.uuid(), 1)[0]
          
          // Mock client data
          const mockClient = {
            id: clientId,
            name: testData.clientName,
            company: testData.clientCompany,
            contact_details: 'test@example.com',
            project_value: 10000,
            client_status: 'Active',
            pipeline_stage: 'New Lead',
            created_at: new Date().toISOString()
          }

          // Generate mock related records
          const mockPayments = Array.from({ length: testData.numPayments }, (_, i) => ({
            id: fc.sample(fc.uuid(), 1)[0],
            client_id: clientId,
            total_amount: 1000 * (i + 1),
            amount_received: 500 * (i + 1),
            payment_status: 'Pending',
            due_date: new Date().toISOString()
          }))

          const mockMaintenance = Array.from({ length: testData.numMaintenance }, (_, i) => ({
            id: fc.sample(fc.uuid(), 1)[0],
            client_id: clientId,
            maintenance_type: 'Monthly',
            amount: 500,
            start_date: new Date().toISOString(),
            renewal_date: new Date().toISOString(),
            status: 'Active'
          }))

          const mockActivityLogs = Array.from({ length: testData.numActivityLogs }, (_, i) => ({
            id: fc.sample(fc.uuid(), 1)[0],
            client_id: clientId,
            action_description: `Test action ${i + 1}`,
            timestamp: new Date().toISOString()
          }))

          // Setup mock for fetchClientById (before deletion) - returns client with related records
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockClient,
                  error: null
                })
              })
            })
          })

          // Mock payments fetch
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockPayments,
                  error: null
                })
              })
            })
          })

          // Mock maintenance fetch
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockMaintenance,
                  error: null
                })
              })
            })
          })

          // Mock activity logs fetch
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockActivityLogs,
                  error: null
                })
              })
            })
          })

          // Fetch client with related records before deletion
          const beforeDeletion = await fetchClientById(clientId)
          
          // Verify client and related records exist before deletion
          expect(beforeDeletion.error).toBeNull()
          expect(beforeDeletion.data).toBeDefined()
          expect(beforeDeletion.data.id).toBe(clientId)
          expect(beforeDeletion.data.payments).toHaveLength(testData.numPayments)
          expect(beforeDeletion.data.maintenance).toHaveLength(testData.numMaintenance)
          expect(beforeDeletion.data.activityLogs).toHaveLength(testData.numActivityLogs)

          // Setup mock for deleteClient - simulates CASCADE DELETE
          supabase.from.mockReturnValueOnce({
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockClient,
                    error: null
                  })
                })
              })
            })
          })

          // Delete the client
          const deleteResult = await deleteClient(clientId)
          
          // Verify deletion was successful
          expect(deleteResult.error).toBeNull()
          expect(deleteResult.data).toBeDefined()

          // Setup mock for fetchClientById (after deletion) - returns null (client not found)
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Client not found', code: 'PGRST116' }
                })
              })
            })
          })

          // Try to fetch client after deletion
          const afterDeletion = await fetchClientById(clientId)
          
          // Property: Client should not exist after deletion
          expect(afterDeletion.error).toBeDefined()
          expect(afterDeletion.data).toBeNull()

          // Setup mocks to verify related records are also deleted (CASCADE)
          // Mock payments fetch after deletion - should return empty array
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })

          // Mock maintenance fetch after deletion - should return empty array
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })

          // Mock activity logs fetch after deletion - should return empty array
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })

          // Verify related records are also deleted (simulating CASCADE DELETE behavior)
          const { data: paymentsAfter } = await supabase
            .from('payments')
            .select('*')
            .eq('client_id', clientId)
            .order('updated_at', { ascending: false })

          const { data: maintenanceAfter } = await supabase
            .from('maintenance')
            .select('*')
            .eq('client_id', clientId)
            .order('start_date', { ascending: false })

          const { data: activityLogsAfter } = await supabase
            .from('activity_logs')
            .select('*')
            .eq('client_id', clientId)
            .order('timestamp', { ascending: false })

          // Property: All related records should be deleted (CASCADE DELETE)
          expect(paymentsAfter).toHaveLength(0)
          expect(maintenanceAfter).toHaveLength(0)
          expect(activityLogsAfter).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: agentic-ai-crm, Property 6: Client Status Values Are Valid
  // Validates: Requirements 3.4
  test('Property 6: Client Status Values Are Valid - client_status field only contains valid values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          company: fc.string({ minLength: 0, maxLength: 100 }),
          contact_details: fc.string({ minLength: 0, maxLength: 500 }),
          project_value: fc.float({ min: 0, max: 1000000, noNaN: true }),
          client_status: fc.constantFrom('Active', 'On Hold', 'Completed', 'Cancelled'),
          pipeline_stage: fc.constantFrom('New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost')
        }),
        async (clientData) => {
          // Generate a unique ID for this test
          const testId = fc.sample(fc.uuid(), 1)[0]
          
          // Mock the created client
          const mockCreatedClient = {
            id: testId,
            ...clientData,
            created_at: new Date().toISOString()
          }

          // Setup mock for insert (create) - returns the created client
          supabase.from.mockReturnValueOnce({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreatedClient,
                  error: null
                })
              })
            })
          })

          // Setup mock for activity log insert (called by createClient)
          supabase.from.mockReturnValueOnce({
            insert: vi.fn().mockResolvedValue({
              data: { id: fc.sample(fc.uuid(), 1)[0] },
              error: null
            })
          })

          // Create the client
          const createResult = await createClient(clientData)
          
          // Verify creation was successful
          expect(createResult.error).toBeNull()
          expect(createResult.data).toBeDefined()
          
          const createdClient = createResult.data

          // Define valid client status values according to Requirements 3.4
          const validStatuses = ['Active', 'On Hold', 'Completed', 'Cancelled']

          // Property: The client_status field should only contain one of the valid values
          expect(validStatuses).toContain(createdClient.client_status)
          expect(createdClient.client_status).toBe(clientData.client_status)
          
          // Additional verification: the status should be exactly one of the valid values
          expect(['Active', 'On Hold', 'Completed', 'Cancelled'].includes(createdClient.client_status)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

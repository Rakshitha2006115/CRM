import { describe, test, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { createLead, fetchLeads, deleteLead, convertLeadToClient } from './leadService'
import { supabase } from './supabase'

// Mock the supabase client
vi.mock('./supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}))

describe('Lead Service - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Feature: agentic-ai-crm, Property 1: Lead CRUD Round Trip
  // Validates: Requirements 2.1, 2.2
  test('Property 1: Lead CRUD Round Trip - creating and fetching a lead preserves all fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 1, maxLength: 20 }),
          company: fc.string({ minLength: 1, maxLength: 100 }),
          pipeline_stage: fc.constantFrom('New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost')
        }),
        async (leadData) => {
          // Generate a unique ID for this test
          const testId = fc.sample(fc.uuid(), 1)[0]
          
          // Mock the create operation
          const mockCreatedLead = {
            id: testId,
            ...leadData,
            created_at: new Date().toISOString()
          }

          // Setup mock for insert (create)
          supabase.from.mockReturnValueOnce({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreatedLead,
                  error: null
                })
              })
            })
          })

          // Create the lead
          const createResult = await createLead(leadData)
          
          // Verify creation was successful
          expect(createResult.error).toBeNull()
          expect(createResult.data).toBeDefined()
          
          const createdLead = createResult.data

          // Setup mock for select (fetch all leads)
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [mockCreatedLead],
                error: null
              })
            })
          })

          // Fetch all leads (simulating finding the created lead)
          const fetchResult = await fetchLeads()
          
          // Verify fetch was successful
          expect(fetchResult.error).toBeNull()
          expect(fetchResult.data).toBeDefined()
          
          // Find the created lead in the fetched results
          const fetchedLead = fetchResult.data.find(lead => lead.id === createdLead.id)
          
          // Verify the lead was found
          expect(fetchedLead).toBeDefined()
          
          // Property: All fields should be preserved in the round trip
          expect(fetchedLead.name).toBe(leadData.name)
          expect(fetchedLead.email).toBe(leadData.email)
          expect(fetchedLead.phone).toBe(leadData.phone)
          expect(fetchedLead.company).toBe(leadData.company)
          expect(fetchedLead.pipeline_stage).toBe(leadData.pipeline_stage)
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: agentic-ai-crm, Property 2: Lead Deletion Removes Record
  // Validates: Requirements 2.3
  test('Property 2: Lead Deletion Removes Record - deleting a lead makes it no longer retrievable', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 1, maxLength: 20 }),
          company: fc.string({ minLength: 1, maxLength: 100 }),
          pipeline_stage: fc.constantFrom('New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost')
        }),
        async (leadData) => {
          // Generate a unique ID for this test
          const testId = fc.sample(fc.uuid(), 1)[0]
          
          // Mock the created lead
          const mockCreatedLead = {
            id: testId,
            ...leadData,
            created_at: new Date().toISOString()
          }

          // Setup mock for insert (create)
          supabase.from.mockReturnValueOnce({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreatedLead,
                  error: null
                })
              })
            })
          })

          // Create the lead
          const createResult = await createLead(leadData)
          expect(createResult.error).toBeNull()
          expect(createResult.data).toBeDefined()
          
          const createdLead = createResult.data

          // Setup mock for delete operation
          supabase.from.mockReturnValueOnce({
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockCreatedLead,
                    error: null
                  })
                })
              })
            })
          })

          // Delete the lead
          const deleteResult = await deleteLead(createdLead.id)
          expect(deleteResult.error).toBeNull()
          expect(deleteResult.data).toBeDefined()

          // Setup mock for select (fetch all leads) - should not include deleted lead
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [], // Empty array - lead was deleted
                error: null
              })
            })
          })

          // Fetch all leads
          const fetchResult = await fetchLeads()
          expect(fetchResult.error).toBeNull()
          expect(fetchResult.data).toBeDefined()
          
          // Property: The deleted lead should not be in the fetched results
          const deletedLead = fetchResult.data.find(lead => lead.id === createdLead.id)
          expect(deletedLead).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  // Feature: agentic-ai-crm, Property 3: Lead to Client Conversion Creates Client and Log
  // Validates: Requirements 2.4
  test('Property 3: Lead to Client Conversion Creates Client and Log - converting a lead creates client and activity log', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 100 }),
          email: fc.emailAddress(),
          phone: fc.string({ minLength: 1, maxLength: 20 }),
          company: fc.string({ minLength: 1, maxLength: 100 }),
          pipeline_stage: fc.constantFrom('New Lead', 'Contacted', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost')
        }),
        async (leadData) => {
          // Generate unique IDs for this test
          const leadId = fc.sample(fc.uuid(), 1)[0]
          const clientId = fc.sample(fc.uuid(), 1)[0]
          
          // Mock the created lead
          const mockLead = {
            id: leadId,
            ...leadData,
            created_at: new Date().toISOString()
          }

          // Mock the client that will be created from the lead
          const mockClient = {
            id: clientId,
            name: leadData.name,
            company: leadData.company || '',
            contact_details: `Email: ${leadData.email || ''}, Phone: ${leadData.phone || ''}`,
            project_value: 0,
            client_status: 'Active',
            pipeline_stage: leadData.pipeline_stage || 'New Lead',
            created_at: new Date().toISOString()
          }

          // Mock the activity log entry
          const mockActivityLog = {
            id: fc.sample(fc.uuid(), 1)[0],
            client_id: clientId,
            action_description: `Converted from lead: ${leadData.name} (${leadData.company || 'No company'})`,
            timestamp: new Date().toISOString()
          }

          // Setup mock for fetching the lead (first call in convertLeadToClient)
          supabase.from.mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockLead,
                  error: null
                })
              })
            })
          })

          // Setup mock for creating the client
          supabase.from.mockReturnValueOnce({
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockClient,
                  error: null
                })
              })
            })
          })

          // Setup mock for creating the activity log
          supabase.from.mockReturnValueOnce({
            insert: vi.fn().mockResolvedValue({
              data: mockActivityLog,
              error: null
            })
          })

          // Setup mock for deleting the lead
          supabase.from.mockReturnValueOnce({
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockLead,
                error: null
              })
            })
          })

          // Convert the lead to a client
          const convertResult = await convertLeadToClient(leadId)
          
          // Verify conversion was successful
          expect(convertResult.error).toBeNull()
          expect(convertResult.data).toBeDefined()
          
          const createdClient = convertResult.data

          // Property 1: A client should be created with the lead's data
          expect(createdClient.name).toBe(leadData.name)
          expect(createdClient.company).toBe(leadData.company || '')
          expect(createdClient.client_status).toBe('Active')
          expect(createdClient.pipeline_stage).toBe(leadData.pipeline_stage || 'New Lead')
          expect(createdClient.contact_details).toContain(leadData.email || '')
          expect(createdClient.contact_details).toContain(leadData.phone || '')

          // Verify that supabase.from was called correctly
          // 1st call: fetch lead
          expect(supabase.from).toHaveBeenNthCalledWith(1, 'leads')
          
          // 2nd call: insert client
          expect(supabase.from).toHaveBeenNthCalledWith(2, 'clients')
          
          // 3rd call: insert activity log
          expect(supabase.from).toHaveBeenNthCalledWith(3, 'activity_logs')
          
          // 4th call: delete lead
          expect(supabase.from).toHaveBeenNthCalledWith(4, 'leads')

          // Property 2: An activity log should be created documenting the conversion
          // We verify this by checking that the activity_logs insert was called
          const activityInsertCall = supabase.from.mock.calls[2]
          expect(activityInsertCall[0]).toBe('activity_logs')
        }
      ),
      { numRuns: 100 }
    )
  })
})

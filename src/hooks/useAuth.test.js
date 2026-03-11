import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import * as fc from 'fast-check'
import { useAuth } from './useAuth'
import { supabase } from '../services/supabase'

// Mock the supabase module
vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}))

describe('Authentication Property Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock implementations
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
    })
    
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })
  })

  /**
   * Property 1: Valid credentials authenticate and redirect
   * Feature: agentic-ai-crm, Property 1: Valid credentials authenticate and redirect
   * Validates: Requirements 1.1
   * 
   * For any valid email and password combination, when a user signs in with valid credentials,
   * the system should authenticate successfully and return a user object.
   */
  it('Property 1: Valid credentials authenticate and redirect', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 8, maxLength: 50 }),
          userId: fc.uuid(),
          userEmail: fc.emailAddress(),
        }),
        async ({ email, password, userId, userEmail }) => {
          // Reset mocks for each property test iteration
          vi.clearAllMocks()
          
          // Setup mocks for this iteration
          supabase.auth.getSession.mockResolvedValue({
            data: { session: null },
          })
          
          supabase.auth.onAuthStateChange.mockReturnValue({
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          })
          
          // Mock successful authentication
          const mockUser = {
            id: userId,
            email: userEmail,
            aud: 'authenticated',
            role: 'authenticated',
          }
          
          supabase.auth.signInWithPassword.mockResolvedValue({
            data: {
              user: mockUser,
              session: {
                access_token: 'mock-token',
                user: mockUser,
              },
            },
            error: null,
          })

          // Render the hook
          const { result } = renderHook(() => useAuth())

          // Wait for initial loading to complete
          await waitFor(
            () => {
              expect(result.current.loading).toBe(false)
            },
            { timeout: 1000 }
          )

          // Call signIn with the generated credentials
          const { user, error } = await result.current.signIn(email, password)

          // Verify authentication was successful
          expect(error).toBeNull()
          expect(user).toBeDefined()
          expect(user).toHaveProperty('id')
          expect(user).toHaveProperty('email')
          expect(user.id).toBe(userId)
          
          // Verify signInWithPassword was called with correct credentials
          expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email,
            password,
          })
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)

  /**
   * Property 2: Invalid credentials show error
   * Feature: agentic-ai-crm, Property 2: Invalid credentials show error
   * Validates: Requirements 1.2
   * 
   * For any invalid email and password combination, when a user attempts to sign in,
   * the system should return an error and no user object.
   */
  it('Property 2: Invalid credentials show error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 1, maxLength: 50 }),
        }),
        async ({ email, password }) => {
          // Reset mocks for each property test iteration
          vi.clearAllMocks()
          
          // Setup mocks for this iteration
          supabase.auth.getSession.mockResolvedValue({
            data: { session: null },
          })
          
          supabase.auth.onAuthStateChange.mockReturnValue({
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          })
          
          // Mock authentication failure with invalid credentials
          const mockError = {
            message: 'Invalid login credentials',
            status: 400,
            name: 'AuthApiError',
          }
          
          supabase.auth.signInWithPassword.mockResolvedValue({
            data: {
              user: null,
              session: null,
            },
            error: mockError,
          })

          // Render the hook
          const { result } = renderHook(() => useAuth())

          // Wait for initial loading to complete
          await waitFor(
            () => {
              expect(result.current.loading).toBe(false)
            },
            { timeout: 1000 }
          )

          // Call signIn with the invalid credentials
          const { user, error } = await result.current.signIn(email, password)

          // Verify authentication failed
          expect(user).toBeNull()
          expect(error).toBeDefined()
          expect(error).not.toBeNull()
          expect(error).toHaveProperty('message')
          
          // Verify signInWithPassword was called with the credentials
          expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
            email,
            password,
          })
        }
      ),
      { numRuns: 100 }
    )
  }, 30000)
})

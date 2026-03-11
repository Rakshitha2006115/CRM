import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('Supabase Client Initialization', () => {
  beforeEach(() => {
    // Clear module cache to test fresh imports
    vi.resetModules()
  })

  it('should properly configure the Supabase client with environment variables', async () => {
    // Set environment variables
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key-123')

    // Import the supabase client
    const { supabase } = await import('./supabase.js')

    // Verify the client is properly configured
    expect(supabase).toBeDefined()
    expect(supabase.supabaseUrl).toBe('https://test.supabase.co')
    expect(supabase.supabaseKey).toBe('test-anon-key-123')
  })

  it('should load environment variables correctly', async () => {
    // Set specific environment variables
    const testUrl = 'https://myproject.supabase.co'
    const testKey = 'my-anon-key-456'
    
    vi.stubEnv('VITE_SUPABASE_URL', testUrl)
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', testKey)

    // Import the supabase client
    const { supabase } = await import('./supabase.js')

    // Verify environment variables are loaded
    expect(supabase.supabaseUrl).toBe(testUrl)
    expect(supabase.supabaseKey).toBe(testKey)
  })

  it('should throw an error when VITE_SUPABASE_URL is missing', async () => {
    // Clear the URL environment variable
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')

    // Expect import to throw an error
    await expect(async () => {
      await import('./supabase.js?missing-url')
    }).rejects.toThrow('Missing Supabase environment variables')
  })

  it('should throw an error when VITE_SUPABASE_ANON_KEY is missing', async () => {
    // Clear the key environment variable
    vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    // Expect import to throw an error
    await expect(async () => {
      await import('./supabase.js?missing-key')
    }).rejects.toThrow('Missing Supabase environment variables')
  })

  it('should throw an error when both environment variables are missing', async () => {
    // Clear both environment variables
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    // Expect import to throw an error
    await expect(async () => {
      await import('./supabase.js?missing-both')
    }).rejects.toThrow('Missing Supabase environment variables')
  })
})

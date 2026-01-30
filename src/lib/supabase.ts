import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Check environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Create clients conditionally - will be null during build if env vars missing
let supabaseClient: SupabaseClient | null = null
let supabaseAdminClient: SupabaseClient | null = null

// Initialize only if we have the required env vars
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  supabaseAdminClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY
  )
}

// Helper to get client with runtime check
function ensureClient(): SupabaseClient {
  if (!supabaseClient) {
    // Try to create it now (for serverless cold starts)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      supabaseClient = createClient(url, key)
      return supabaseClient
    }
    throw new Error('Supabase client not initialized - check environment variables')
  }
  return supabaseClient
}

function ensureAdminClient(): SupabaseClient {
  if (!supabaseAdminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      supabaseAdminClient = createClient(url, key)
      return supabaseAdminClient
    }
    throw new Error('Supabase admin client not initialized - check environment variables')
  }
  return supabaseAdminClient
}

// Export wrapped clients
export const supabase = {
  from: (table: string) => ensureClient().from(table),
  rpc: (fn: string, params?: object) => ensureClient().rpc(fn, params),
}

export const supabaseAdmin = {
  from: (table: string) => ensureAdminClient().from(table),
  rpc: (fn: string, params?: object) => ensureAdminClient().rpc(fn, params),
}

// Database types
export type Database = {
  public: {
    Tables: {
      quran_verses: {
        Row: {
          id: number
          surah_number: number
          ayah_number: number
          arabic_text: string
          english_text: string
          transliteration: string
          embedding: number[] | null
        }
        Insert: {
          id?: number
          surah_number: number
          ayah_number: number
          arabic_text: string
          english_text: string
          transliteration: string
          embedding?: number[] | null
        }
        Update: {
          id?: number
          surah_number?: number
          ayah_number?: number
          arabic_text?: string
          english_text?: string
          transliteration?: string
          embedding?: number[] | null
        }
      }
      hadith: {
        Row: {
          id: string
          collection: string
          book_number: number
          hadith_number: number
          arabic_text: string
          english_text: string
          grade: string
          narrator_chain: string
          embedding: number[] | null
        }
        Insert: {
          id?: string
          collection: string
          book_number: number
          hadith_number: number
          arabic_text: string
          english_text: string
          grade?: string
          narrator_chain?: string
          embedding?: number[] | null
        }
        Update: {
          id?: string
          collection?: string
          book_number?: number
          hadith_number?: number
          arabic_text?: string
          english_text?: string
          grade?: string
          narrator_chain?: string
          embedding?: number[] | null
        }
      }
      transcripts: {
        Row: {
          id: string
          title: string
          original_text: string
          annotated_text: string | null
          created_at: string
          status: string
        }
        Insert: {
          id?: string
          title: string
          original_text: string
          annotated_text?: string | null
          created_at?: string
          status?: string
        }
        Update: {
          id?: string
          title?: string
          original_text?: string
          annotated_text?: string | null
          created_at?: string
          status?: string
        }
      }
      annotations: {
        Row: {
          id: string
          transcript_id: string
          type: string
          reference_id: string
          original_text: string
          corrected_text: string
          confidence: number
          start_index: number
          end_index: number
        }
        Insert: {
          id?: string
          transcript_id: string
          type: string
          reference_id: string
          original_text: string
          corrected_text: string
          confidence: number
          start_index: number
          end_index: number
        }
        Update: {
          id?: string
          transcript_id?: string
          type?: string
          reference_id?: string
          original_text?: string
          corrected_text?: string
          confidence?: number
          start_index?: number
          end_index?: number
        }
      }
    }
  }
}

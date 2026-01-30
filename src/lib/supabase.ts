import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Completely lazy-initialized clients - NO top-level creation
let _supabaseClient: SupabaseClient | undefined
let _supabaseAdminClient: SupabaseClient | undefined

function getClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    throw new Error('Supabase not configured')
  }

  _supabaseClient = createClient(url, key)
  return _supabaseClient
}

function getAdminClient(): SupabaseClient {
  if (_supabaseAdminClient) return _supabaseAdminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    console.error('Missing Supabase environment variables')
    throw new Error('Supabase not configured')
  }

  _supabaseAdminClient = createClient(url, key)
  return _supabaseAdminClient
}

// Export objects that lazily create clients only when methods are called
export const supabase = {
  from: (table: string) => getClient().from(table),
  rpc: (fn: string, params?: object) => getClient().rpc(fn, params),
}

export const supabaseAdmin = {
  from: (table: string) => getAdminClient().from(table),
  rpc: (fn: string, params?: object) => getAdminClient().rpc(fn, params),
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

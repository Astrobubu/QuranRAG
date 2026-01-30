import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Lazy-initialized clients to avoid build-time errors
let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || ''
}

function getSupabaseAnonKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || ''
}

// Client for browser/frontend use (lazy initialization)
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = getSupabaseUrl()
    const key = getSupabaseAnonKey()
    if (url && key) {
      _supabase = createClient(url, key)
    } else {
      throw new Error('Supabase URL or Anon Key not configured')
    }
  }
  return _supabase
}

// Admin client for server-side operations (lazy initialization)
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = getSupabaseUrl()
    const key = getSupabaseServiceKey() || getSupabaseAnonKey()
    if (url && key) {
      _supabaseAdmin = createClient(url, key)
    } else {
      throw new Error('Supabase URL or Service Key not configured')
    }
  }
  return _supabaseAdmin
}

// Backwards compatibility exports (will throw if used during build)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as any)[prop]
  }
})

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseAdmin() as any)[prop]
  }
})

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

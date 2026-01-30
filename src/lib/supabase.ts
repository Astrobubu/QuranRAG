import { createClient } from '@supabase/supabase-js'

// Create clients only at runtime, not during build
function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(url, key)
}

function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }
  return createClient(url, key)
}

// Lazy singletons
let _supabase: ReturnType<typeof createClient> | null = null
let _supabaseAdmin: ReturnType<typeof createClient> | null = null

export const supabase = {
  from: (...args: Parameters<ReturnType<typeof createClient>['from']>) => {
    if (!_supabase) _supabase = createSupabaseClient()
    return _supabase.from(...args)
  },
  rpc: (...args: Parameters<ReturnType<typeof createClient>['rpc']>) => {
    if (!_supabase) _supabase = createSupabaseClient()
    return _supabase.rpc(...args)
  },
}

export const supabaseAdmin = {
  from: (...args: Parameters<ReturnType<typeof createClient>['from']>) => {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdmin()
    return _supabaseAdmin.from(...args)
  },
  rpc: (...args: Parameters<ReturnType<typeof createClient>['rpc']>) => {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdmin()
    return _supabaseAdmin.rpc(...args)
  },
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

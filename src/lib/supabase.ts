import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client for browser/frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations (with service role key)
export const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : supabase

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

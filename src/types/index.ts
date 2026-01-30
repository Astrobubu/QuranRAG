// Database types
export interface QuranVerse {
  id: number
  surah_number: number
  ayah_number: number
  arabic_text: string
  english_text: string
  transliteration: string
  embedding?: number[]
}

export interface Hadith {
  id: string
  collection: string
  book_number: number
  hadith_number: number
  arabic_text: string
  english_text: string
  grade: string
  narrator_chain: string
  embedding?: number[]
}

export interface Transcript {
  id: string
  title: string
  original_text: string
  annotated_text: string | null
  created_at: string
  status: 'pending' | 'processing' | 'complete' | 'error'
}

export interface Annotation {
  id: string
  transcript_id: string
  type: 'quran' | 'hadith'
  reference_id: string
  original_text: string
  corrected_text: string
  confidence: number
  start_index: number
  end_index: number
}

// API types
export interface DetectedReference {
  type: 'quran' | 'hadith'
  original_text: string
  corrected_text: string
  start_index: number
  end_index: number
  context: string
}

export interface MatchResult {
  reference: QuranVerse | Hadith
  similarity: number
  type: 'quran' | 'hadith'
}

export interface VerifiedMatch {
  detected: DetectedReference
  match: MatchResult | null
  confidence: number
  reference_id: string | null
}

export interface ProcessingResult {
  annotated_text: string
  annotations: Annotation[]
  stats: {
    total_detected: number
    quran_matches: number
    hadith_matches: number
    low_confidence_skipped: number
  }
}

// Annotation format for display
export interface AnnotationData {
  type: 'quran' | 'hadith'
  reference: string
  arabic: string
  english: string
  confidence: number
  original_spoken: string
  transliteration?: string
  collection?: string
  grade?: string
}

// Surah metadata
export interface SurahInfo {
  number: number
  name: string
  english_name: string
  total_verses: number
}

// Processing status
export interface ProcessingStatus {
  stage: 'preprocessing' | 'detection' | 'matching' | 'verification' | 'annotation' | 'complete' | 'error'
  progress: number
  message: string
  chunks_processed?: number
  total_chunks?: number
}

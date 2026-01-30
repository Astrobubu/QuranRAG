import { supabaseAdmin } from './supabase'
import { generateEmbedding } from './embeddings'
import type { QuranVerse, Hadith, MatchResult } from '@/types'

/**
 * Search for similar Quran verses using semantic search
 */
export async function searchQuranVerses(
  queryText: string,
  threshold: number = 0.5,
  limit: number = 5
): Promise<(QuranVerse & { similarity: number })[]> {
  // Generate embedding for the query
  const embedding = await generateEmbedding(queryText)

  // Use the Supabase RPC function for vector search
  const { data, error } = await supabaseAdmin.rpc('search_quran_verses', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    console.error('Error searching Quran verses:', error)
    throw error
  }

  return data || []
}

/**
 * Search for similar Hadith using semantic search
 */
export async function searchHadith(
  queryText: string,
  threshold: number = 0.5,
  limit: number = 5
): Promise<(Hadith & { similarity: number })[]> {
  // Generate embedding for the query
  const embedding = await generateEmbedding(queryText)

  // Use the Supabase RPC function for vector search
  const { data, error } = await supabaseAdmin.rpc('search_hadith', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    console.error('Error searching Hadith:', error)
    throw error
  }

  return data || []
}

/**
 * Search both Quran and Hadith, returning the best matches
 */
export async function searchAll(
  queryText: string,
  threshold: number = 0.5,
  limit: number = 3
): Promise<MatchResult[]> {
  const [quranResults, hadithResults] = await Promise.all([
    searchQuranVerses(queryText, threshold, limit),
    searchHadith(queryText, threshold, limit),
  ])

  const results: MatchResult[] = [
    ...quranResults.map(verse => ({
      reference: verse,
      similarity: verse.similarity,
      type: 'quran' as const,
    })),
    ...hadithResults.map(hadith => ({
      reference: hadith,
      similarity: hadith.similarity,
      type: 'hadith' as const,
    })),
  ]

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity)

  return results.slice(0, limit)
}

/**
 * Get a specific Quran verse by surah and ayah number
 */
export async function getQuranVerse(
  surahNumber: number,
  ayahNumber: number
): Promise<QuranVerse | null> {
  const { data, error } = await supabaseAdmin
    .from('quran_verses')
    .select('*')
    .eq('surah_number', surahNumber)
    .eq('ayah_number', ayahNumber)
    .single()

  if (error) {
    console.error('Error fetching Quran verse:', error)
    return null
  }

  return data
}

/**
 * Get a specific Hadith by collection, book, and number
 */
export async function getHadith(
  collection: string,
  bookNumber: number,
  hadithNumber: number
): Promise<Hadith | null> {
  const { data, error } = await supabaseAdmin
    .from('hadith')
    .select('*')
    .eq('collection', collection)
    .eq('book_number', bookNumber)
    .eq('hadith_number', hadithNumber)
    .single()

  if (error) {
    console.error('Error fetching Hadith:', error)
    return null
  }

  return data
}

/**
 * Get multiple Quran verses for a range
 */
export async function getQuranVerseRange(
  surahNumber: number,
  startAyah: number,
  endAyah: number
): Promise<QuranVerse[]> {
  const { data, error } = await supabaseAdmin
    .from('quran_verses')
    .select('*')
    .eq('surah_number', surahNumber)
    .gte('ayah_number', startAyah)
    .lte('ayah_number', endAyah)
    .order('ayah_number')

  if (error) {
    console.error('Error fetching Quran verse range:', error)
    return []
  }

  return data || []
}

/**
 * Get verse by sequential ID (1-6236)
 */
export async function getQuranVerseById(id: number): Promise<QuranVerse | null> {
  const { data, error } = await supabaseAdmin
    .from('quran_verses')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching Quran verse by ID:', error)
    return null
  }

  return data
}

/**
 * Get Hadith by UUID
 */
export async function getHadithById(id: string): Promise<Hadith | null> {
  const { data, error } = await supabaseAdmin
    .from('hadith')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching Hadith by ID:', error)
    return null
  }

  return data
}

/**
 * Search by exact Arabic text match (with normalization)
 */
export async function findExactQuranMatch(
  arabicText: string
): Promise<QuranVerse | null> {
  // This is a simplified version - in production you'd want to
  // normalize the Arabic text and use a more sophisticated matching

  const { data, error } = await supabaseAdmin
    .from('quran_verses')
    .select('*')
    .textSearch('arabic_text', arabicText)
    .limit(1)
    .single()

  if (error) {
    return null
  }

  return data
}

/**
 * Get all verses from a surah
 */
export async function getSurahVerses(surahNumber: number): Promise<QuranVerse[]> {
  const { data, error } = await supabaseAdmin
    .from('quran_verses')
    .select('*')
    .eq('surah_number', surahNumber)
    .order('ayah_number')

  if (error) {
    console.error('Error fetching surah verses:', error)
    return []
  }

  return data || []
}

/**
 * Get hadith by collection
 */
export async function getHadithByCollection(
  collection: string,
  limit: number = 100,
  offset: number = 0
): Promise<Hadith[]> {
  const { data, error } = await supabaseAdmin
    .from('hadith')
    .select('*')
    .eq('collection', collection)
    .order('book_number')
    .order('hadith_number')
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('Error fetching hadith by collection:', error)
    return []
  }

  return data || []
}

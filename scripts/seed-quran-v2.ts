/**
 * Seed Quran using quran.com API v4
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const QURAN_API = 'https://api.quran.com/api/v4'

interface QuranVerse {
  surah_number: number
  ayah_number: number
  arabic_text: string
  english_text: string
  transliteration: string
}

// Surah names for reference
const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatiha', 2: 'Al-Baqarah', 3: 'Aal-Imran', 4: 'An-Nisa', 5: 'Al-Maidah',
  6: 'Al-Anam', 7: 'Al-Araf', 8: 'Al-Anfal', 9: 'At-Tawbah', 10: 'Yunus',
  11: 'Hud', 12: 'Yusuf', 13: 'Ar-Ra\'d', 14: 'Ibrahim', 15: 'Al-Hijr',
  16: 'An-Nahl', 17: 'Al-Isra', 18: 'Al-Kahf', 19: 'Maryam', 20: 'Ta-Ha',
  // ... abbreviated for brevity
}

async function fetchSurahVerses(surahNumber: number): Promise<QuranVerse[]> {
  const verses: QuranVerse[] = []

  try {
    // Fetch Arabic text with Uthmani script
    const arabicResponse = await fetch(
      `${QURAN_API}/verses/by_chapter/${surahNumber}?fields=text_uthmani&per_page=300`
    )
    const arabicData = await arabicResponse.json()

    // Fetch English translation (Sahih International = 131)
    const englishResponse = await fetch(
      `${QURAN_API}/quran/translations/131?chapter_number=${surahNumber}`
    )
    const englishData = await englishResponse.json()

    // Build verses array
    for (let i = 0; i < arabicData.verses.length; i++) {
      const verse = arabicData.verses[i]
      const translation = englishData.translations?.[i]

      verses.push({
        surah_number: surahNumber,
        ayah_number: verse.verse_number,
        arabic_text: verse.text_uthmani || '',
        english_text: translation?.text?.replace(/<[^>]*>/g, '') || '',
        transliteration: '', // Will add later if available
      })
    }
  } catch (error) {
    console.error(`Error fetching surah ${surahNumber}:`, error)
  }

  return verses
}

async function generateEmbeddings(verses: QuranVerse[]): Promise<number[][]> {
  const texts = verses.map(v =>
    `Quran ${v.surah_number}:${v.ayah_number}. Arabic: ${v.arabic_text}. English: ${v.english_text}`
  )

  const embeddings: number[][] = []
  const batchSize = 100

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    })

    embeddings.push(...response.data.map(d => d.embedding))
    console.log(`  Embeddings: ${Math.min(i + batchSize, texts.length)}/${texts.length}`)

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return embeddings
}

async function seedQuran() {
  console.log('Starting Quran seeding (v2)...')

  // Check if data already exists
  const { count } = await supabase
    .from('quran_verses')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    console.log(`Database already contains ${count} verses.`)
    console.log('Delete existing data first if you want to reseed.')
    return
  }

  let totalVerses = 0

  // Process each surah
  for (let surahNum = 1; surahNum <= 114; surahNum++) {
    console.log(`\nProcessing Surah ${surahNum}/114...`)

    // Fetch verses
    const verses = await fetchSurahVerses(surahNum)
    if (verses.length === 0) {
      console.log(`  No verses fetched, skipping...`)
      continue
    }

    console.log(`  Fetched ${verses.length} verses`)

    // Generate embeddings
    const embeddings = await generateEmbeddings(verses)

    // Prepare data for insertion
    const insertData = verses.map((v, i) => ({
      surah_number: v.surah_number,
      ayah_number: v.ayah_number,
      arabic_text: v.arabic_text,
      english_text: v.english_text,
      transliteration: v.transliteration,
      embedding: embeddings[i],
    }))

    // Insert into database
    const { error } = await supabase
      .from('quran_verses')
      .insert(insertData)

    if (error) {
      console.error(`  Error inserting surah ${surahNum}:`, error.message)
    } else {
      totalVerses += verses.length
      console.log(`  Inserted ${verses.length} verses`)
    }

    // Rate limiting between surahs
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log(`\nSeeding complete! Total verses inserted: ${totalVerses}`)
}

seedQuran().catch(console.error)

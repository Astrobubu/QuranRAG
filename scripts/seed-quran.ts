/**
 * Script to seed the Quran verses database
 * Uses the quran.com API to fetch verses and generates embeddings
 *
 * Run with: npm run seed:quran
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// Quran.com API base URL
const QURAN_API = 'https://api.quran.com/api/v4'

// Number of verses in each surah
const SURAH_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6
]

interface QuranVerse {
  surah_number: number
  ayah_number: number
  arabic_text: string
  english_text: string
  transliteration: string
}

async function fetchSurahVerses(surahNumber: number): Promise<QuranVerse[]> {
  const verses: QuranVerse[] = []

  try {
    // Fetch Arabic text
    const arabicResponse = await fetch(
      `${QURAN_API}/quran/verses/uthmani?chapter_number=${surahNumber}`
    )
    const arabicData = await arabicResponse.json()

    // Fetch English translation (Sahih International - translation 131)
    const englishResponse = await fetch(
      `${QURAN_API}/quran/translations/131?chapter_number=${surahNumber}`
    )
    const englishData = await englishResponse.json()

    // Fetch transliteration
    const translitResponse = await fetch(
      `${QURAN_API}/quran/verses/transliteration?chapter_number=${surahNumber}`
    )
    const translitData = await translitResponse.json()

    // Combine data
    for (let i = 0; i < arabicData.verses.length; i++) {
      const arabic = arabicData.verses[i]
      const english = englishData.translations[i]
      const translit = translitData.verses[i]

      verses.push({
        surah_number: surahNumber,
        ayah_number: arabic.verse_key.split(':')[1],
        arabic_text: arabic.text_uthmani,
        english_text: english.text.replace(/<[^>]*>/g, ''), // Remove HTML tags
        transliteration: translit?.text || '',
      })
    }
  } catch (error) {
    console.error(`Error fetching surah ${surahNumber}:`, error)
  }

  return verses
}

async function generateEmbeddings(verses: QuranVerse[]): Promise<number[][]> {
  const texts = verses.map(v =>
    `Quran ${v.surah_number}:${v.ayah_number}. Arabic: ${v.arabic_text}. English: ${v.english_text}. Transliteration: ${v.transliteration}`
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

    console.log(`Generated embeddings for ${Math.min(i + batchSize, texts.length)}/${texts.length} verses`)

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return embeddings
}

async function seedQuran() {
  console.log('Starting Quran seeding...')

  // Check if data already exists
  const { count } = await supabase
    .from('quran_verses')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    console.log(`Database already contains ${count} verses. Skipping seed.`)
    console.log('To reseed, first delete existing data.')
    return
  }

  let totalVerses = 0

  // Process each surah
  for (let surahNum = 1; surahNum <= 114; surahNum++) {
    console.log(`\nProcessing Surah ${surahNum}/114...`)

    // Fetch verses
    const verses = await fetchSurahVerses(surahNum)
    if (verses.length === 0) continue

    // Generate embeddings
    console.log(`Generating embeddings for ${verses.length} verses...`)
    const embeddings = await generateEmbeddings(verses)

    // Prepare data for insertion
    const insertData = verses.map((v, i) => ({
      surah_number: v.surah_number,
      ayah_number: parseInt(v.ayah_number.toString()),
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
      console.error(`Error inserting surah ${surahNum}:`, error)
    } else {
      totalVerses += verses.length
      console.log(`Inserted ${verses.length} verses from Surah ${surahNum}`)
    }

    // Rate limiting between surahs
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log(`\nSeeding complete! Total verses inserted: ${totalVerses}`)
}

// Alternative: Seed from local JSON file (faster, no API calls)
async function seedQuranFromJSON(jsonPath: string) {
  console.log('Seeding Quran from local JSON file...')

  const fs = await import('fs')
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))

  // ... implementation for JSON seeding
}

// Run the seeding
seedQuran().catch(console.error)

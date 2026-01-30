/**
 * Continue seeding Quran from a specific surah
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

// Start from this surah (change as needed)
const START_SURAH = parseInt(process.argv[2]) || 8

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
    const arabicResponse = await fetch(
      `${QURAN_API}/verses/by_chapter/${surahNumber}?fields=text_uthmani&per_page=300`
    )
    const arabicData = await arabicResponse.json()

    const englishResponse = await fetch(
      `${QURAN_API}/quran/translations/131?chapter_number=${surahNumber}`
    )
    const englishData = await englishResponse.json()

    for (let i = 0; i < arabicData.verses.length; i++) {
      const verse = arabicData.verses[i]
      const translation = englishData.translations?.[i]

      verses.push({
        surah_number: surahNumber,
        ayah_number: verse.verse_number,
        arabic_text: verse.text_uthmani || '',
        english_text: translation?.text?.replace(/<[^>]*>/g, '') || '',
        transliteration: '',
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

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return embeddings
}

async function seedQuran() {
  console.log(`Continuing Quran seeding from Surah ${START_SURAH}...`)

  let totalVerses = 0

  for (let surahNum = START_SURAH; surahNum <= 114; surahNum++) {
    // Check if this surah already exists
    const { count } = await supabase
      .from('quran_verses')
      .select('*', { count: 'exact', head: true })
      .eq('surah_number', surahNum)

    if (count && count > 0) {
      console.log(`Surah ${surahNum} already exists (${count} verses), skipping...`)
      continue
    }

    console.log(`\nProcessing Surah ${surahNum}/114...`)

    const verses = await fetchSurahVerses(surahNum)
    if (verses.length === 0) {
      console.log(`  No verses fetched, skipping...`)
      continue
    }

    console.log(`  Fetched ${verses.length} verses`)

    const embeddings = await generateEmbeddings(verses)

    const insertData = verses.map((v, i) => ({
      surah_number: v.surah_number,
      ayah_number: v.ayah_number,
      arabic_text: v.arabic_text,
      english_text: v.english_text,
      transliteration: v.transliteration,
      embedding: embeddings[i],
    }))

    const { error } = await supabase
      .from('quran_verses')
      .insert(insertData)

    if (error) {
      console.error(`  Error inserting surah ${surahNum}:`, error.message)
    } else {
      totalVerses += verses.length
      console.log(`  Inserted ${verses.length} verses (total: ${totalVerses})`)
    }

    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log(`\nSeeding complete! Added ${totalVerses} verses`)
}

seedQuran().catch(console.error)

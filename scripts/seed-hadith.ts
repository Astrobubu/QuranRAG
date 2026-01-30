/**
 * Script to seed the Hadith database
 * Uses the sunnah.com API to fetch hadith and generates embeddings
 *
 * Run with: npm run seed:hadith
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

// Sunnah.com API - Note: You'll need an API key from sunnah.com
const SUNNAH_API = 'https://api.sunnah.com/v1'
const SUNNAH_API_KEY = process.env.SUNNAH_API_KEY || ''

// Collections to seed (Phase 1: Bukhari and Muslim only)
const COLLECTIONS = [
  { name: 'bukhari', displayName: 'Sahih al-Bukhari', totalBooks: 97 },
  { name: 'muslim', displayName: 'Sahih Muslim', totalBooks: 56 },
]

interface HadithEntry {
  collection: string
  book_number: number
  hadith_number: number
  arabic_text: string
  english_text: string
  grade: string
  narrator_chain: string
}

async function fetchHadithFromCollection(
  collection: string,
  bookNumber: number
): Promise<HadithEntry[]> {
  const hadithList: HadithEntry[] = []

  try {
    const response = await fetch(
      `${SUNNAH_API}/collections/${collection}/books/${bookNumber}/hadiths`,
      {
        headers: {
          'X-API-Key': SUNNAH_API_KEY,
        },
      }
    )

    if (!response.ok) {
      console.error(`API error for ${collection} book ${bookNumber}: ${response.status}`)
      return hadithList
    }

    const data = await response.json()

    for (const hadith of data.data || []) {
      hadithList.push({
        collection,
        book_number: bookNumber,
        hadith_number: hadith.hadithNumber,
        arabic_text: hadith.hadith?.find((h: any) => h.lang === 'ar')?.body || '',
        english_text: hadith.hadith?.find((h: any) => h.lang === 'en')?.body || '',
        grade: hadith.grades?.[0]?.grade || 'unknown',
        narrator_chain: hadith.hadith?.find((h: any) => h.lang === 'en')?.chain || '',
      })
    }
  } catch (error) {
    console.error(`Error fetching ${collection} book ${bookNumber}:`, error)
  }

  return hadithList
}

async function generateEmbeddings(hadithList: HadithEntry[]): Promise<number[][]> {
  const texts = hadithList.map(h =>
    `Hadith from ${h.collection}, Book ${h.book_number}, Number ${h.hadith_number}. Arabic: ${h.arabic_text}. English: ${h.english_text}`
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

    console.log(`Generated embeddings for ${Math.min(i + batchSize, texts.length)}/${texts.length} hadith`)

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  return embeddings
}

async function seedHadith() {
  console.log('Starting Hadith seeding...')

  // Check if sunnah.com API key is set
  if (!SUNNAH_API_KEY) {
    console.log('SUNNAH_API_KEY not set. Using sample data instead.')
    await seedSampleHadith()
    return
  }

  // Check if data already exists
  const { count } = await supabase
    .from('hadith')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    console.log(`Database already contains ${count} hadith. Skipping seed.`)
    console.log('To reseed, first delete existing data.')
    return
  }

  let totalHadith = 0

  for (const collection of COLLECTIONS) {
    console.log(`\nProcessing ${collection.displayName}...`)

    for (let bookNum = 1; bookNum <= collection.totalBooks; bookNum++) {
      console.log(`  Book ${bookNum}/${collection.totalBooks}...`)

      const hadithList = await fetchHadithFromCollection(collection.name, bookNum)
      if (hadithList.length === 0) continue

      // Generate embeddings
      const embeddings = await generateEmbeddings(hadithList)

      // Prepare data for insertion
      const insertData = hadithList.map((h, i) => ({
        collection: h.collection,
        book_number: h.book_number,
        hadith_number: h.hadith_number,
        arabic_text: h.arabic_text,
        english_text: h.english_text,
        grade: h.grade,
        narrator_chain: h.narrator_chain,
        embedding: embeddings[i],
      }))

      // Insert into database
      const { error } = await supabase.from('hadith').insert(insertData)

      if (error) {
        console.error(`Error inserting ${collection.name} book ${bookNum}:`, error)
      } else {
        totalHadith += hadithList.length
        console.log(`  Inserted ${hadithList.length} hadith`)
      }

      // Rate limiting between books
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(`\nSeeding complete! Total hadith inserted: ${totalHadith}`)
}

/**
 * Seed sample hadith for testing (when API key not available)
 */
async function seedSampleHadith() {
  console.log('Seeding sample hadith for testing...')

  const sampleHadith: HadithEntry[] = [
    {
      collection: 'bukhari',
      book_number: 1,
      hadith_number: 1,
      arabic_text: 'إنما الأعمال بالنيات، وإنما لكل امرئ ما نوى',
      english_text: 'Actions are judged by intentions, and everyone will be rewarded according to what he intended.',
      grade: 'sahih',
      narrator_chain: 'Narrated Umar bin Al-Khattab',
    },
    {
      collection: 'bukhari',
      book_number: 1,
      hadith_number: 2,
      arabic_text: 'الإسلام أن تشهد أن لا إله إلا الله وأن محمدا رسول الله',
      english_text: 'Islam is to testify that there is no god but Allah and Muhammad is the Messenger of Allah.',
      grade: 'sahih',
      narrator_chain: 'Narrated Abu Huraira',
    },
    {
      collection: 'bukhari',
      book_number: 2,
      hadith_number: 8,
      arabic_text: 'بني الإسلام على خمس: شهادة أن لا إله إلا الله وأن محمدا رسول الله، وإقام الصلاة، وإيتاء الزكاة، والحج، وصوم رمضان',
      english_text: 'Islam is built on five pillars: testifying that there is no god but Allah and that Muhammad is the Messenger of Allah, establishing prayer, paying zakat, making pilgrimage to the House, and fasting in Ramadan.',
      grade: 'sahih',
      narrator_chain: 'Narrated Ibn Umar',
    },
    {
      collection: 'muslim',
      book_number: 1,
      hadith_number: 1,
      arabic_text: 'الدين النصيحة',
      english_text: 'Religion is sincerity.',
      grade: 'sahih',
      narrator_chain: 'Narrated Tamim ad-Dari',
    },
    {
      collection: 'muslim',
      book_number: 1,
      hadith_number: 2,
      arabic_text: 'لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه',
      english_text: 'None of you truly believes until he loves for his brother what he loves for himself.',
      grade: 'sahih',
      narrator_chain: 'Narrated Anas',
    },
    {
      collection: 'bukhari',
      book_number: 78,
      hadith_number: 6502,
      arabic_text: 'من عادى لي وليا فقد آذنته بالحرب، وما تقرب إلي عبدي بشيء أحب إلي مما افترضت عليه',
      english_text: 'Whoever shows enmity to a friend of Mine, I declare war against him. My servant does not draw near to Me with anything more beloved to Me than that which I have made obligatory upon him.',
      grade: 'sahih',
      narrator_chain: 'Narrated Abu Huraira (Hadith Qudsi)',
    },
  ]

  // Generate embeddings
  const embeddings = await generateEmbeddings(sampleHadith)

  // Prepare and insert
  const insertData = sampleHadith.map((h, i) => ({
    collection: h.collection,
    book_number: h.book_number,
    hadith_number: h.hadith_number,
    arabic_text: h.arabic_text,
    english_text: h.english_text,
    grade: h.grade,
    narrator_chain: h.narrator_chain,
    embedding: embeddings[i],
  }))

  const { error } = await supabase.from('hadith').insert(insertData)

  if (error) {
    console.error('Error inserting sample hadith:', error)
  } else {
    console.log(`Inserted ${sampleHadith.length} sample hadith`)
  }
}

// Run the seeding
seedHadith().catch(console.error)

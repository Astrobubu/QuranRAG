/**
 * Seed Hadith database using HadithAPI.com
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!
const HADITH_API_KEY = process.env.HADITH_API_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

const HADITH_API = 'https://hadithapi.com/api'

// Collections to seed
const COLLECTIONS = [
  { slug: 'sahih-bukhari', name: 'bukhari' },
  { slug: 'sahih-muslim', name: 'muslim' },
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

async function fetchHadithPage(bookSlug: string, page: number): Promise<any> {
  const url = `${HADITH_API}/hadiths/?apiKey=${HADITH_API_KEY}&book=${bookSlug}&paginate=100&page=${page}`

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`API error: ${response.status} ${response.statusText}`)
      return null
    }
    return await response.json()
  } catch (error) {
    console.error(`Fetch error:`, error)
    return null
  }
}

function truncateText(text: string, maxChars: number = 6000): string {
  if (text.length <= maxChars) return text
  return text.substring(0, maxChars) + '...'
}

async function generateEmbeddings(hadithList: HadithEntry[]): Promise<number[][]> {
  const texts = hadithList.map(h => {
    const arabic = truncateText(h.arabic_text, 2500)
    const english = truncateText(h.english_text, 2500)
    return `Hadith ${h.collection} ${h.book_number}:${h.hadith_number}. Arabic: ${arabic}. English: ${english}`
  })

  const embeddings: number[][] = []
  const batchSize = 20 // Smaller batches to avoid token limits

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    })

    embeddings.push(...response.data.map(d => d.embedding))

    if (texts.length > batchSize) {
      console.log(`    Embeddings: ${Math.min(i + batchSize, texts.length)}/${texts.length}`)
    }

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return embeddings
}

async function seedHadith() {
  console.log('Starting Hadith seeding from HadithAPI.com...')

  if (!HADITH_API_KEY) {
    console.error('HADITH_API_KEY not set in .env.local')
    return
  }

  // Check existing count
  const { count: existingCount } = await supabase
    .from('hadith')
    .select('*', { count: 'exact', head: true })
  console.log(`Existing hadith: ${existingCount || 0}`)

  let totalHadith = 0

  for (const collection of COLLECTIONS) {
    console.log(`\n📚 Processing ${collection.name}...`)

    let page = 1
    let hasMore = true
    let collectionTotal = 0

    while (hasMore) {
      console.log(`  Page ${page}...`)

      const data = await fetchHadithPage(collection.slug, page)

      if (!data || !data.hadiths || !data.hadiths.data || data.hadiths.data.length === 0) {
        hasMore = false
        break
      }

      const hadiths: HadithEntry[] = data.hadiths.data.map((h: any) => ({
        collection: collection.name,
        book_number: parseInt(h.bookNumber) || 1,
        hadith_number: parseInt(h.hadithNumber) || 0,
        arabic_text: h.hadithArabic || '',
        english_text: h.hadithEnglish || '',
        grade: h.status || 'unknown',
        narrator_chain: h.englishNarrator || '',
      })).filter((h: HadithEntry) => h.hadith_number > 0 && (h.arabic_text || h.english_text))

      if (hadiths.length === 0) {
        hasMore = false
        break
      }

      console.log(`    Fetched ${hadiths.length} hadiths`)

      // Generate embeddings
      const embeddings = await generateEmbeddings(hadiths)

      // Filter out existing hadiths
      const newHadiths: typeof hadiths = []
      const newEmbeddings: number[][] = []

      for (let i = 0; i < hadiths.length; i++) {
        const h = hadiths[i]
        const { count } = await supabase
          .from('hadith')
          .select('*', { count: 'exact', head: true })
          .eq('collection', h.collection)
          .eq('hadith_number', h.hadith_number)

        if (!count || count === 0) {
          newHadiths.push(h)
          newEmbeddings.push(embeddings[i])
        }
      }

      if (newHadiths.length === 0) {
        console.log(`    All ${hadiths.length} already exist, skipping...`)
        page++
        continue
      }

      // Insert into database
      const insertData = newHadiths.map((h, i) => ({
        collection: h.collection,
        book_number: h.book_number,
        hadith_number: h.hadith_number,
        arabic_text: h.arabic_text,
        english_text: h.english_text,
        grade: h.grade,
        narrator_chain: h.narrator_chain,
        embedding: newEmbeddings[i],
      }))

      const { error } = await supabase.from('hadith').insert(insertData)

      if (error) {
        console.error(`    Error inserting:`, error.message)
      } else {
        collectionTotal += hadiths.length
        totalHadith += hadiths.length
        console.log(`    Inserted ${hadiths.length} (total: ${collectionTotal})`)
      }

      // Check for more pages
      hasMore = data.hadiths.next_page_url !== null
      page++

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log(`  ✓ ${collection.name}: ${collectionTotal} hadiths`)
  }

  console.log(`\n✅ Seeding complete! Total hadith inserted: ${totalHadith}`)
}

seedHadith().catch(console.error)

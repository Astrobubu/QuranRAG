/**
 * Continue Hadith seeding from a specific page
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

// Start page (2500 existing / 100 per page = 25)
const START_PAGE = parseInt(process.argv[2]) || 26

interface HadithEntry {
  collection: string
  book_number: number
  hadith_number: number
  arabic_text: string
  english_text: string
  grade: string
  narrator_chain: string
}

function truncateText(text: string, maxChars: number = 2000): string {
  if (!text) return ''
  if (text.length <= maxChars) return text
  return text.substring(0, maxChars) + '...'
}

async function fetchHadithPage(bookSlug: string, page: number): Promise<any> {
  const url = `${HADITH_API}/hadiths/?apiKey=${HADITH_API_KEY}&book=${bookSlug}&paginate=100&page=${page}`
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return await response.json()
  } catch (error) {
    console.error(`Fetch error:`, error)
    return null
  }
}

async function generateEmbeddings(hadithList: HadithEntry[]): Promise<number[][]> {
  const texts = hadithList.map(h => {
    const arabic = truncateText(h.arabic_text, 1500)
    const english = truncateText(h.english_text, 1500)
    return `Hadith ${h.collection} ${h.book_number}:${h.hadith_number}. ${arabic} ${english}`
  })

  const embeddings: number[][] = []
  const batchSize = 20

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      })
      embeddings.push(...response.data.map(d => d.embedding))
    } catch (error: any) {
      console.error(`Embedding error at batch ${i}:`, error.message)
      // Skip this batch and add empty embeddings
      for (let j = 0; j < batch.length; j++) {
        embeddings.push([])
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300))
  }

  return embeddings
}

async function seedHadith() {
  console.log(`Continuing Hadith seeding from page ${START_PAGE}...`)

  const { count } = await supabase.from('hadith').select('*', { count: 'exact', head: true })
  console.log(`Existing hadith: ${count || 0}`)

  let totalAdded = 0

  // Process Bukhari first
  console.log('\n📚 Sahih Bukhari...')
  let page = START_PAGE
  let hasMore = true

  while (hasMore) {
    console.log(`  Page ${page}...`)
    const data = await fetchHadithPage('sahih-bukhari', page)

    if (!data?.hadiths?.data?.length) {
      console.log('  No more Bukhari pages')
      break
    }

    const hadiths: HadithEntry[] = data.hadiths.data.map((h: any) => ({
      collection: 'bukhari',
      book_number: parseInt(h.bookNumber) || 1,
      hadith_number: parseInt(h.hadithNumber) || 0,
      arabic_text: h.hadithArabic || '',
      english_text: h.hadithEnglish || '',
      grade: h.status || 'Sahih',
      narrator_chain: h.englishNarrator || '',
    })).filter((h: HadithEntry) => h.hadith_number > 0)

    console.log(`    Fetched ${hadiths.length}`)

    const embeddings = await generateEmbeddings(hadiths)

    const insertData = hadiths.map((h, i) => ({
      ...h,
      embedding: embeddings[i]?.length ? embeddings[i] : null,
    })).filter(h => h.embedding)

    if (insertData.length > 0) {
      const { error } = await supabase.from('hadith').insert(insertData)
      if (error) {
        console.error(`    Error:`, error.message)
      } else {
        totalAdded += insertData.length
        console.log(`    Added ${insertData.length} (total: ${totalAdded})`)
      }
    }

    hasMore = data.hadiths.next_page_url !== null
    page++
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Then Muslim from page 1
  console.log('\n📚 Sahih Muslim...')
  page = 1
  hasMore = true

  while (hasMore) {
    console.log(`  Page ${page}...`)
    const data = await fetchHadithPage('sahih-muslim', page)

    if (!data?.hadiths?.data?.length) {
      console.log('  No more Muslim pages')
      break
    }

    const hadiths: HadithEntry[] = data.hadiths.data.map((h: any) => ({
      collection: 'muslim',
      book_number: parseInt(h.bookNumber) || 1,
      hadith_number: parseInt(h.hadithNumber) || 0,
      arabic_text: h.hadithArabic || '',
      english_text: h.hadithEnglish || '',
      grade: h.status || 'Sahih',
      narrator_chain: h.englishNarrator || '',
    })).filter((h: HadithEntry) => h.hadith_number > 0)

    console.log(`    Fetched ${hadiths.length}`)

    const embeddings = await generateEmbeddings(hadiths)

    const insertData = hadiths.map((h, i) => ({
      ...h,
      embedding: embeddings[i]?.length ? embeddings[i] : null,
    })).filter(h => h.embedding)

    if (insertData.length > 0) {
      const { error } = await supabase.from('hadith').insert(insertData)
      if (error) {
        console.error(`    Error:`, error.message)
      } else {
        totalAdded += insertData.length
        console.log(`    Added ${insertData.length} (total: ${totalAdded})`)
      }
    }

    hasMore = data.hadiths.next_page_url !== null
    page++
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log(`\n✅ Done! Added ${totalAdded} new hadith`)
}

seedHadith().catch(console.error)

/**
 * Test Hadith RAG search
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

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

async function searchHadith(queryText: string, threshold: number = 0.3, limit: number = 5) {
  console.log(`\n🔍 Searching: "${queryText.substring(0, 80)}..."\n`)

  const embedding = await generateEmbedding(queryText)

  const { data, error } = await supabase.rpc('search_hadith', {
    query_embedding: embedding,
    match_threshold: threshold,
    match_count: limit,
  })

  if (error) {
    console.error('Search error:', error)
    return []
  }

  return data || []
}

async function testHadithSearch() {
  // First check counts
  const { count: totalCount } = await supabase
    .from('hadith')
    .select('*', { count: 'exact', head: true })

  const { count: bukhariCount } = await supabase
    .from('hadith')
    .select('*', { count: 'exact', head: true })
    .eq('collection', 'bukhari')

  console.log('📊 Database Status:')
  console.log(`  Total hadith: ${totalCount}`)
  console.log(`  Bukhari: ${bukhariCount}`)

  // Test queries related to well-known hadith topics
  const testQueries = [
    "The Prophet said actions are judged by intentions",
    "من رأى منكم منكرا فليغيره بيده",
    "Paradise lies at the feet of the mother",
    "The strong man is not the one who wrestles",
    "None of you truly believes until he loves for his brother what he loves for himself",
  ]

  for (const query of testQueries) {
    const results = await searchHadith(query, 0.3, 3)

    if (results.length > 0) {
      console.log(`Found ${results.length} matches:`)
      for (const h of results) {
        console.log(`  📜 ${h.collection} #${h.hadith_number}`)
        console.log(`     Similarity: ${(h.similarity * 100).toFixed(1)}%`)
        console.log(`     Grade: ${h.grade}`)
        const englishPreview = h.english_text?.substring(0, 150) || 'N/A'
        console.log(`     Text: ${englishPreview}...`)
        console.log()
      }
    } else {
      console.log(`  No matches found above threshold`)
    }
    console.log('---')
  }
}

testHadithSearch().catch(console.error)

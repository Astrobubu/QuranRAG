import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

async function main() {
  // Check counts
  const { count: hadithCount } = await supabase
    .from('hadith')
    .select('*', { count: 'exact', head: true })

  console.log(`Hadith count: ${hadithCount}`)

  // Get a sample hadith
  const { data: sample } = await supabase
    .from('hadith')
    .select('collection, hadith_number, english_text')
    .limit(3)

  console.log('\nSample hadith:')
  if (sample) {
    for (const h of sample) {
      console.log(`- ${h.collection} #${h.hadith_number}: ${h.english_text?.substring(0, 100)}...`)
    }
  }

  // Test embedding generation
  console.log('\nGenerating test embedding...')
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: 'actions are judged by intentions',
  })
  console.log(`Embedding generated: ${response.data[0].embedding.length} dimensions`)

  // Test vector search
  console.log('\nTesting hadith search...')
  const { data: results, error } = await supabase.rpc('search_hadith', {
    query_embedding: response.data[0].embedding,
    match_threshold: 0.3,
    match_count: 3,
  })

  if (error) {
    console.error('Search error:', error)
  } else if (results && results.length > 0) {
    console.log(`Found ${results.length} matches:`)
    for (const r of results) {
      console.log(`- ${r.collection} #${r.hadith_number} (${(r.similarity * 100).toFixed(1)}%)`)
      console.log(`  ${r.english_text?.substring(0, 100)}...`)
    }
  } else {
    console.log('No matches found')
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Error:', e)
    process.exit(1)
  })

/**
 * Test RAG detection on transcribed lectures
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000),
  })
  return response.data[0].embedding
}

// Detect if text contains Arabic
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

async function searchQuran(queryText: string, threshold?: number, limit: number = 5) {
  // Use lower threshold for Arabic (diacritics mismatch causes lower similarity)
  const effectiveThreshold = threshold ?? (isArabic(queryText) ? 0.30 : 0.45)
  const embedding = await generateEmbedding(queryText)
  const { data, error } = await supabase.rpc('search_quran_verses', {
    query_embedding: embedding,
    match_threshold: effectiveThreshold,
    match_count: limit,
  })
  if (error) throw error
  return data || []
}

// Use GPT to verify the best match when scores are close AND low confidence
async function verifyBestMatch(
  queryText: string,
  context: string,
  candidates: any[],
  type: 'quran' | 'hadith'
): Promise<any | null> {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return candidates[0]

  const topScore = candidates[0].similarity
  const secondScore = candidates[1]?.similarity || 0

  // High confidence (>55%) - trust the embedding directly
  if (topScore > 0.55) return candidates[0]

  // Clear winner (>5% gap) - no need to verify
  if (topScore - secondScore > 0.05) return candidates[0]

  // Low confidence (<55%) AND close scores (<5% gap) - use GPT verification
  console.log(`   🔄 Low confidence match (${(topScore * 100).toFixed(1)}%), verifying with context...`)

  // Close scores - use GPT to pick the best based on context
  const candidateList = candidates.slice(0, 3).map((c, i) => {
    if (type === 'quran') {
      return `${i + 1}. Surah ${c.surah_number}:${c.ayah_number} (${(c.similarity * 100).toFixed(1)}%)\n   Arabic: ${c.arabic_text?.substring(0, 150)}...`
    } else {
      return `${i + 1}. ${c.collection} #${c.hadith_number} (${(c.similarity * 100).toFixed(1)}%)\n   Text: ${(c.english_text || c.arabic_text)?.substring(0, 150)}...`
    }
  }).join('\n\n')

  const verification = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are an Islamic text expert. Given a quote from a lecture and candidate matches, determine which candidate is the CORRECT source being referenced. Consider:
1. Exact wording match
2. Context of the lecture
3. Topic being discussed
Return ONLY the number (1, 2, or 3) of the best match, or 0 if none are correct.`
      },
      {
        role: 'user',
        content: `Quote from lecture: "${queryText}"

Surrounding context: "${context.substring(0, 500)}"

Candidate matches:
${candidateList}

Which number is the correct source? Reply with just the number.`
      }
    ],
    temperature: 0,
    max_tokens: 10,
  })

  const choice = parseInt(verification.choices[0].message.content?.trim() || '1')
  if (choice >= 1 && choice <= candidates.length) {
    return candidates[choice - 1]
  }
  return candidates[0]
}

async function searchHadith(queryText: string, threshold?: number, limit: number = 3) {
  // Use lower threshold for Arabic
  const effectiveThreshold = threshold ?? (isArabic(queryText) ? 0.30 : 0.40)
  const embedding = await generateEmbedding(queryText)
  const { data, error } = await supabase.rpc('search_hadith', {
    query_embedding: embedding,
    match_threshold: effectiveThreshold,
    match_count: limit,
  })
  if (error) throw error
  return data || []
}

async function detectReferences(transcriptPath: string) {
  console.log(`\n📄 Processing: ${transcriptPath.split('/').pop()}`)
  console.log('─'.repeat(60))

  const transcript = fs.readFileSync(transcriptPath, 'utf-8')
  console.log(`   Length: ${transcript.length} chars`)

  // Use GPT-4 to detect potential references
  console.log('\n🔍 Detecting references with GPT-4...')

  const detection = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: `You are an expert in Islamic texts. Analyze the transcript and identify:
1. Direct Quranic verse quotes (Arabic or English)
2. Hadith quotes or references
3. Paraphrased references to known Islamic texts

For each, extract the exact text from the transcript.
Return ONLY valid JSON in this exact format:
{"references":[{"type":"quran","text":"exact text","possible_reference":"Surah:verse"},{"type":"hadith","text":"exact text","possible_reference":"Collection/number"}]}`
      },
      {
        role: 'user',
        content: `Analyze this lecture transcript and return JSON:\n\n${transcript.substring(0, 10000)}`
      }
    ],
    temperature: 0.2,
  })

  let references: any[] = []
  try {
    const content = detection.choices[0].message.content || '{}'
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const detected = JSON.parse(jsonMatch[0])
      references = detected.references || []
    }
  } catch (e: any) {
    console.log(`   ⚠️ JSON parse error: ${e.message}`)
    console.log(`   Raw response: ${detection.choices[0].message.content?.substring(0, 200)}...`)
  }

  console.log(`   Found ${references.length} potential references\n`)

  // Verify each with RAG
  const results = {
    quran: [] as any[],
    hadith: [] as any[],
  }

  for (const ref of references.slice(0, 15)) {  // Limit to first 15
    console.log(`\n📌 ${ref.type.toUpperCase()}: "${ref.text.substring(0, 60)}..."`)
    console.log(`   Possible: ${ref.possible_reference || 'N/A'}`)

    try {
      const isArabicText = isArabic(ref.text)
      // Get surrounding context from transcript
      const refIndex = transcript.indexOf(ref.text.substring(0, 30))
      const contextStart = Math.max(0, refIndex - 200)
      const contextEnd = Math.min(transcript.length, refIndex + ref.text.length + 200)
      const context = transcript.substring(contextStart, contextEnd)

      if (ref.type === 'quran') {
        const matches = await searchQuran(ref.text, undefined, 5)
        if (matches.length > 0) {
          // Use GPT verification when scores are close
          const best = await verifyBestMatch(ref.text, context, matches, 'quran')
          if (best) {
            const wasVerified = matches[0] !== best ? ' [GPT-verified]' : ''
            console.log(`   ✅ MATCH: Surah ${best.surah_number}:${best.ayah_number} (${(best.similarity * 100).toFixed(1)}%) ${isArabicText ? '[AR]' : '[EN]'}${wasVerified}`)
            console.log(`   📖 ${best.arabic_text?.substring(0, 80)}...`)
            results.quran.push({
              original: ref.text,
              match: `${best.surah_number}:${best.ayah_number}`,
              similarity: best.similarity,
              arabic: best.arabic_text,
              english: best.english_text,
            })
          }
        } else {
          console.log(`   ❌ No match above threshold (${isArabicText ? '0.30 AR' : '0.45 EN'})`)
        }
      } else {
        const matches = await searchHadith(ref.text, undefined, 5)
        if (matches.length > 0) {
          const best = await verifyBestMatch(ref.text, context, matches, 'hadith')
          if (best) {
            const wasVerified = matches[0] !== best ? ' [GPT-verified]' : ''
            console.log(`   ✅ MATCH: ${best.collection} #${best.hadith_number} (${(best.similarity * 100).toFixed(1)}%) ${isArabicText ? '[AR]' : '[EN]'}${wasVerified}`)
            console.log(`   📜 ${best.english_text?.substring(0, 80) || best.arabic_text?.substring(0, 80)}...`)
            results.hadith.push({
              original: ref.text,
              match: `${best.collection}:${best.hadith_number}`,
              similarity: best.similarity,
              text: best.english_text || best.arabic_text,
            })
          }
        } else {
          console.log(`   ❌ No match above threshold (${isArabicText ? '0.30 AR' : '0.40 EN'})`)
        }
      }
    } catch (e: any) {
      console.log(`   ⚠️ Error: ${e.message}`)
    }

    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n' + '═'.repeat(60))
  console.log('📊 SUMMARY')
  console.log('═'.repeat(60))
  console.log(`   Quran verses matched: ${results.quran.length}`)
  console.log(`   Hadith matched: ${results.hadith.length}`)

  return results
}

async function main() {
  // Check database status
  const { count: quranCount } = await supabase.from('quran_verses').select('*', { count: 'exact', head: true })
  const { count: hadithCount } = await supabase.from('hadith').select('*', { count: 'exact', head: true })

  console.log('📊 Database Status:')
  console.log(`   Quran verses: ${quranCount}`)
  console.log(`   Hadith: ${hadithCount}`)

  const transcripts = [
    'C:/Users/Ahmad/Downloads/How Do I Find Love in Loneliness_  Why Me_  EP. 18  Dr. Omar Suleiman  A Ramadan Series on Qadar-transcript.txt',
    'C:/Users/Ahmad/Downloads/كيف نفرق بين إبتلاء و عقوبة من الله  الشيخ عزيز بن فرحان-transcript.txt',
  ]

  for (const t of transcripts) {
    if (fs.existsSync(t)) {
      await detectReferences(t)
    } else {
      console.log(`File not found: ${t}`)
    }
  }
}

main().catch(console.error)

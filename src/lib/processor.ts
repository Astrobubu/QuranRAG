import { openai, MODELS, DETECTION_PROMPT, VERIFICATION_PROMPT } from './openai'
import { searchAll } from './rag'
import { splitIntoChunks, getSurahName } from './arabic-utils'
import { supabaseAdmin } from './supabase'
import type {
  DetectedReference,
  MatchResult,
  VerifiedMatch,
  ProcessingResult,
  Annotation,
  QuranVerse,
  Hadith,
} from '@/types'
import { v4 as uuidv4 } from 'uuid'

// Confidence thresholds - lowered to catch more matches
const CONFIDENCE_AUTO_ANNOTATE = 0.5
const CONFIDENCE_SUGGEST = 0.3

/**
 * Main processing pipeline for transcripts
 */
export async function processTranscript(
  transcriptId: string,
  text: string,
  onProgress?: (stage: string, progress: number, message: string) => void
): Promise<ProcessingResult> {
  const annotations: Annotation[] = []
  let annotatedText = text

  // Track stats
  const stats = {
    total_detected: 0,
    quran_matches: 0,
    hadith_matches: 0,
    low_confidence_skipped: 0,
  }

  try {
    // Update status to processing
    await supabaseAdmin
      .from('transcripts')
      .update({ status: 'processing' })
      .eq('id', transcriptId)

    // Step 1: Split into chunks
    onProgress?.('preprocessing', 10, 'Splitting text into chunks...')
    const chunks = splitIntoChunks(text, 2000)
    console.log(`Split into ${chunks.length} chunks`)

    // Step 2: Detect references in each chunk
    onProgress?.('detection', 20, 'Detecting Quranic and Hadith references...')
    const allDetections: DetectedReference[] = []
    let chunkOffset = 0

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const detections = await detectReferences(chunk)

      // Adjust indices for chunk offset
      for (const detection of detections) {
        detection.start_index += chunkOffset
        detection.end_index += chunkOffset
        allDetections.push(detection)
      }

      chunkOffset += chunk.length + 2 // +2 for paragraph separator
      onProgress?.(
        'detection',
        20 + ((i + 1) / chunks.length) * 30,
        `Processed chunk ${i + 1}/${chunks.length}`
      )
    }

    stats.total_detected = allDetections.length
    console.log(`Detected ${allDetections.length} potential references`)

    // Step 3: Match and verify each detection
    onProgress?.('matching', 50, 'Matching references to database...')
    const verifiedMatches: VerifiedMatch[] = []

    for (let i = 0; i < allDetections.length; i++) {
      const detection = allDetections[i]
      const verified = await matchAndVerify(detection)
      verifiedMatches.push(verified)

      onProgress?.(
        'verification',
        50 + ((i + 1) / allDetections.length) * 30,
        `Verified ${i + 1}/${allDetections.length} references`
      )
    }

    // Step 4: Generate annotations
    onProgress?.('annotation', 85, 'Generating annotations...')

    // Sort by position (end to start) to avoid index shifting
    const sortedMatches = verifiedMatches
      .filter(m => m.confidence >= CONFIDENCE_AUTO_ANNOTATE && m.match)
      .sort((a, b) => b.detected.start_index - a.detected.start_index)

    for (const verified of sortedMatches) {
      if (!verified.match || !verified.reference_id) continue

      const annotation: Annotation = {
        id: uuidv4(),
        transcript_id: transcriptId,
        type: verified.match.type,
        reference_id: verified.reference_id,
        original_text: verified.detected.original_text,
        corrected_text: verified.detected.corrected_text,
        confidence: verified.confidence,
        start_index: verified.detected.start_index,
        end_index: verified.detected.end_index,
      }

      annotations.push(annotation)

      // Update stats
      if (verified.match.type === 'quran') {
        stats.quran_matches++
      } else {
        stats.hadith_matches++
      }

      // Find and replace the original text with annotation format
      // Don't trust GPT indices - search for the actual text
      const originalText = verified.detected.original_text
      const annotationFormat = createAnnotationMarkdown(verified)

      // Find the actual position of the original text
      const actualIndex = annotatedText.toLowerCase().indexOf(originalText.toLowerCase())
      if (actualIndex !== -1) {
        annotatedText =
          annotatedText.substring(0, actualIndex) +
          annotationFormat +
          annotatedText.substring(actualIndex + originalText.length)
      }
    }

    // Count skipped
    stats.low_confidence_skipped = verifiedMatches.filter(
      m => m.confidence < CONFIDENCE_AUTO_ANNOTATE
    ).length

    // Step 5: Save results
    onProgress?.('annotation', 95, 'Saving results...')

    // Save annotated text
    await supabaseAdmin
      .from('transcripts')
      .update({
        annotated_text: annotatedText,
        status: 'complete',
      })
      .eq('id', transcriptId)

    // Save annotations
    if (annotations.length > 0) {
      await supabaseAdmin.from('annotations').insert(annotations)
    }

    onProgress?.('complete', 100, 'Processing complete!')

    return {
      annotated_text: annotatedText,
      annotations,
      stats,
    }
  } catch (error) {
    console.error('Error processing transcript:', error)

    // Update status to error
    await supabaseAdmin
      .from('transcripts')
      .update({ status: 'error' })
      .eq('id', transcriptId)

    throw error
  }
}

/**
 * Detect Quranic and Hadith references using GPT-4
 */
async function detectReferences(text: string): Promise<DetectedReference[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODELS.detection,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in Islamic texts, including the Quran and Hadith. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: DETECTION_PROMPT + text,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    })

    const content = response.choices[0].message.content
    if (!content) return []

    const parsed = JSON.parse(content)
    return parsed.detections || []
  } catch (error) {
    console.error('Error detecting references:', error)
    return []
  }
}

/**
 * Match detected text to database and verify
 */
async function matchAndVerify(detection: DetectedReference): Promise<VerifiedMatch> {
  try {
    // Search for matches in database
    const searchText = `${detection.corrected_text} ${detection.context}`
    const matches = await searchAll(searchText, 0.3, 5)

    if (matches.length === 0) {
      return {
        detected: detection,
        match: null,
        confidence: 0,
        reference_id: null,
      }
    }

    // Verify with GPT-4
    const verificationResult = await verifyMatch(detection, matches)

    if (verificationResult.match_index === null) {
      return {
        detected: detection,
        match: null,
        confidence: verificationResult.confidence,
        reference_id: null,
      }
    }

    const bestMatch = matches[verificationResult.match_index]
    const referenceId = createReferenceId(bestMatch)

    return {
      detected: detection,
      match: bestMatch,
      confidence: verificationResult.confidence,
      reference_id: referenceId,
    }
  } catch (error) {
    console.error('Error matching and verifying:', error)
    return {
      detected: detection,
      match: null,
      confidence: 0,
      reference_id: null,
    }
  }
}

/**
 * Use GPT-4 to verify the match
 */
async function verifyMatch(
  detection: DetectedReference,
  matches: MatchResult[]
): Promise<{
  match_index: number | null
  confidence: number
  reasoning: string
}> {
  const matchesText = matches
    .map((m, i) => {
      if (m.type === 'quran') {
        const verse = m.reference as QuranVerse
        return `${i}: [Quran ${verse.surah_number}:${verse.ayah_number}] "${verse.arabic_text}" - "${verse.english_text}" (similarity: ${m.similarity.toFixed(2)})`
      } else {
        const hadith = m.reference as Hadith
        return `${i}: [${hadith.collection} ${hadith.book_number}:${hadith.hadith_number}] "${hadith.arabic_text}" - "${hadith.english_text}" (similarity: ${m.similarity.toFixed(2)})`
      }
    })
    .join('\n')

  const prompt = VERIFICATION_PROMPT
    .replace('{detected_text}', detection.original_text)
    .replace('{corrected_text}', detection.corrected_text)
    .replace('{context}', detection.context)
    .replace('{matches}', matchesText)

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.verification,
      messages: [
        {
          role: 'system',
          content: 'You are an expert in Islamic texts. Always respond with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    })

    const content = response.choices[0].message.content
    if (!content) {
      return { match_index: null, confidence: 0, reasoning: 'No response' }
    }

    return JSON.parse(content)
  } catch (error) {
    console.error('Error verifying match:', error)
    return { match_index: null, confidence: 0, reasoning: 'Error' }
  }
}

/**
 * Create a reference ID from a match
 */
function createReferenceId(match: MatchResult): string {
  if (match.type === 'quran') {
    const verse = match.reference as QuranVerse
    return `${verse.surah_number}:${verse.ayah_number}`
  } else {
    const hadith = match.reference as Hadith
    return `${hadith.collection}:${hadith.book_number}:${hadith.hadith_number}`
  }
}

/**
 * Create markdown annotation format
 * Format: [[type:reference|original text]] - keeps original text visible with annotation link
 */
function createAnnotationMarkdown(verified: VerifiedMatch): string {
  if (!verified.match || !verified.reference_id) return verified.detected.original_text

  const originalText = verified.detected.original_text

  if (verified.match.type === 'quran') {
    return `[[quran:${verified.reference_id}|${originalText}]]`
  } else {
    return `[[hadith:${verified.reference_id}|${originalText}]]`
  }
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Parse annotation markdown back to data
 */
export function parseAnnotation(
  markdown: string
): { type: 'quran' | 'hadith'; reference: string; display: string } | null {
  const quranMatch = markdown.match(/\[\[quran:([^\|]+)\|([^\]]+)\]\]/)
  if (quranMatch) {
    return {
      type: 'quran',
      reference: quranMatch[1],
      display: quranMatch[2],
    }
  }

  const hadithMatch = markdown.match(/\[\[hadith:([^\|]+)\|([^\]]+)\]\]/)
  if (hadithMatch) {
    return {
      type: 'hadith',
      reference: hadithMatch[1],
      display: hadithMatch[2],
    }
  }

  return null
}

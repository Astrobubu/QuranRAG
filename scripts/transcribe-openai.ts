/**
 * Transcribe audio/video using OpenAI Whisper API
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function transcribe(filePath: string) {
  console.log(`Transcribing: ${filePath}`)

  const file = fs.createReadStream(filePath)

  const response = await openai.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  })

  console.log('\n=== TRANSCRIPTION ===\n')
  console.log(response.text)
  console.log('\n=== LANGUAGE ===')
  console.log(response.language)

  // Save to file
  const outputPath = filePath.replace(/\.[^.]+$/, '-transcript.txt')
  fs.writeFileSync(outputPath, response.text)
  console.log(`\nSaved to: ${outputPath}`)

  return response
}

// Get file path from command line
const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: npx tsx scripts/transcribe-openai.ts <audio-or-video-file>')
  process.exit(1)
}

transcribe(filePath).catch(console.error)

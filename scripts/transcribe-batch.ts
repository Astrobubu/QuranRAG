/**
 * Transcribe audio files using OpenAI Whisper API
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const files = process.argv.slice(2)

if (files.length === 0) {
  console.log('Usage: npx tsx scripts/transcribe-batch.ts <file1> [file2] ...')
  process.exit(1)
}

async function transcribeFile(filePath: string) {
  const fileName = path.basename(filePath)
  console.log(`\n🎙️ Transcribing: ${fileName}`)
  console.log(`   Path: ${filePath}`)

  const stats = fs.statSync(filePath)
  console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`)

  const file = fs.createReadStream(filePath)

  try {
    const response = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    })

    // Save transcript
    const outputPath = filePath.replace(/\.(mp3|mp4|wav|m4a)$/i, '-transcript.txt')
    const jsonPath = filePath.replace(/\.(mp3|mp4|wav|m4a)$/i, '-transcript.json')

    fs.writeFileSync(outputPath, response.text)
    fs.writeFileSync(jsonPath, JSON.stringify(response, null, 2))

    console.log(`   ✅ Done! Language: ${response.language}`)
    console.log(`   Duration: ${response.duration?.toFixed(0)}s`)
    console.log(`   Saved: ${outputPath}`)

    // Print preview
    console.log(`\n   Preview (first 500 chars):`)
    console.log(`   ${response.text.substring(0, 500)}...`)

    return {
      file: fileName,
      language: response.language,
      duration: response.duration,
      text: response.text,
      outputPath,
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('📝 OpenAI Whisper Transcription')
  console.log(`   Files to process: ${files.length}`)

  const results = []

  for (const file of files) {
    const result = await transcribeFile(file)
    if (result) results.push(result)
  }

  console.log('\n\n📊 Summary:')
  for (const r of results) {
    console.log(`- ${r.file}: ${r.language}, ${r.duration?.toFixed(0)}s`)
  }
}

main().catch(console.error)

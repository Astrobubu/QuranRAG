import { openai, MODELS } from './openai'

/**
 * Generate embedding for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: MODELS.embedding,
    input: text,
  })

  return response.data[0].embedding
}

/**
 * Generate embeddings for multiple texts in batch
 * OpenAI allows up to 2048 inputs per request
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number = 100
): Promise<number[][]> {
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)

    const response = await openai.embeddings.create({
      model: MODELS.embedding,
      input: batch,
    })

    const embeddings = response.data.map(d => d.embedding)
    allEmbeddings.push(...embeddings)

    // Progress logging
    console.log(`Generated embeddings for ${Math.min(i + batchSize, texts.length)}/${texts.length} texts`)

    // Small delay to avoid rate limits
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return allEmbeddings
}

/**
 * Create a combined text for Quran verse embedding
 * Includes Arabic, transliteration, and English for better semantic matching
 */
export function createQuranEmbeddingText(
  arabic: string,
  english: string,
  transliteration: string,
  surahNumber: number,
  ayahNumber: number
): string {
  return `Quran ${surahNumber}:${ayahNumber}. Arabic: ${arabic}. English: ${english}. Transliteration: ${transliteration}`
}

/**
 * Create a combined text for Hadith embedding
 */
export function createHadithEmbeddingText(
  arabic: string,
  english: string,
  collection: string,
  bookNumber: number,
  hadithNumber: number
): string {
  return `Hadith from ${collection}, Book ${bookNumber}, Number ${hadithNumber}. Arabic: ${arabic}. English: ${english}`
}

/**
 * Prepare text for embedding by cleaning and normalizing
 */
export function prepareTextForEmbedding(text: string): string {
  return text
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Remove special characters that don't add meaning
    .replace(/[^\w\s\u0600-\u06FF.,!?'"()-]/g, '')
    // Trim
    .trim()
}

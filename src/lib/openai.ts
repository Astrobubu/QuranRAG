import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  console.warn('OPENAI_API_KEY is not set')
}

export const openai = new OpenAI({
  apiKey: apiKey || 'dummy-key-for-build',
})

// Model configurations
export const MODELS = {
  detection: 'gpt-4-turbo-preview',
  verification: 'gpt-4-turbo-preview',
  embedding: 'text-embedding-3-small',
}

// Detection prompt template
export const DETECTION_PROMPT = `You are an expert in Islamic texts, including the Quran and Hadith. Analyze the following transcript chunk from an Islamic lecture and identify:

1. Any Quranic verse quotes (partial or full) - these could be in Arabic, transliteration, or paraphrased in English
2. Any Hadith references - mentions of prophetic traditions, their narrators, or collections

For each detected reference, provide:
- The exact text as spoken/written in the transcript
- Your corrected/standardized version of the Arabic or transliteration
- The start and end character indices in the text
- Whether it's likely a Quran verse or Hadith
- Brief context about what's being referenced

Return your analysis as a JSON array with this structure:
{
  "detections": [
    {
      "type": "quran" | "hadith",
      "original_text": "text as it appears in transcript",
      "corrected_text": "standardized Arabic or transliteration",
      "start_index": number,
      "end_index": number,
      "context": "brief description of what's referenced",
      "likely_reference": "e.g., 'Ayatul Kursi (2:255)' or 'Sahih Bukhari, Book of Faith'"
    }
  ]
}

Important guidelines:
- Be thorough but avoid false positives
- Include partial quotes if clearly from Quran/Hadith
- Note when speakers paraphrase or summarize verses
- Consider common mispronunciations in transliteration
- If unsure whether something is Quran or Hadith, make your best guess based on style and content

Transcript chunk to analyze:
`

// Verification prompt template
export const VERIFICATION_PROMPT = `You are an expert in Islamic texts. Given a detected text from a lecture transcript and potential matches from a database, determine the correct reference.

Detected text: "{detected_text}"
Corrected text: "{corrected_text}"
Context: "{context}"

Potential matches:
{matches}

Analyze these potential matches and determine:
1. Is there a correct match? If so, which one?
2. What is your confidence level (0-1)?
3. If the detected text is a partial quote, does it still correctly match?

Return your analysis as JSON:
{
  "match_index": number | null,  // Index of best match, or null if no match
  "confidence": number,  // 0-1 confidence score
  "reasoning": "Brief explanation of your decision",
  "is_partial_quote": boolean,
  "reference_type": "full" | "partial" | "paraphrase"
}

Consider:
- Partial quotes should still match if clearly from the same verse/hadith
- Paraphrases may match with lower confidence
- Multiple verses might be combined in speech
- Speakers sometimes mix translations
`

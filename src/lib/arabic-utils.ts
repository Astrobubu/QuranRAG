/**
 * Arabic text normalization utilities
 * Handles various Unicode forms and common transcription variations
 */

// Arabic diacritical marks (tashkeel) - used for vowel marks
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g

// Common Arabic letter variations
const ARABIC_NORMALIZATIONS: [RegExp, string][] = [
  // Alif variations
  [/[\u0622\u0623\u0625]/g, '\u0627'], // آ أ إ → ا
  // Ta marbuta
  [/\u0629/g, '\u0647'], // ة → ه
  // Alif maksura
  [/\u0649/g, '\u064A'], // ى → ي
  // Waw with hamza
  [/\u0624/g, '\u0648'], // ؤ → و
  // Ya with hamza
  [/\u0626/g, '\u064A'], // ئ → ي
]

// Common transliteration mappings
const TRANSLITERATION_MAP: { [key: string]: string[] } = {
  ا: ['a', 'aa', 'A', 'AA'],
  ب: ['b', 'B'],
  ت: ['t', 'T'],
  ث: ['th', 'Th', 'TH', 's'],
  ج: ['j', 'J', 'g'],
  ح: ['h', 'H', 'ḥ'],
  خ: ['kh', 'Kh', 'KH', 'x'],
  د: ['d', 'D'],
  ذ: ['dh', 'Dh', 'DH', 'z', 'th'],
  ر: ['r', 'R'],
  ز: ['z', 'Z'],
  س: ['s', 'S'],
  ش: ['sh', 'Sh', 'SH'],
  ص: ['s', 'S', 'ṣ'],
  ض: ['d', 'D', 'ḍ', 'dh'],
  ط: ['t', 'T', 'ṭ'],
  ظ: ['z', 'Z', 'ẓ', 'dh'],
  ع: ["'", 'a', 'A', 'ʿ', '3'],
  غ: ['gh', 'Gh', 'GH', 'g'],
  ف: ['f', 'F'],
  ق: ['q', 'Q', 'k'],
  ك: ['k', 'K'],
  ل: ['l', 'L'],
  م: ['m', 'M'],
  ن: ['n', 'N'],
  ه: ['h', 'H'],
  و: ['w', 'W', 'u', 'oo'],
  ي: ['y', 'Y', 'i', 'ee'],
  ء: ["'", '2', 'ʾ', ''],
  ة: ['a', 'ah', 'at', 'h'],
}

/**
 * Remove diacritical marks (tashkeel) from Arabic text
 */
export function removeDiacritics(text: string): string {
  return text.replace(ARABIC_DIACRITICS, '')
}

/**
 * Normalize Arabic text for comparison
 * - Removes diacritics
 * - Normalizes letter variations
 * - Removes extra whitespace
 */
export function normalizeArabic(text: string): string {
  let normalized = removeDiacritics(text)

  for (const [pattern, replacement] of ARABIC_NORMALIZATIONS) {
    normalized = normalized.replace(pattern, replacement)
  }

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

/**
 * Check if text contains Arabic characters
 */
export function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text)
}

/**
 * Check if text is primarily Arabic
 */
export function isPrimarilyArabic(text: string): boolean {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length
  const totalChars = text.replace(/\s/g, '').length
  return arabicChars / totalChars > 0.5
}

/**
 * Convert common transliteration to normalized form
 */
export function normalizeTransliteration(text: string): string {
  return text
    .toLowerCase()
    // Common variations
    .replace(/aa/g, 'a')
    .replace(/ee/g, 'i')
    .replace(/oo/g, 'u')
    .replace(/dh/g, 'z')
    .replace(/th/g, 's')
    .replace(/kh/g, 'x')
    .replace(/sh/g, '$')
    .replace(/gh/g, 'g')
    // Remove common separators
    .replace(/['-]/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fuzzy match Arabic text allowing for common variations
 */
export function fuzzyMatchArabic(text1: string, text2: string): number {
  const norm1 = normalizeArabic(text1)
  const norm2 = normalizeArabic(text2)

  if (norm1 === norm2) return 1.0

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(norm1, norm2)
  const maxLength = Math.max(norm1.length, norm2.length)

  if (maxLength === 0) return 1.0

  return 1 - distance / maxLength
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length

  if (m === 0) return n
  if (n === 0) return m

  const matrix: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) matrix[i][0] = i
  for (let j = 0; j <= n; j++) matrix[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[m][n]
}

/**
 * Extract potential Quranic phrases from mixed text
 * Looks for common patterns like "bismillah", verse markers, etc.
 */
export function extractQuranPhrases(text: string): string[] {
  const phrases: string[] = []

  // Common Quranic openings
  const patterns = [
    /bismillah\w*/gi,
    /alhamdulillah\w*/gi,
    /subhanallah\w*/gi,
    /allahu\s*akbar/gi,
    /la\s*ilaha\s*illallah/gi,
    /inna\s*lillahi/gi,
    /mashallah/gi,
    /inshallah/gi,
    /[\u0600-\u06FF\s]{10,}/g, // Arabic sequences
  ]

  for (const pattern of patterns) {
    const matches = text.match(pattern)
    if (matches) {
      phrases.push(...matches)
    }
  }

  return Array.from(new Set(phrases))
}

/**
 * Split text into chunks suitable for processing
 * Tries to split at sentence/paragraph boundaries
 */
export function splitIntoChunks(
  text: string,
  maxChunkSize: number = 2000
): string[] {
  const chunks: string[] = []
  const paragraphs = text.split(/\n\n+/)

  let currentChunk = ''

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxChunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
      }

      // If single paragraph is too long, split by sentences
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.split(/(?<=[.!?])\s+/)
        let sentenceChunk = ''

        for (const sentence of sentences) {
          if (sentenceChunk.length + sentence.length > maxChunkSize) {
            if (sentenceChunk) {
              chunks.push(sentenceChunk.trim())
            }
            sentenceChunk = sentence
          } else {
            sentenceChunk += (sentenceChunk ? ' ' : '') + sentence
          }
        }

        currentChunk = sentenceChunk
      } else {
        currentChunk = paragraph
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

/**
 * Get surah name in English
 */
export const SURAH_NAMES: { [key: number]: string } = {
  1: 'Al-Fatiha',
  2: 'Al-Baqarah',
  3: 'Ali \'Imran',
  4: 'An-Nisa',
  5: 'Al-Ma\'idah',
  6: 'Al-An\'am',
  7: 'Al-A\'raf',
  8: 'Al-Anfal',
  9: 'At-Tawbah',
  10: 'Yunus',
  11: 'Hud',
  12: 'Yusuf',
  13: 'Ar-Ra\'d',
  14: 'Ibrahim',
  15: 'Al-Hijr',
  16: 'An-Nahl',
  17: 'Al-Isra',
  18: 'Al-Kahf',
  19: 'Maryam',
  20: 'Ta-Ha',
  21: 'Al-Anbiya',
  22: 'Al-Hajj',
  23: 'Al-Mu\'minun',
  24: 'An-Nur',
  25: 'Al-Furqan',
  26: 'Ash-Shu\'ara',
  27: 'An-Naml',
  28: 'Al-Qasas',
  29: 'Al-\'Ankabut',
  30: 'Ar-Rum',
  31: 'Luqman',
  32: 'As-Sajdah',
  33: 'Al-Ahzab',
  34: 'Saba',
  35: 'Fatir',
  36: 'Ya-Sin',
  37: 'As-Saffat',
  38: 'Sad',
  39: 'Az-Zumar',
  40: 'Ghafir',
  41: 'Fussilat',
  42: 'Ash-Shura',
  43: 'Az-Zukhruf',
  44: 'Ad-Dukhan',
  45: 'Al-Jathiyah',
  46: 'Al-Ahqaf',
  47: 'Muhammad',
  48: 'Al-Fath',
  49: 'Al-Hujurat',
  50: 'Qaf',
  51: 'Adh-Dhariyat',
  52: 'At-Tur',
  53: 'An-Najm',
  54: 'Al-Qamar',
  55: 'Ar-Rahman',
  56: 'Al-Waqi\'ah',
  57: 'Al-Hadid',
  58: 'Al-Mujadilah',
  59: 'Al-Hashr',
  60: 'Al-Mumtahanah',
  61: 'As-Saff',
  62: 'Al-Jumu\'ah',
  63: 'Al-Munafiqun',
  64: 'At-Taghabun',
  65: 'At-Talaq',
  66: 'At-Tahrim',
  67: 'Al-Mulk',
  68: 'Al-Qalam',
  69: 'Al-Haqqah',
  70: 'Al-Ma\'arij',
  71: 'Nuh',
  72: 'Al-Jinn',
  73: 'Al-Muzzammil',
  74: 'Al-Muddaththir',
  75: 'Al-Qiyamah',
  76: 'Al-Insan',
  77: 'Al-Mursalat',
  78: 'An-Naba',
  79: 'An-Nazi\'at',
  80: '\'Abasa',
  81: 'At-Takwir',
  82: 'Al-Infitar',
  83: 'Al-Mutaffifin',
  84: 'Al-Inshiqaq',
  85: 'Al-Buruj',
  86: 'At-Tariq',
  87: 'Al-A\'la',
  88: 'Al-Ghashiyah',
  89: 'Al-Fajr',
  90: 'Al-Balad',
  91: 'Ash-Shams',
  92: 'Al-Layl',
  93: 'Ad-Duha',
  94: 'Ash-Sharh',
  95: 'At-Tin',
  96: 'Al-\'Alaq',
  97: 'Al-Qadr',
  98: 'Al-Bayyinah',
  99: 'Az-Zalzalah',
  100: 'Al-\'Adiyat',
  101: 'Al-Qari\'ah',
  102: 'At-Takathur',
  103: 'Al-\'Asr',
  104: 'Al-Humazah',
  105: 'Al-Fil',
  106: 'Quraysh',
  107: 'Al-Ma\'un',
  108: 'Al-Kawthar',
  109: 'Al-Kafirun',
  110: 'An-Nasr',
  111: 'Al-Masad',
  112: 'Al-Ikhlas',
  113: 'Al-Falaq',
  114: 'An-Nas',
}

export function getSurahName(surahNumber: number): string {
  return SURAH_NAMES[surahNumber] || `Surah ${surahNumber}`
}

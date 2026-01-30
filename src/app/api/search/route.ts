import { NextRequest, NextResponse } from 'next/server'
import { searchQuranVerses, searchHadith, searchAll } from '@/lib/rag'
import { getSurahName } from '@/lib/arabic-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const type = searchParams.get('type') // 'quran', 'hadith', or 'all'
    const limit = parseInt(searchParams.get('limit') || '5')
    const threshold = parseFloat(searchParams.get('threshold') || '0.5')

    if (!query) {
      return NextResponse.json(
        { error: 'No query provided' },
        { status: 400 }
      )
    }

    let results: any[] = []

    switch (type) {
      case 'quran':
        const quranResults = await searchQuranVerses(query, threshold, limit)
        results = quranResults.map(verse => ({
          type: 'quran',
          reference: `${verse.surah_number}:${verse.ayah_number}`,
          surah_name: getSurahName(verse.surah_number),
          arabic_text: verse.arabic_text,
          english_text: verse.english_text,
          transliteration: verse.transliteration,
          similarity: verse.similarity,
        }))
        break

      case 'hadith':
        const hadithResults = await searchHadith(query, threshold, limit)
        results = hadithResults.map(hadith => ({
          type: 'hadith',
          reference: `${hadith.collection}:${hadith.book_number}:${hadith.hadith_number}`,
          collection: hadith.collection,
          arabic_text: hadith.arabic_text,
          english_text: hadith.english_text,
          grade: hadith.grade,
          similarity: hadith.similarity,
        }))
        break

      default:
        const allResults = await searchAll(query, threshold, limit)
        results = allResults.map(match => {
          if (match.type === 'quran') {
            const verse = match.reference as any
            return {
              type: 'quran',
              reference: `${verse.surah_number}:${verse.ayah_number}`,
              surah_name: getSurahName(verse.surah_number),
              arabic_text: verse.arabic_text,
              english_text: verse.english_text,
              transliteration: verse.transliteration,
              similarity: match.similarity,
            }
          } else {
            const hadith = match.reference as any
            return {
              type: 'hadith',
              reference: `${hadith.collection}:${hadith.book_number}:${hadith.hadith_number}`,
              collection: hadith.collection,
              arabic_text: hadith.arabic_text,
              english_text: hadith.english_text,
              grade: hadith.grade,
              similarity: match.similarity,
            }
          }
        })
    }

    return NextResponse.json({
      query,
      type: type || 'all',
      count: results.length,
      results,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

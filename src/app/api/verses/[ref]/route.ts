import { NextRequest, NextResponse } from 'next/server'
import { getQuranVerse, getQuranVerseRange, getSurahVerses } from '@/lib/rag'
import { getSurahName } from '@/lib/arabic-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params

    // Parse reference format: "2:255" or "2:255-260" or "2" (full surah)
    const parts = ref.split(':')

    if (parts.length === 1) {
      // Full surah request
      const surahNumber = parseInt(parts[0])
      if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
        return NextResponse.json(
          { error: 'Invalid surah number' },
          { status: 400 }
        )
      }

      const verses = await getSurahVerses(surahNumber)
      return NextResponse.json({
        surah_number: surahNumber,
        surah_name: getSurahName(surahNumber),
        verses,
      })
    }

    const surahNumber = parseInt(parts[0])
    const ayahPart = parts[1]

    if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
      return NextResponse.json(
        { error: 'Invalid surah number' },
        { status: 400 }
      )
    }

    // Check for range
    if (ayahPart.includes('-')) {
      const [startAyah, endAyah] = ayahPart.split('-').map(n => parseInt(n))

      if (isNaN(startAyah) || isNaN(endAyah)) {
        return NextResponse.json(
          { error: 'Invalid ayah range' },
          { status: 400 }
        )
      }

      const verses = await getQuranVerseRange(surahNumber, startAyah, endAyah)

      if (verses.length === 0) {
        return NextResponse.json(
          { error: 'Verses not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        surah_number: surahNumber,
        surah_name: getSurahName(surahNumber),
        start_ayah: startAyah,
        end_ayah: endAyah,
        verses,
      })
    }

    // Single verse
    const ayahNumber = parseInt(ayahPart)

    if (isNaN(ayahNumber)) {
      return NextResponse.json(
        { error: 'Invalid ayah number' },
        { status: 400 }
      )
    }

    const verse = await getQuranVerse(surahNumber, ayahNumber)

    if (!verse) {
      return NextResponse.json(
        { error: 'Verse not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ...verse,
      surah_name: getSurahName(surahNumber),
      reference: `${surahNumber}:${ayahNumber}`,
    })
  } catch (error) {
    console.error('Error fetching verse:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

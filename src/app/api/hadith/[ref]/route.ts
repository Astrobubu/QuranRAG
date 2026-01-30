import { NextRequest, NextResponse } from 'next/server'
import { getHadith, getHadithByCollection } from '@/lib/rag'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ref: string }> }
) {
  try {
    const { ref } = await params

    // Parse reference format: "bukhari:1:1" or "bukhari" (list from collection)
    const parts = ref.split(':')

    if (parts.length === 1) {
      // List hadith from collection
      const collection = parts[0].toLowerCase()
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '100')
      const offset = parseInt(searchParams.get('offset') || '0')

      const hadithList = await getHadithByCollection(collection, limit, offset)

      return NextResponse.json({
        collection,
        count: hadithList.length,
        hadith: hadithList,
      })
    }

    if (parts.length !== 3) {
      return NextResponse.json(
        { error: 'Invalid reference format. Use collection:book:number (e.g., bukhari:1:1)' },
        { status: 400 }
      )
    }

    const collection = parts[0].toLowerCase()
    const bookNumber = parseInt(parts[1])
    const hadithNumber = parseInt(parts[2])

    if (isNaN(bookNumber) || isNaN(hadithNumber)) {
      return NextResponse.json(
        { error: 'Invalid book or hadith number' },
        { status: 400 }
      )
    }

    const hadith = await getHadith(collection, bookNumber, hadithNumber)

    if (!hadith) {
      return NextResponse.json(
        { error: 'Hadith not found' },
        { status: 404 }
      )
    }

    // Format collection name
    const collectionNames: { [key: string]: string } = {
      bukhari: 'Sahih al-Bukhari',
      muslim: 'Sahih Muslim',
      abudawud: 'Sunan Abu Dawud',
      tirmidhi: "Jami' at-Tirmidhi",
      nasai: "Sunan an-Nasa'i",
      ibnmajah: 'Sunan Ibn Majah',
      malik: 'Muwatta Malik',
      ahmad: 'Musnad Ahmad',
    }

    return NextResponse.json({
      ...hadith,
      collection_name: collectionNames[collection] || collection,
      reference: `${collection}:${bookNumber}:${hadithNumber}`,
    })
  } catch (error) {
    console.error('Error fetching hadith:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

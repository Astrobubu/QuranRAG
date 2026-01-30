import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const text = formData.get('text') as string | null
    const title = formData.get('title') as string || 'Untitled Transcript'

    let transcriptText = ''

    if (file) {
      // Read file content
      transcriptText = await file.text()
    } else if (text) {
      transcriptText = text
    } else {
      return NextResponse.json(
        { error: 'No file or text provided' },
        { status: 400 }
      )
    }

    if (!transcriptText.trim()) {
      return NextResponse.json(
        { error: 'Transcript is empty' },
        { status: 400 }
      )
    }

    // Create transcript record
    const transcriptId = uuidv4()

    const { data, error } = await supabaseAdmin
      .from('transcripts')
      .insert({
        id: transcriptId,
        title,
        original_text: transcriptText,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating transcript:', error)
      return NextResponse.json(
        { error: 'Failed to create transcript' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      transcript: data,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Get specific transcript
      const { data, error } = await supabaseAdmin
        .from('transcripts')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        return NextResponse.json(
          { error: 'Transcript not found' },
          { status: 404 }
        )
      }

      return NextResponse.json(data)
    }

    // List all transcripts
    const { data, error } = await supabaseAdmin
      .from('transcripts')
      .select('id, title, created_at, status')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch transcripts' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'No transcript ID provided' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('transcripts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete transcript' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

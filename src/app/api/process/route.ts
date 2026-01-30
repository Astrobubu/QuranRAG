import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { processTranscript } from '@/lib/processor'

export async function POST(request: NextRequest) {
  try {
    const { transcriptId } = await request.json()

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'No transcript ID provided' },
        { status: 400 }
      )
    }

    // Get transcript
    const { data: transcript, error: fetchError } = await supabaseAdmin
      .from('transcripts')
      .select('*')
      .eq('id', transcriptId)
      .single()

    if (fetchError || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    if (transcript.status === 'processing') {
      return NextResponse.json(
        { error: 'Transcript is already being processed' },
        { status: 409 }
      )
    }

    if (transcript.status === 'complete') {
      return NextResponse.json(
        { error: 'Transcript has already been processed' },
        { status: 409 }
      )
    }

    // Start processing (non-blocking)
    processTranscript(transcriptId, transcript.original_text)
      .then(result => {
        console.log('Processing complete:', result.stats)
      })
      .catch(error => {
        console.error('Processing error:', error)
      })

    return NextResponse.json({
      success: true,
      message: 'Processing started',
      transcriptId,
    })
  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const transcriptId = searchParams.get('id')

    if (!transcriptId) {
      return NextResponse.json(
        { error: 'No transcript ID provided' },
        { status: 400 }
      )
    }

    // Get transcript status
    const { data: transcript, error: fetchError } = await supabaseAdmin
      .from('transcripts')
      .select('id, title, status, annotated_text, created_at')
      .eq('id', transcriptId)
      .single()

    if (fetchError || !transcript) {
      return NextResponse.json(
        { error: 'Transcript not found' },
        { status: 404 }
      )
    }

    // Get annotations if processing is complete
    let annotations = []
    if (transcript.status === 'complete') {
      const { data } = await supabaseAdmin
        .from('annotations')
        .select('*')
        .eq('transcript_id', transcriptId)

      annotations = data || []
    }

    return NextResponse.json({
      ...transcript,
      annotations,
    })
  } catch (error) {
    console.error('Status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

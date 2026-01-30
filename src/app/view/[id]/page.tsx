import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { AnnotatedViewer } from '@/components/AnnotatedViewer'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen } from 'lucide-react'

// Force dynamic rendering to prevent build-time database access
export const dynamic = 'force-dynamic'

interface ViewPageProps {
  params: Promise<{ id: string }>
}

async function getTranscript(id: string) {
  const { data: transcript, error: transcriptError } = await supabaseAdmin
    .from('transcripts')
    .select('*')
    .eq('id', id)
    .single()

  if (transcriptError || !transcript) {
    return null
  }

  const { data: annotations } = await supabaseAdmin
    .from('annotations')
    .select('*')
    .eq('transcript_id', id)

  return {
    ...transcript,
    annotations: annotations || [],
  }
}

export default async function ViewPage({ params }: ViewPageProps) {
  const { id } = await params
  const transcript = await getTranscript(id)

  if (!transcript) {
    notFound()
  }

  if (transcript.status !== 'complete') {
    // Redirect to processing page if not complete
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Transcript Not Ready</h1>
          <p className="text-muted-foreground mb-8">
            This transcript is still being processed.
          </p>
          <Link href={`/process/${id}`}>
            <Button>View Processing Status</Button>
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold">QuranRAG</span>
        </div>
      </div>

      {/* Annotated Viewer */}
      <AnnotatedViewer
        transcriptId={transcript.id}
        title={transcript.title}
        annotatedText={transcript.annotated_text || transcript.original_text}
        annotations={transcript.annotations}
      />
    </main>
  )
}

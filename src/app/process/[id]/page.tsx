import { ProcessingStatus } from '@/components/ProcessingStatus'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen } from 'lucide-react'

interface ProcessPageProps {
  params: Promise<{ id: string }>
}

export default async function ProcessPage({ params }: ProcessPageProps) {
  const { id } = await params

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
          <h1 className="text-2xl font-bold">Processing Transcript</h1>
        </div>
      </div>

      {/* Processing Status */}
      <ProcessingStatus transcriptId={id} />
    </main>
  )
}

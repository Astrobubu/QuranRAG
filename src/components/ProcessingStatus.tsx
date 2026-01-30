'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, CheckCircle2, XCircle, BookOpen, ScrollText } from 'lucide-react'

interface ProcessingStatusProps {
  transcriptId: string
}

interface TranscriptStatus {
  id: string
  title: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  annotated_text?: string
  annotations?: {
    type: string
    confidence: number
  }[]
}

export function ProcessingStatus({ transcriptId }: ProcessingStatusProps) {
  const [status, setStatus] = useState<TranscriptStatus | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [processingStarted, setProcessingStarted] = useState(false)
  const router = useRouter()

  // Poll for status updates
  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/process?id=${transcriptId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch status')
        }

        setStatus(data)

        // Update progress based on status
        if (data.status === 'pending') {
          setProgress(0)
        } else if (data.status === 'processing') {
          // Simulate progress
          setProgress(prev => Math.min(prev + 5, 90))
        } else if (data.status === 'complete') {
          setProgress(100)
          clearInterval(intervalId)
        } else if (data.status === 'error') {
          clearInterval(intervalId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
        clearInterval(intervalId)
      }
    }

    fetchStatus()
    intervalId = setInterval(fetchStatus, 2000)

    return () => clearInterval(intervalId)
  }, [transcriptId])

  // Start processing
  const startProcessing = async () => {
    try {
      setProcessingStarted(true)
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcriptId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start processing')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setProcessingStarted(false)
    }
  }

  // Auto-start processing if pending
  useEffect(() => {
    if (status?.status === 'pending' && !processingStarted) {
      startProcessing()
    }
  }, [status?.status, processingStarted])

  const getStatusIcon = () => {
    switch (status?.status) {
      case 'pending':
        return <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      case 'processing':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />
      case 'complete':
        return <CheckCircle2 className="h-8 w-8 text-green-500" />
      case 'error':
        return <XCircle className="h-8 w-8 text-destructive" />
      default:
        return null
    }
  }

  const getStatusMessage = () => {
    switch (status?.status) {
      case 'pending':
        return 'Preparing to process...'
      case 'processing':
        return 'Analyzing transcript for Quranic and Hadith references...'
      case 'complete':
        return 'Processing complete!'
      case 'error':
        return 'An error occurred during processing.'
      default:
        return 'Loading...'
    }
  }

  const getStats = () => {
    if (!status?.annotations) return null

    const quranCount = status.annotations.filter(a => a.type === 'quran').length
    const hadithCount = status.annotations.filter(a => a.type === 'hadith').length
    const avgConfidence = status.annotations.length > 0
      ? status.annotations.reduce((sum, a) => sum + a.confidence, 0) / status.annotations.length
      : 0

    return { quranCount, hadithCount, avgConfidence }
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  const stats = getStats()

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          {status?.title || 'Processing Transcript'}
        </CardTitle>
        <CardDescription>{getStatusMessage()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {status?.status === 'processing' && (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold">1</p>
              <p className="text-sm text-muted-foreground">Detecting</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">Matching</p>
            </div>
            <div className="p-4 rounded-lg bg-muted">
              <p className="text-2xl font-bold">3</p>
              <p className="text-sm text-muted-foreground">Verifying</p>
            </div>
          </div>
        )}

        {status?.status === 'complete' && stats && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <BookOpen className="h-6 w-6 mx-auto mb-2 text-green-600" />
                  <p className="text-2xl font-bold">{stats.quranCount}</p>
                  <p className="text-sm text-muted-foreground">Quran Verses</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <ScrollText className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                  <p className="text-2xl font-bold">{stats.hadithCount}</p>
                  <p className="text-sm text-muted-foreground">Hadith</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</p>
                  <p className="text-sm text-muted-foreground">Avg Confidence</p>
                </CardContent>
              </Card>
            </div>

            <Button
              className="w-full"
              onClick={() => router.push(`/view/${transcriptId}`)}
            >
              View Annotated Transcript
            </Button>
          </div>
        )}

        {status?.status === 'error' && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                Processing failed. Please try again or contact support.
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => router.push('/')}>
              Go Back
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

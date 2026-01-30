'use client'

import { useState, useEffect } from 'react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BookOpen, ExternalLink } from 'lucide-react'

interface VerseData {
  surah_number: number
  ayah_number: number
  surah_name: string
  arabic_text: string
  english_text: string
  transliteration: string
}

interface VerseHoverCardProps {
  reference: string // "2:255" format
  displayText: string
  confidence?: number
  children?: React.ReactNode
}

export function VerseHoverCard({
  reference,
  displayText,
  confidence,
  children,
}: VerseHoverCardProps) {
  const [verse, setVerse] = useState<VerseData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVerse = async () => {
      if (!reference) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/verses/${reference}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch verse')
        }

        setVerse(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchVerse()
  }, [reference])

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-600 bg-green-100'
    if (conf >= 0.7) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children || (
          <span className="quran-annotation inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {displayText}
          </span>
        )}
      </HoverCardTrigger>
      <HoverCardContent className="w-96" align="start">
        {loading && (
          <div className="text-center py-4 text-muted-foreground">
            Loading verse...
          </div>
        )}

        {error && (
          <div className="text-center py-4 text-destructive">
            {error}
          </div>
        )}

        {verse && (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="quran" className="mb-1">
                  Quran
                </Badge>
                <h4 className="font-semibold">
                  {verse.surah_name} ({verse.surah_number}:{verse.ayah_number})
                </h4>
              </div>
              {confidence && (
                <Badge className={getConfidenceColor(confidence)}>
                  {(confidence * 100).toFixed(0)}%
                </Badge>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="arabic-text text-xl leading-relaxed text-right">
                {verse.arabic_text}
              </p>

              {verse.transliteration && (
                <p className="text-sm text-muted-foreground italic">
                  {verse.transliteration}
                </p>
              )}

              <p className="text-sm">
                {verse.english_text}
              </p>
            </div>

            <Separator />

            <a
              href={`https://quran.com/${verse.surah_number}/${verse.ayah_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View on Quran.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

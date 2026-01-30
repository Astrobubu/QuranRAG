'use client'

import { useState, useEffect } from 'react'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollText, ExternalLink } from 'lucide-react'

interface HadithData {
  collection: string
  collection_name: string
  book_number: number
  hadith_number: number
  arabic_text: string
  english_text: string
  grade: string
  narrator_chain: string
}

interface HadithHoverCardProps {
  reference: string // "bukhari:1:1" format
  displayText: string
  confidence?: number
  children?: React.ReactNode
}

export function HadithHoverCard({
  reference,
  displayText,
  confidence,
  children,
}: HadithHoverCardProps) {
  const [hadith, setHadith] = useState<HadithData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHadith = async () => {
      if (!reference) return

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/hadith/${reference}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch hadith')
        }

        setHadith(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchHadith()
  }, [reference])

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.9) return 'text-green-600 bg-green-100'
    if (conf >= 0.7) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getGradeColor = (grade: string) => {
    const lowerGrade = grade.toLowerCase()
    if (lowerGrade.includes('sahih')) return 'bg-green-100 text-green-800'
    if (lowerGrade.includes('hasan')) return 'bg-blue-100 text-blue-800'
    if (lowerGrade.includes('daif') || lowerGrade.includes("da'if")) return 'bg-yellow-100 text-yellow-800'
    return 'bg-gray-100 text-gray-800'
  }

  const getSunnahComUrl = () => {
    if (!hadith) return '#'
    return `https://sunnah.com/${hadith.collection}:${hadith.hadith_number}`
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children || (
          <span className="hadith-annotation inline-flex items-center gap-1">
            <ScrollText className="h-3 w-3" />
            {displayText}
          </span>
        )}
      </HoverCardTrigger>
      <HoverCardContent className="w-96" align="start">
        {loading && (
          <div className="text-center py-4 text-muted-foreground">
            Loading hadith...
          </div>
        )}

        {error && (
          <div className="text-center py-4 text-destructive">
            {error}
          </div>
        )}

        {hadith && (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <Badge variant="hadith" className="mb-1">
                  Hadith
                </Badge>
                <h4 className="font-semibold">
                  {hadith.collection_name}
                </h4>
                <p className="text-sm text-muted-foreground">
                  Book {hadith.book_number}, Hadith {hadith.hadith_number}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                {confidence && (
                  <Badge className={getConfidenceColor(confidence)}>
                    {(confidence * 100).toFixed(0)}%
                  </Badge>
                )}
                <Badge className={getGradeColor(hadith.grade)}>
                  {hadith.grade}
                </Badge>
              </div>
            </div>

            <Separator />

            {hadith.narrator_chain && (
              <p className="text-xs text-muted-foreground italic">
                {hadith.narrator_chain}
              </p>
            )}

            <div className="space-y-2">
              {hadith.arabic_text && (
                <p className="arabic-text text-lg leading-relaxed text-right">
                  {hadith.arabic_text}
                </p>
              )}

              <p className="text-sm">
                {hadith.english_text.length > 300
                  ? hadith.english_text.substring(0, 300) + '...'
                  : hadith.english_text}
              </p>
            </div>

            <Separator />

            <a
              href={getSunnahComUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View on Sunnah.com
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}

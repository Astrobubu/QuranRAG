'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { VerseHoverCard } from '@/components/VerseHoverCard'
import { HadithHoverCard } from '@/components/HadithHoverCard'
import { ExportButton } from '@/components/ExportButton'
import { BookOpen, ScrollText, Info } from 'lucide-react'
import type { Annotation } from '@/types'

interface AnnotatedViewerProps {
  transcriptId: string
  title: string
  annotatedText: string
  annotations: Annotation[]
}

// Parse annotation markdown: [[quran:2:255|Ayatul Kursi]] or [[hadith:bukhari:1:1|Sahih Bukhari]]
function parseAnnotationMarkdown(text: string) {
  const parts: (string | { type: 'quran' | 'hadith'; reference: string; display: string })[] = []
  const regex = /\[\[(quran|hadith):([^\|]+)\|([^\]]+)\]\]/g

  let lastIndex = 0
  let match

  while ((match = regex.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }

    // Add the annotation
    parts.push({
      type: match[1] as 'quran' | 'hadith',
      reference: match[2],
      display: match[3],
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}

export function AnnotatedViewer({
  transcriptId,
  title,
  annotatedText,
  annotations,
}: AnnotatedViewerProps) {
  const [showOriginal, setShowOriginal] = useState(false)

  // Get confidence for an annotation by reference
  const getConfidence = (type: string, reference: string) => {
    const annotation = annotations.find(
      a => a.type === type && a.reference_id === reference
    )
    return annotation?.confidence
  }

  // Parse the annotated text
  const parsedContent = useMemo(() => {
    return parseAnnotationMarkdown(annotatedText)
  }, [annotatedText])

  // Statistics
  const stats = useMemo(() => {
    const quranCount = annotations.filter(a => a.type === 'quran').length
    const hadithCount = annotations.filter(a => a.type === 'hadith').length
    const avgConfidence = annotations.length > 0
      ? annotations.reduce((sum, a) => sum + a.confidence, 0) / annotations.length
      : 0
    return { quranCount, hadithCount, avgConfidence, total: annotations.length }
  }, [annotations])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-muted-foreground">
            {stats.total} annotations found
          </p>
        </div>
        <ExportButton
          transcriptId={transcriptId}
          title={title}
          annotatedText={annotatedText}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-100">
              <BookOpen className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.quranCount}</p>
              <p className="text-sm text-muted-foreground">Quran Verses</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100">
              <ScrollText className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.hadithCount}</p>
              <p className="text-sm text-muted-foreground">Hadith</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-100">
              <Info className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(stats.avgConfidence * 100).toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center gap-6 text-sm">
            <span className="text-muted-foreground">Legend:</span>
            <div className="flex items-center gap-2">
              <span className="quran-annotation px-2 py-0.5 text-xs">
                <BookOpen className="h-3 w-3 inline mr-1" />
                Quran Verse
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hadith-annotation px-2 py-0.5 text-xs">
                <ScrollText className="h-3 w-3 inline mr-1" />
                Hadith
              </span>
            </div>
            <span className="text-muted-foreground ml-auto">
              Hover over annotations for details
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Annotated Transcript</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <div className="p-6 prose prose-sm max-w-none">
              {parsedContent.map((part, index) => {
                if (typeof part === 'string') {
                  // Render plain text, preserving line breaks
                  return (
                    <span key={index}>
                      {part.split('\n').map((line, i, arr) => (
                        <span key={i}>
                          {line}
                          {i < arr.length - 1 && <br />}
                        </span>
                      ))}
                    </span>
                  )
                }

                // Render annotation
                if (part.type === 'quran') {
                  return (
                    <VerseHoverCard
                      key={index}
                      reference={part.reference}
                      displayText={part.display}
                      confidence={getConfidence('quran', part.reference)}
                    />
                  )
                }

                if (part.type === 'hadith') {
                  return (
                    <HadithHoverCard
                      key={index}
                      reference={part.reference}
                      displayText={part.display}
                      confidence={getConfidence('hadith', part.reference)}
                    />
                  )
                }

                return null
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Annotations List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">All Annotations</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <ScrollArea className="h-[300px]">
            <div className="divide-y">
              {annotations.map((annotation, index) => (
                <div key={annotation.id} className="p-4 hover:bg-muted/50">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={annotation.type === 'quran' ? 'quran' : 'hadith'}>
                          {annotation.type === 'quran' ? 'Quran' : 'Hadith'}
                        </Badge>
                        <span className="font-mono text-sm">
                          {annotation.reference_id}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Original: "{annotation.original_text}"
                      </p>
                      {annotation.corrected_text !== annotation.original_text && (
                        <p className="text-sm">
                          Corrected: "{annotation.corrected_text}"
                        </p>
                      )}
                    </div>
                    <Badge
                      className={
                        annotation.confidence >= 0.9
                          ? 'bg-green-100 text-green-800'
                          : annotation.confidence >= 0.7
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {(annotation.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}

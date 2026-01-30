'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Download, FileText, FileIcon, Loader2 } from 'lucide-react'

interface ExportButtonProps {
  transcriptId: string
  title: string
  annotatedText: string
}

export function ExportButton({ transcriptId, title, annotatedText }: ExportButtonProps) {
  const [exporting, setExporting] = useState<string | null>(null)

  const exportAsText = async () => {
    setExporting('txt')
    try {
      // Convert markdown annotations to plain text
      const plainText = annotatedText
        .replace(/\[\[(quran|hadith):([^\|]+)\|([^\]]+)\]\]/g, '[$3]')

      const blob = new Blob([plainText], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  const exportAsMarkdown = async () => {
    setExporting('md')
    try {
      // Keep markdown format but add a header
      const markdown = `# ${title}\n\n---\n\n${annotatedText}\n\n---\n\n*Processed with QuranRAG*`

      const blob = new Blob([markdown], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  const exportAsHTML = async () => {
    setExporting('html')
    try {
      // Convert to HTML with styling
      let html = annotatedText
        .replace(
          /\[\[quran:([^\|]+)\|([^\]]+)\]\]/g,
          '<span class="quran-ref" data-ref="$1" style="color: #166534; text-decoration: underline; cursor: help;" title="Quran $1">$2</span>'
        )
        .replace(
          /\[\[hadith:([^\|]+)\|([^\]]+)\]\]/g,
          '<span class="hadith-ref" data-ref="$1" style="color: #b45309; text-decoration: underline; cursor: help;" title="Hadith $1">$2</span>'
        )
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')

      const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      line-height: 1.6;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 2px solid #166534;
      padding-bottom: 0.5rem;
    }
    .quran-ref {
      color: #166534;
      text-decoration: underline dotted;
      cursor: help;
    }
    .hadith-ref {
      color: #b45309;
      text-decoration: underline dashed;
      cursor: help;
    }
    p {
      margin: 1rem 0;
    }
    footer {
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e5e5e5;
      color: #666;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>${html}</p>
  <footer>Processed with QuranRAG</footer>
</body>
</html>`

      const blob = new Blob([fullHTML], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  const exportAsJSON = async () => {
    setExporting('json')
    try {
      // Fetch full data including annotations
      const response = await fetch(`/api/process?id=${transcriptId}`)
      const data = await response.json()

      const exportData = {
        title,
        processedAt: new Date().toISOString(),
        annotatedText,
        annotations: data.annotations || [],
        statistics: {
          quranCount: data.annotations?.filter((a: any) => a.type === 'quran').length || 0,
          hadithCount: data.annotations?.filter((a: any) => a.type === 'hadith').length || 0,
        },
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${title}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setExporting(null)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Transcript</DialogTitle>
          <DialogDescription>
            Choose a format to export your annotated transcript
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={exportAsText}
            disabled={exporting !== null}
          >
            {exporting === 'txt' ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <FileText className="h-8 w-8" />
            )}
            <span>Plain Text (.txt)</span>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={exportAsMarkdown}
            disabled={exporting !== null}
          >
            {exporting === 'md' ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <FileIcon className="h-8 w-8" />
            )}
            <span>Markdown (.md)</span>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={exportAsHTML}
            disabled={exporting !== null}
          >
            {exporting === 'html' ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <FileIcon className="h-8 w-8" />
            )}
            <span>HTML (.html)</span>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={exportAsJSON}
            disabled={exporting !== null}
          >
            {exporting === 'json' ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <FileIcon className="h-8 w-8" />
            )}
            <span>JSON (.json)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

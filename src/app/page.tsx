import { UploadForm } from '@/components/UploadForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, ScrollText, Sparkles, Play, Headphones } from 'lucide-react'
import Link from 'next/link'

// Demo transcripts
const DEMOS = [
  {
    id: '39db693c-b15f-4edb-8894-955c1e80c291',
    title: 'Dr. Omar Suleiman',
    subtitle: 'Loneliness & Qadar',
    language: 'English',
    duration: '10:40',
    audio: '/demos/omar-suleiman.mp3',
    stats: { quran: 2, hadith: 4 },
  },
  {
    id: '4ea66d81-39a0-4a06-8b6c-c5fd8eeb4a41',
    title: 'الشيخ عزيز بن فرحان',
    subtitle: 'الابتلاء والعقوبة',
    language: 'Arabic',
    duration: '4:44',
    audio: '/demos/sheikh-aziz.mp3',
    stats: { quran: 6, hadith: 2 },
  },
]

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BookOpen className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">QuranRAG</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Automatically detect and annotate Quranic verses and Hadith references
          in Islamic lecture transcripts using AI-powered semantic search
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
        <Card>
          <CardHeader className="pb-3">
            <div className="p-2 w-fit rounded-full bg-green-100 mb-2">
              <BookOpen className="h-5 w-5 text-green-600" />
            </div>
            <CardTitle className="text-lg">Quran Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Identifies and links Quranic verses, even when paraphrased or
              transliterated, with Arabic text and translations.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="p-2 w-fit rounded-full bg-amber-100 mb-2">
              <ScrollText className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-lg">Hadith Matching</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Detects Hadith references from Bukhari, Muslim, and other
              collections with authenticity grades.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="p-2 w-fit rounded-full bg-blue-100 mb-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
            </div>
            <CardTitle className="text-lg">AI-Powered</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Uses GPT-4 and semantic search to accurately match references
              with confidence scores.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Demo Section */}
      <div className="mb-12 max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <Badge variant="secondary" className="mb-2">Live Demos</Badge>
          <h2 className="text-2xl font-bold">See It In Action</h2>
          <p className="text-muted-foreground">Try our pre-processed Islamic lectures with audio</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {DEMOS.map((demo) => (
            <Card key={demo.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{demo.title}</CardTitle>
                    <CardDescription>{demo.subtitle}</CardDescription>
                  </div>
                  <Badge variant="outline">{demo.language}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Audio Player */}
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Headphones className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{demo.duration}</span>
                  </div>
                  <audio controls className="w-full h-10" preload="none">
                    <source src={demo.audio} type="audio/mpeg" />
                  </audio>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4 text-green-600" />
                    <span>{demo.stats.quran} Quran verses</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ScrollText className="h-4 w-4 text-amber-600" />
                    <span>{demo.stats.hadith} Hadith</span>
                  </div>
                </div>

                {/* View Button */}
                <Link href={`/view/${demo.id}`} className="block">
                  <Button className="w-full">
                    <Play className="mr-2 h-4 w-4" />
                    View Annotated Transcript
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Upload Form */}
      <UploadForm />

      {/* How it works */}
      <div className="mt-16 max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-4">
          {[
            { step: 1, title: 'Upload', desc: 'Upload your lecture transcript' },
            { step: 2, title: 'Detect', desc: 'AI identifies Quran & Hadith' },
            { step: 3, title: 'Match', desc: 'Semantic search finds sources' },
            { step: 4, title: 'Annotate', desc: 'Interactive annotated viewer' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-3 font-bold">
                {step}
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 pt-8 border-t text-center text-sm text-muted-foreground">
        <p>
          QuranRAG uses AI to assist in identifying Islamic references.
          Always verify annotations with scholarly sources.
        </p>
      </footer>
    </main>
  )
}

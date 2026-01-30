# QuranRAG - Islamic Lecture Transcript Annotator

**[Live Demo →](https://quran-rag.vercel.app)**

A web application that processes transcribed Islamic lectures, automatically detecting and annotating Quranic verses and Hadith references with corrections, links, and rich metadata.

## Features

- **Quran Detection**: Identifies and links Quranic verses, even when paraphrased or transliterated
- **Hadith Matching**: Detects Hadith references from Bukhari, Muslim, and other collections
- **AI-Powered**: Uses GPT-4 and semantic search (RAG) to accurately match references
- **Interactive Viewer**: Hover cards show Arabic text, translations, and metadata
- **Export Options**: Export annotated transcripts as TXT, Markdown, HTML, or JSON

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React + TailwindCSS + Shadcn UI
- **Backend**: Next.js API Routes + OpenAI GPT-4
- **Database**: Supabase (PostgreSQL + pgvector)
- **Embeddings**: OpenAI text-embedding-3-small

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the environment example file and configure:
```bash
cp .env.local.example .env.local
```

3. Add your API keys to `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
```

### Database Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL from `supabase/schema.sql` to create tables and functions

### Seeding Data

After setting up the database, seed the Quran and Hadith data:

```bash
# Seed Quran verses (fetches from quran.com API)
npm run seed:quran

# Seed Hadith (uses sample data or sunnah.com API if SUNNAH_API_KEY is set)
npm run seed:hadith
```

### Running the Application

```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to use the application.

## Project Structure

```
QuranRAG/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── upload/        # Transcript upload
│   │   │   ├── process/       # Processing pipeline
│   │   │   ├── verses/        # Quran verse API
│   │   │   ├── hadith/        # Hadith API
│   │   │   └── search/        # Semantic search
│   │   ├── process/[id]/      # Processing status page
│   │   └── view/[id]/         # Annotated viewer page
│   ├── components/            # React components
│   │   ├── ui/               # Shadcn UI components
│   │   ├── UploadForm.tsx
│   │   ├── ProcessingStatus.tsx
│   │   ├── AnnotatedViewer.tsx
│   │   ├── VerseHoverCard.tsx
│   │   ├── HadithHoverCard.tsx
│   │   └── ExportButton.tsx
│   ├── lib/                   # Core libraries
│   │   ├── supabase.ts       # Database client
│   │   ├── openai.ts         # OpenAI client & prompts
│   │   ├── embeddings.ts     # Embedding generation
│   │   ├── rag.ts            # RAG search functions
│   │   ├── processor.ts      # Main processing pipeline
│   │   └── arabic-utils.ts   # Arabic text utilities
│   └── types/                # TypeScript types
├── scripts/
│   ├── seed-quran.ts         # Quran data seeding
│   └── seed-hadith.ts        # Hadith data seeding
├── supabase/
│   └── schema.sql            # Database schema
└── package.json
```

## How It Works

1. **Upload**: User uploads a lecture transcript (text file or paste)
2. **Detection**: GPT-4 analyzes the text to find Quran/Hadith references
3. **Matching**: Semantic search (pgvector) finds the most similar verses/hadith
4. **Verification**: GPT-4 verifies matches and assigns confidence scores
5. **Annotation**: References above 70% confidence are auto-annotated
6. **View**: Interactive viewer with hover cards showing full details

## Annotation Format

In the annotated text, references appear as markdown links:
```
[[quran:2:255|Ayatul Kursi]]
[[hadith:bukhari:1:1|Sahih al-Bukhari 1:1]]
```

## Confidence Thresholds

| Confidence | Action |
|------------|--------|
| > 90% | Auto-annotate, high confidence |
| 70-90% | Auto-annotate, shown as "likely match" |
| 50-70% | Suggested to user, not auto-applied |
| < 50% | Ignored as too uncertain |

## API Endpoints

- `POST /api/upload` - Upload transcript
- `POST /api/process` - Start processing
- `GET /api/process?id=X` - Get processing status
- `GET /api/verses/2:255` - Get Quran verse
- `GET /api/hadith/bukhari:1:1` - Get Hadith
- `GET /api/search?q=text&type=all` - Semantic search

## License

MIT

-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Quran verses table
CREATE TABLE IF NOT EXISTS quran_verses (
  id SERIAL PRIMARY KEY,
  surah_number INTEGER NOT NULL,
  ayah_number INTEGER NOT NULL,
  arabic_text TEXT NOT NULL,
  english_text TEXT NOT NULL,
  transliteration TEXT NOT NULL,
  embedding vector(1536),
  UNIQUE(surah_number, ayah_number)
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS quran_verses_embedding_idx
ON quran_verses
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Hadith table
CREATE TABLE IF NOT EXISTS hadith (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection TEXT NOT NULL,
  book_number INTEGER NOT NULL,
  hadith_number INTEGER NOT NULL,
  arabic_text TEXT NOT NULL,
  english_text TEXT NOT NULL,
  grade TEXT DEFAULT 'unknown',
  narrator_chain TEXT DEFAULT '',
  embedding vector(1536),
  UNIQUE(collection, book_number, hadith_number)
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS hadith_embedding_idx
ON hadith
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Transcripts table
CREATE TABLE IF NOT EXISTS transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  original_text TEXT NOT NULL,
  annotated_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'complete', 'error'))
);

-- Annotations table
CREATE TABLE IF NOT EXISTS annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('quran', 'hadith')),
  reference_id TEXT NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  start_index INTEGER NOT NULL,
  end_index INTEGER NOT NULL
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS annotations_transcript_idx ON annotations(transcript_id);
CREATE INDEX IF NOT EXISTS transcripts_status_idx ON transcripts(status);

-- Function for semantic search on Quran verses
CREATE OR REPLACE FUNCTION search_quran_verses(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id int,
  surah_number int,
  ayah_number int,
  arabic_text text,
  english_text text,
  transliteration text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    qv.id,
    qv.surah_number,
    qv.ayah_number,
    qv.arabic_text,
    qv.english_text,
    qv.transliteration,
    1 - (qv.embedding <=> query_embedding) as similarity
  FROM quran_verses qv
  WHERE qv.embedding IS NOT NULL
    AND 1 - (qv.embedding <=> query_embedding) > match_threshold
  ORDER BY qv.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function for semantic search on Hadith
CREATE OR REPLACE FUNCTION search_hadith(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  collection text,
  book_number int,
  hadith_number int,
  arabic_text text,
  english_text text,
  grade text,
  narrator_chain text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.collection,
    h.book_number,
    h.hadith_number,
    h.arabic_text,
    h.english_text,
    h.grade,
    h.narrator_chain,
    1 - (h.embedding <=> query_embedding) as similarity
  FROM hadith h
  WHERE h.embedding IS NOT NULL
    AND 1 - (h.embedding <=> query_embedding) > match_threshold
  ORDER BY h.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Row Level Security (optional, enable if needed)
-- ALTER TABLE quran_verses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE hadith ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated users (adjust as needed)
-- CREATE POLICY "Public read access" ON quran_verses FOR SELECT USING (true);
-- CREATE POLICY "Public read access" ON hadith FOR SELECT USING (true);

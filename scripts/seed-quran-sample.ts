/**
 * Quick sample Quran seeding for testing
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
const openai = new OpenAI({ apiKey: OPENAI_API_KEY })

// Sample verses for testing
const sampleVerses = [
  {
    surah_number: 1,
    ayah_number: 1,
    arabic_text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    english_text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
    transliteration: 'Bismillahir rahmanir raheem',
  },
  {
    surah_number: 1,
    ayah_number: 2,
    arabic_text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    english_text: 'All praise is due to Allah, Lord of the worlds.',
    transliteration: 'Alhamdu lillahi rabbil aalameen',
  },
  {
    surah_number: 1,
    ayah_number: 3,
    arabic_text: 'الرَّحْمَٰنِ الرَّحِيمِ',
    english_text: 'The Entirely Merciful, the Especially Merciful.',
    transliteration: 'Ar-rahmanir raheem',
  },
  {
    surah_number: 1,
    ayah_number: 4,
    arabic_text: 'مَالِكِ يَوْمِ الدِّينِ',
    english_text: 'Sovereign of the Day of Recompense.',
    transliteration: 'Maliki yawmid deen',
  },
  {
    surah_number: 2,
    ayah_number: 255,
    arabic_text: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
    english_text: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth.',
    transliteration: 'Allahu la ilaha illa huwal hayyul qayyum la takhuzuhu sinatun wa la nawm lahu ma fis samawati wa ma fil ard',
  },
  {
    surah_number: 103,
    ayah_number: 1,
    arabic_text: 'وَالْعَصْرِ',
    english_text: 'By time,',
    transliteration: 'Wal asr',
  },
  {
    surah_number: 103,
    ayah_number: 2,
    arabic_text: 'إِنَّ الْإِنسَانَ لَفِي خُسْرٍ',
    english_text: 'Indeed, mankind is in loss,',
    transliteration: 'Innal insana lafi khusr',
  },
  {
    surah_number: 103,
    ayah_number: 3,
    arabic_text: 'إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ',
    english_text: 'Except for those who have believed and done righteous deeds and advised each other to truth and advised each other to patience.',
    transliteration: 'Illal ladhina amanu wa amilus salihati wa tawasaw bil haqqi wa tawasaw bis sabr',
  },
  {
    surah_number: 112,
    ayah_number: 1,
    arabic_text: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
    english_text: 'Say, "He is Allah, [who is] One,',
    transliteration: 'Qul huwa Allahu ahad',
  },
  {
    surah_number: 112,
    ayah_number: 2,
    arabic_text: 'اللَّهُ الصَّمَدُ',
    english_text: 'Allah, the Eternal Refuge.',
    transliteration: 'Allahus samad',
  },
  {
    surah_number: 112,
    ayah_number: 3,
    arabic_text: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
    english_text: 'He neither begets nor is born,',
    transliteration: 'Lam yalid wa lam yulad',
  },
  {
    surah_number: 112,
    ayah_number: 4,
    arabic_text: 'وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ',
    english_text: 'Nor is there to Him any equivalent."',
    transliteration: 'Wa lam yakun lahu kufuwan ahad',
  },
]

async function generateEmbeddings(verses: typeof sampleVerses) {
  const texts = verses.map(v =>
    `Quran ${v.surah_number}:${v.ayah_number}. Arabic: ${v.arabic_text}. English: ${v.english_text}. Transliteration: ${v.transliteration}`
  )

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  })

  return response.data.map(d => d.embedding)
}

async function seedSampleQuran() {
  console.log('Seeding sample Quran verses...')

  // Check existing
  const { count } = await supabase
    .from('quran_verses')
    .select('*', { count: 'exact', head: true })

  if (count && count > 0) {
    console.log(`Database already has ${count} verses. Skipping.`)
    return
  }

  // Generate embeddings
  console.log('Generating embeddings...')
  const embeddings = await generateEmbeddings(sampleVerses)

  // Insert
  const insertData = sampleVerses.map((v, i) => ({
    surah_number: v.surah_number,
    ayah_number: v.ayah_number,
    arabic_text: v.arabic_text,
    english_text: v.english_text,
    transliteration: v.transliteration,
    embedding: embeddings[i],
  }))

  const { error } = await supabase.from('quran_verses').insert(insertData)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log(`Inserted ${sampleVerses.length} sample verses`)
  }
}

seedSampleQuran().catch(console.error)

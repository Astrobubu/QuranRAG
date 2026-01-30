import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkCounts() {
  const { count: quranCount } = await supabase
    .from('quran_verses')
    .select('*', { count: 'exact', head: true })

  const { count: hadithCount } = await supabase
    .from('hadith')
    .select('*', { count: 'exact', head: true })

  const { count: bukhariCount } = await supabase
    .from('hadith')
    .select('*', { count: 'exact', head: true })
    .eq('collection', 'bukhari')

  const { count: muslimCount } = await supabase
    .from('hadith')
    .select('*', { count: 'exact', head: true })
    .eq('collection', 'muslim')

  console.log('📊 Database Status:')
  console.log(`  Quran verses: ${quranCount}`)
  console.log(`  Total hadith: ${hadithCount}`)
  console.log(`    - Bukhari: ${bukhariCount}`)
  console.log(`    - Muslim: ${muslimCount}`)
}

checkCounts().catch(console.error)

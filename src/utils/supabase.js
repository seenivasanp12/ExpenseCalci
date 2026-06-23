import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key || url.includes('your-project-id')) {
  console.warn('⚠ Supabase credentials not set. Copy .env.example → .env and fill in your keys.')
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder')

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('[ERROR] SUPABASE_URL or SUPABASE_SERVICE_KEY missing in backend/.env')
  process.exit(1)
}

// Service role key bypasses RLS — NEVER expose this to the browser
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: ws },
  }
)

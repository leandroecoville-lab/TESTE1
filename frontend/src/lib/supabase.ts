// CORE: Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('ERR_MISSING_SUPABASE_ENV: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
}

// EXPORT
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

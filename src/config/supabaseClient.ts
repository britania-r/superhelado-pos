
import { createClient } from '@supabase/supabase-js'
import { supabaseUrl, supabaseAnonKey } from './secrets' 
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
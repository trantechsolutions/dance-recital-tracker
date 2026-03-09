import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Supabase] Missing environment variables!\n" +
    "  VITE_SUPABASE_URL:", supabaseUrl ? "✓ set" : "✗ MISSING", "\n" +
    "  VITE_SUPABASE_ANON_KEY:", supabaseAnonKey ? "✓ set" : "✗ MISSING", "\n" +
    "Create a .env file in the project root with these values from your Supabase dashboard."
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export const authorizedUsers = (import.meta.env.VITE_AUTHORIZED_ADMINS || "").split(',');
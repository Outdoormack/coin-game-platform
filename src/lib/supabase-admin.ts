import { createClient } from '@supabase/supabase-js';

// Server-only admin client factory using service role key.
// Bypasses RLS — NEVER import this in client components or expose to the browser.
// Call createAdminClient() inside API route handlers only (not at module level).

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Use service role key if available; fall back to anon key so reads still work
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key);
}

export { DEFAULT_GROUP_ID } from './supabase';

import { createClient } from '@supabase/supabase-js';

// Server-only admin client factory using service role key.
// Bypasses RLS — NEVER import this in client components or expose to the browser.
// Call createAdminClient() inside API route handlers only (not at module level).

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export { DEFAULT_GROUP_ID } from './supabase';

import { createClient } from '@supabase/supabase-js';

// Server-only admin client using service role key.
// Bypasses RLS — NEVER import this in client components or expose to the browser.
// Only use in API route handlers (src/app/api/**).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export { DEFAULT_GROUP_ID } from './supabase';

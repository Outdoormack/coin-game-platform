import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client (used in components and API routes)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Default group ID for MVP (single-tenant)
// TODO: Replace with dynamic group resolution from domain/subdomain
export const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000001';

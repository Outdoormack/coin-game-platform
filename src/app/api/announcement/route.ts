import { NextResponse } from 'next/server';
import { supabase, DEFAULT_GROUP_ID } from '@/lib/supabase';

export async function GET() {
  try {
    const { data } = await supabase
      .from('group_settings')
      .select('value')
      .eq('group_id', DEFAULT_GROUP_ID)
      .eq('key', 'announcement_text')
      .single();

    return NextResponse.json({ text: data?.value?.trim() || null });
  } catch {
    return NextResponse.json({ text: null });
  }
}

import { NextResponse } from 'next/server';
import { supabase, DEFAULT_GROUP_ID } from '@/lib/supabase';

export async function GET() {
  try {
    const groupId = DEFAULT_GROUP_ID; // TODO: Resolve from domain

    const { data: claims, error } = await supabase
      .from('claims')
      .select(`
        id,
        mode,
        total_points,
        bonus_breakdown,
        coin_effect,
        coin_rarity,
        story_text,
        photo_url,
        claimed_at,
        player:players!claims_player_id_fkey(display_name, title),
        previous_holder:players!claims_previous_holder_id_fkey(display_name),
        coin:coins!claims_coin_id_fkey(external_id, rarity)
      `)
      .eq('group_id', groupId)
      .order('claimed_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Recent claims error:', error);
      return NextResponse.json({ ok: false, error: 'Failed to load recent claims' }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recent = (claims || []).map((c: any) => ({
      id: c.id,
      mode: c.mode,
      total_points: Number(c.total_points),
      coin_effect: c.coin_effect,
      coin_rarity: c.coin_rarity,
      story_text: c.story_text,
      photo_url: c.photo_url,
      claimed_at: c.claimed_at,
      player_name: c.player?.display_name || 'Unknown',
      player_title: c.player?.title || '',
      previous_holder_name: c.previous_holder?.display_name || null,
      coin_external_id: c.coin?.external_id || '',
    }));

    return NextResponse.json({ ok: true, recent });
  } catch (err) {
    console.error('Recent error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase, DEFAULT_GROUP_ID } from '@/lib/supabase';

const RUST_MESSAGES = [
  'let a coin collect dust. The Treasury disapproves.',
  'forgot about a coin. Nature took its course.',
  'learned that neglect has consequences.',
  'left a coin unattended too long. It rusted.',
  'has a coin that has seen better days.',
  'should check on their coins more often.',
  'discovered that coins do not like being ignored.',
];

function pickRustMessage(seed: string): string {
  // Deterministic pick based on seed so it doesn't change on refresh
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return RUST_MESSAGES[Math.abs(hash) % RUST_MESSAGES.length];
}

export async function GET() {
  try {
    const groupId = DEFAULT_GROUP_ID; // TODO: Resolve from domain

    // Fetch recent claims
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

    // Fetch recently rusted coins (within last 30 days)
    const rustCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: rustedCoins } = await supabase
      .from('coins')
      .select(`
        id,
        external_id,
        rust_start,
        current_holder:players!coins_current_holder_id_fkey(display_name)
      `)
      .eq('group_id', groupId)
      .eq('status', 'rusted')
      .not('rust_start', 'is', null)
      .gte('rust_start', rustCutoff);

    // Build claim entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claimEntries = (claims || []).map((c: any) => ({
      id: c.id,
      type: 'claim' as const,
      mode: c.mode,
      total_points: Number(c.total_points),
      coin_effect: c.coin_effect,
      coin_rarity: c.coin_rarity,
      story_text: c.story_text,
      photo_url: c.photo_url,
      timestamp: c.claimed_at,
      player_name: c.player?.display_name || 'Unknown',
      player_title: c.player?.title || '',
      previous_holder_name: c.previous_holder?.display_name || null,
      coin_external_id: c.coin?.external_id || '',
    }));

    // Build rust entries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rustEntries = (rustedCoins || []).map((c: any) => ({
      id: `rust-${c.id}`,
      type: 'rust' as const,
      mode: null,
      total_points: -1,
      coin_effect: null,
      coin_rarity: null,
      story_text: pickRustMessage(c.id),
      photo_url: null,
      timestamp: c.rust_start,
      player_name: c.current_holder?.display_name || 'Someone',
      player_title: '',
      previous_holder_name: null,
      coin_external_id: c.external_id || '',
    }));

    // Merge and sort by timestamp, limit to 20
    const all = [...claimEntries, ...rustEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    // Map to API response format (keeping backward compat)
    const recent = all.map(e => ({
      id: e.id,
      type: e.type,
      mode: e.mode,
      total_points: e.total_points,
      coin_effect: e.coin_effect,
      coin_rarity: e.coin_rarity,
      story_text: e.type === 'rust' ? null : e.story_text,
      rust_message: e.type === 'rust' ? e.story_text : null,
      photo_url: e.photo_url,
      claimed_at: e.timestamp,
      player_name: e.player_name,
      player_title: e.player_title,
      previous_holder_name: e.previous_holder_name,
      coin_external_id: e.coin_external_id,
    }));

    return NextResponse.json({ ok: true, recent });
  } catch (err) {
    console.error('Recent error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

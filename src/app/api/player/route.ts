import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, DEFAULT_GROUP_ID } from '@/lib/supabase-admin';

export async function PATCH(request: NextRequest) {
  const supabase = createAdminClient();
  const { name, email } = await request.json();
  if (!name?.trim()) return NextResponse.json({ ok: false, error: 'Name required' }, { status: 400 });

  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('group_id', DEFAULT_GROUP_ID)
    .ilike('display_name', name.trim())
    .single();

  if (!player) return NextResponse.json({ ok: false, error: 'Player not found' });

  await supabase.from('players').update({ email: email?.trim() || null }).eq('id', player.id);

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  try {
  const supabase = createAdminClient();
  const name = request.nextUrl.searchParams.get('name')?.trim();
  if (!name) return NextResponse.json({ ok: false, error: 'Name required' }, { status: 400 });

  // Find player (case-insensitive)
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('group_id', DEFAULT_GROUP_ID)
    .ilike('display_name', name)
    .single();

  if (!player) return NextResponse.json({ ok: false, error: 'Player not found' });

  // Get season rank
  const { data: ranked } = await supabase
    .from('players')
    .select('id')
    .eq('group_id', DEFAULT_GROUP_ID)
    .gt('season_score', 0)
    .order('season_score', { ascending: false });

  const rank = ranked ? ranked.findIndex(p => p.id === player.id) + 1 : 0;

  // Get total coins in group
  const { count: totalCoins } = await supabase
    .from('coins')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', DEFAULT_GROUP_ID)
    .eq('active', true);

  // Get badges
  const { data: badges } = await supabase
    .from('player_badges')
    .select('badge_id, earned_at, badge_definitions(name, icon)')
    .eq('player_id', player.id)
    .order('earned_at', { ascending: false });

  // Only include email if the request hints it's the player themselves
  // (client sends ?self=1 when the name matches localStorage)
  const isSelf = request.nextUrl.searchParams.get('self') === '1';

  return NextResponse.json({
    ok: true,
    player: {
      display_name: player.display_name,
      title: player.title,
      level: player.level,
      xp: player.xp,
      season_score: player.season_score,
      lifetime_score: player.lifetime_score,
      season_rank: rank || null,
      current_holdings: player.current_holdings,
      total_claims: player.total_claims,
      total_steals: player.total_steals,
      coins_discovered: player.coins_discovered,
      streak_weeks: player.streak_weeks,
      total_coins: totalCoins || 0,
      email: isSelf ? (player.email || null) : null,
    },
    badges: badges || [],
  });
  } catch (err) {
    console.error('Player GET error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

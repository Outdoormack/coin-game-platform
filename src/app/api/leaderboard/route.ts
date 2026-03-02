import { NextResponse } from 'next/server';
import { supabase, DEFAULT_GROUP_ID } from '@/lib/supabase';

export async function GET() {
  try {
    const groupId = DEFAULT_GROUP_ID; // TODO: Resolve from domain

    const { data: players, error } = await supabase
      .from('players')
      .select('id, display_name, title, season_score, lifetime_score, current_holdings, streak_weeks, xp, level')
      .eq('group_id', groupId)
      .or('season_score.gt.0,current_holdings.gt.0,total_claims.gt.0')
      .order('season_score', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Leaderboard error:', error);
      return NextResponse.json({ ok: false, error: 'Failed to load leaderboard' }, { status: 500 });
    }

    const leaderboard = (players || []).map((p, i) => ({
      rank: i + 1,
      display_name: p.display_name,
      title: p.title,
      season_score: Number(p.season_score),
      lifetime_score: Number(p.lifetime_score),
      current_holdings: p.current_holdings,
      streak_weeks: p.streak_weeks,
      xp: p.xp,
      level: p.level,
    }));

    return NextResponse.json({ ok: true, leaderboard });
  } catch (err) {
    console.error('Leaderboard error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

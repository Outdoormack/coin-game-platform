import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, DEFAULT_GROUP_ID } from '@/lib/supabase-admin';

// Vercel Cron calls this route daily.
// Protected by CRON_SECRET — reject unauthorized requests.
export const maxDuration = 30; // seconds

export async function GET(request: NextRequest) {
  // --- Auth check ---
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const results: Record<string, unknown> = {};

  // ============================================================
  // 1. RUST CHECK — coins idle for 14+ days become rusted
  // ============================================================
  try {
    // Get rust_days setting (default 14)
    const { data: rustSetting } = await supabase
      .from('group_settings')
      .select('value')
      .eq('group_id', DEFAULT_GROUP_ID)
      .eq('key', 'rust_days')
      .single();

    const rustDays = rustSetting?.value ? parseInt(rustSetting.value, 10) : 14;
    const rustCutoff = new Date(Date.now() - rustDays * 24 * 60 * 60 * 1000).toISOString();

    // Find coins that should rust:
    // - Active status (not already rusted, frozen, hot, or bounty)
    // - Have been claimed at least once (last_claimed_at is not null)
    // - last_claimed_at is older than the cutoff
    // - NOT a rust-proof coin (current_effect !== 'rust')
    const { data: rustableCoins, error: rustErr } = await supabase
      .from('coins')
      .select('id, current_holder_id, external_id')
      .eq('group_id', DEFAULT_GROUP_ID)
      .eq('active', true)
      .eq('status', 'active')
      .neq('current_effect', 'rust') // Rust-Proof coins are immune
      .not('last_claimed_at', 'is', null)
      .not('current_holder_id', 'is', null)
      .lt('last_claimed_at', rustCutoff);

    if (rustErr) {
      console.error('Rust check query error:', rustErr);
      results.rust = { error: rustErr.message };
    } else if (rustableCoins && rustableCoins.length > 0) {
      const coinIds = rustableCoins.map(c => c.id);

      // For each coin, find the PHYSICAL holder — the last player who EARNED it.
      // current_holder_id may be a stealer who doesn't physically have the coin.
      const physicalHolderPenalties: Record<string, number> = {};

      for (const coin of rustableCoins) {
        // Find the most recent earned claim for this coin
        const { data: lastEarnedClaim } = await supabase
          .from('claims')
          .select('player_id')
          .eq('coin_id', coin.id)
          .eq('mode', 'earned')
          .order('claimed_at', { ascending: false })
          .limit(1)
          .single();

        const penalizeId = lastEarnedClaim?.player_id || null;
        if (penalizeId) {
          physicalHolderPenalties[penalizeId] =
            (physicalHolderPenalties[penalizeId] || 0) + 1;
        }
      }

      // Set coins to rusted
      const { error: updateErr } = await supabase
        .from('coins')
        .update({
          status: 'rusted',
          rust_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in('id', coinIds);

      if (updateErr) {
        console.error('Rust update error:', updateErr);
        results.rust = { error: updateErr.message };
      } else {
        // Deduct 1 point per rusted coin from each PHYSICAL holder
        for (const [holderId, count] of Object.entries(physicalHolderPenalties)) {
          const { data: holder } = await supabase
            .from('players')
            .select('season_score, lifetime_score')
            .eq('id', holderId)
            .single();

          if (holder) {
            await supabase
              .from('players')
              .update({
                season_score: Math.max(0, (holder.season_score || 0) - count),
                lifetime_score: Math.max(0, (holder.lifetime_score || 0) - count),
              })
              .eq('id', holderId);
          }
        }

        results.rust = {
          coinsRusted: rustableCoins.length,
          coinIds: rustableCoins.map(c => c.external_id),
          holderspenalized: Object.keys(physicalHolderPenalties).length,
        };
      }
    } else {
      results.rust = { coinsRusted: 0 };
    }
  } catch (err) {
    console.error('Rust check error:', err);
    results.rust = { error: String(err) };
  }

  // ============================================================
  // 2. STREAK DECAY — (future) reset streaks for inactive players
  // ============================================================
  results.streaks = { status: 'not yet implemented' };

  // ============================================================
  // 3. BOUNTY CHECK — (future) auto-bounty when leader pulls ahead
  // ============================================================
  results.bounties = { status: 'not yet implemented' };

  return NextResponse.json({
    ok: true,
    ran_at: new Date().toISOString(),
    results,
  });
}

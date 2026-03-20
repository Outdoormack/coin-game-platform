import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, DEFAULT_GROUP_ID } from '@/lib/supabase-admin';
import { calculateScore, calculateXP, titleFromXP, levelFromXP } from '@/lib/scoring';
import { ClaimRequest, ClaimContext, Coin, Player } from '@/lib/types';
import { checkBadges } from '@/lib/badges';
import { Resend } from 'resend';

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  try {
    const body: ClaimRequest = await request.json();
    const { coinExternalId, playerName, mode, storyText, photoUrl } = body;

    // --- Validation ---
    if (!coinExternalId) return NextResponse.json({ ok: false, error: 'Missing coin ID' }, { status: 400 });
    if (!playerName?.trim()) return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
    if (!mode || !['earned', 'stolen'].includes(mode)) {
      return NextResponse.json({ ok: false, error: 'Mode must be "earned" or "stolen"' }, { status: 400 });
    }

    const groupId = DEFAULT_GROUP_ID; // TODO: Resolve from domain/subdomain

    // --- Look up coin ---
    const { data: coin, error: coinErr } = await supabase
      .from('coins')
      .select('*')
      .eq('group_id', groupId)
      .eq('external_id', coinExternalId)
      .single();

    if (coinErr || !coin) {
      return NextResponse.json({ ok: false, error: 'Coin not found' }, { status: 404 });
    }
    if (!coin.active) {
      return NextResponse.json({ ok: false, error: 'This coin is inactive' }, { status: 400 });
    }
    if (coin.status === 'frozen' && coin.status_expires && new Date(coin.status_expires) > new Date()) {
      return NextResponse.json({ ok: false, error: 'This coin is frozen and cannot be claimed right now' }, { status: 400 });
    }

    // --- Find or create player ---
    const cleanName = playerName.trim();
    let { data: player } = await supabase
      .from('players')
      .select('*')
      .eq('group_id', groupId)
      .ilike('display_name', cleanName)
      .single();

    if (!player) {
      // Create new player
      const { data: newPlayer, error: createErr } = await supabase
        .from('players')
        .insert({ group_id: groupId, display_name: cleanName })
        .select()
        .single();

      if (createErr || !newPlayer) {
        console.error('Player creation error:', createErr);
        return NextResponse.json({ ok: false, error: 'Could not create player' }, { status: 500 });
      }
      player = newPlayer;
    }

    // --- No double-dip check ---
    if (coin.current_holder_id === player.id) {
      return NextResponse.json({
        ok: false,
        error: 'You already hold this coin. Someone else must claim it first.',
      }, { status: 400 });
    }

    // --- Get previous holder ---
    let previousHolder: Player | null = null;
    if (coin.current_holder_id) {
      const { data: prevHolder } = await supabase
        .from('players')
        .select('*')
        .eq('id', coin.current_holder_id)
        .single();
      previousHolder = prevHolder;
    }

    // --- Get leaderboard context ---
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, season_score')
      .eq('group_id', groupId)
      .gt('season_score', 0)
      .order('season_score', { ascending: false });

    const activePlayers = allPlayers || [];
    const playerIdx = activePlayers.findIndex(p => p.id === player!.id);
    const playerRankPercentile = activePlayers.length > 0
      ? ((activePlayers.length - playerIdx - 1) / activePlayers.length) * 100
      : 50;
    const previousHolderRank = previousHolder
      ? (activePlayers.findIndex(p => p.id === previousHolder!.id) + 1) || 999
      : 999;

    // --- Check first discovery ---
    const { data: existingDiscovery } = await supabase
      .from('discoveries')
      .select('id')
      .eq('player_id', player.id)
      .eq('coin_id', coin.id)
      .single();
    const isFirstDiscovery = !existingDiscovery;

    // --- Count claims today ---
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: claimsToday } = await supabase
      .from('claims')
      .select('id', { count: 'exact', head: true })
      .eq('player_id', player.id)
      .gte('claimed_at', todayStart.toISOString());

    // --- Detect revenge (previousHolder stole from current claimer within 72h) ---
    let isRevenge = false;
    if (mode === 'stolen' && previousHolder) {
      const { data: priorTheft } = await supabase
        .from('claims')
        .select('id')
        .eq('mode', 'stolen')
        .eq('player_id', previousHolder.id)
        .eq('previous_holder_id', player.id)
        .gte('claimed_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
        .limit(1);
      isRevenge = !!(priorTheft && priorTheft.length > 0);
    }

    // --- Get active season ---
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('group_id', groupId)
      .eq('status', 'active')
      .single();

    // --- Chain effect: count unique holders this season ---
    let chainCount = 0;
    if (coin.current_effect === 'chain' && activeSeason?.id) {
      const { data: chainClaims } = await supabase
        .from('claims')
        .select('player_id')
        .eq('coin_id', coin.id)
        .eq('season_id', activeSeason.id);
      if (chainClaims) {
        const uniqueHolders = new Set(chainClaims.map(c => c.player_id));
        chainCount = uniqueHolders.size;
      }
    }

    // --- Build scoring context ---
    const context: ClaimContext = {
      coin: coin as Coin,
      player: player as Player,
      mode,
      hasStory: !!storyText?.trim(),
      hasPhoto: !!photoUrl?.trim(),
      previousHolder: previousHolder as Player | null,
      isFirstDiscovery,
      isPlayerFirstClaim: (player.total_claims || 0) === 0,
      playerRankPercentile,
      previousHolderRank,
      totalActivePlayers: activePlayers.length,
      streakWeeks: player.streak_weeks || 0,
      claimsToday: claimsToday || 0,
      chainCount,
      isRevenge,
    };

    // --- Calculate score ---
    const score = calculateScore(context);
    const xpEarned = calculateXP(mode, context.hasStory, context.hasPhoto, isFirstDiscovery);

    // --- Insert claim ---
    const { error: claimErr } = await supabase.from('claims').insert({
      group_id: groupId,
      coin_id: coin.id,
      player_id: player.id,
      season_id: activeSeason?.id || null,
      mode,
      base_points: score.base_points,
      effect_points: score.effect_points,
      bonus_points: score.bonus_points,
      story_bonus: score.story_bonus,
      streak_multiplier: score.streak_multiplier,
      total_points: score.total_points,
      bonus_breakdown: score.bonus_breakdown,
      coin_effect: coin.current_effect,
      coin_rarity: coin.rarity,
      previous_holder_id: coin.current_holder_id,
      story_text: storyText?.trim() || null,
      photo_url: photoUrl?.trim() || null,
      user_agent: request.headers.get('user-agent') || null,
    });

    if (claimErr) {
      console.error('Claim insert error:', claimErr);
      return NextResponse.json({ ok: false, error: 'Failed to record claim' }, { status: 500 });
    }

    // --- Update coin ---
    const coinUpdate: Record<string, unknown> = {
      current_holder_id: player.id,
      last_claimed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // If coin was rusted, restore it
    if (coin.status === 'rusted') {
      coinUpdate.status = 'active';
      coinUpdate.rust_start = null;
    }
    // If shield effect, freeze for 48h
    if (coin.current_effect === 'shield') {
      coinUpdate.status = 'frozen';
      coinUpdate.status_expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    }

    await supabase.from('coins').update(coinUpdate).eq('id', coin.id);

    // --- Update player stats ---
    const newXP = (player.xp || 0) + xpEarned;
    const newTitle = titleFromXP(newXP);
    const newLevel = levelFromXP(newXP);

    // Holdings only change on earned claims (physical coin transfer).
    // Steals are digital-only — the physical coin stays with the other player.
    const holdingsChange = mode === 'earned' ? 1 : 0;

    await supabase.from('players').update({
      season_score: Math.max(0, (player.season_score || 0) + score.total_points),
      lifetime_score: Math.max(0, (player.lifetime_score || 0) + score.total_points),
      xp: newXP,
      level: newLevel,
      title: newTitle,
      current_holdings: (player.current_holdings || 0) + holdingsChange,
      total_claims: (player.total_claims || 0) + 1,
      total_steals: (player.total_steals || 0) + (mode === 'stolen' ? 1 : 0),
      last_active_at: new Date().toISOString(),
    }).eq('id', player.id);

    // --- Update previous holder's holdings count ---
    // Only decrease on earned claims (physical transfer). Steals don't move the physical coin.
    if (previousHolder && mode === 'earned') {
      await supabase.from('players').update({
        current_holdings: Math.max(0, (previousHolder.current_holdings || 0) - 1),
      }).eq('id', previousHolder.id);
    }

    // --- Thief effect: deduct 1 point from previous holder (stolen claims only) ---
    if (coin.current_effect === 'thief' && mode === 'stolen' && previousHolder) {
      await supabase.from('players').update({
        season_score: Math.max(0, (previousHolder.season_score || 0) - 1),
        lifetime_score: Math.max(0, (previousHolder.lifetime_score || 0) - 1),
      }).eq('id', previousHolder.id);
    }

    // --- Gift effect: give full points to the previous holder too ---
    if (coin.current_effect === 'gift' && mode === 'earned' && previousHolder) {
      await supabase.from('players').update({
        season_score: (previousHolder.season_score || 0) + score.total_points,
        lifetime_score: (previousHolder.lifetime_score || 0) + score.total_points,
      }).eq('id', previousHolder.id);
    }

    // --- Send theft notification email (30-min delay) ---
    if (mode === 'stolen' && previousHolder?.email && process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const sendAt = new Date(Date.now() + 30 * 60 * 1000);
        const stolenAt = new Date();
        const stolenAtStr = stolenAt.toLocaleTimeString('en-US', {
          hour: 'numeric', minute: '2-digit',
        });
        const revengeDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
        const deadlineStr = revengeDeadline.toLocaleDateString('en-US', {
          weekday: 'short', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit',
        });

        await resend.emails.send({
          from: 'Third Space Treasury <notifications@third-space-treasury.com>',
          to: previousHolder.email,
          subject: `🗡️ ${cleanName} Just Stole Your Coin`,
          scheduledAt: sendAt.toISOString(),
          html: `
            <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; background: #f5efe4; padding: 32px; border-radius: 12px; border: 1px solid #c9c2ae;">
              <div style="text-align: center; margin-bottom: 24px;">
                <img src="https://coingameplatform.vercel.app/logo.jpg" alt="Third Space Treasury" style="width: 64px; height: 64px; object-fit: contain;" />
                <h2 style="color: #1e3b2a; font-size: 18px; margin: 8px 0 4px;">Third Space Treasury</h2>
                <p style="color: #888; font-size: 12px; font-style: italic; margin: 0;">In Chaos We Compete. In Coin We Trust.</p>
              </div>

              <hr style="border: none; border-top: 1px solid #c9c2ae; margin: 0 0 24px;" />

              <p style="color: #1a1a1a; font-size: 16px; margin: 0 0 20px;">
                The Treasury regrets to inform you that at <strong>${stolenAtStr}</strong>, <strong>${cleanName}</strong> stole one of your coins.
              </p>

              <div style="background: #1e3b2a; color: #f7f3e6; border-radius: 10px; padding: 16px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 4px; font-size: 13px; opacity: 0.8;">Revenge window closes</p>
                <p style="margin: 0; font-size: 16px; font-weight: bold;">${deadlineStr}</p>
                <p style="margin: 4px 0 0; font-size: 12px; opacity: 0.7;">Steal one of their coins within 72 hours for +2 revenge bonus</p>
              </div>

              <div style="text-align: center;">
                <a href="https://coingameplatform.vercel.app"
                   style="display: inline-block; background: #1e3b2a; color: #f7f3e6; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: bold;">
                  Check the Leaderboard
                </a>
              </div>

              <p style="color: #aaa; font-size: 11px; text-align: center; margin: 24px 0 0;">
                You're receiving this because you have theft alerts enabled.<br/>
                Manage your preferences at <a href="https://coingameplatform.vercel.app" style="color: #aaa;">coingameplatform.vercel.app</a>
              </p>
            </div>
          `,
        });
      } catch (emailErr) {
        // Non-fatal — log but don't fail the claim
        console.error('Email send error:', emailErr);
      }
    }

    // --- Record discovery ---
    if (isFirstDiscovery) {
      await supabase.from('discoveries').insert({
        player_id: player.id,
        coin_id: coin.id,
      });
      await supabase.from('players').update({
        coins_discovered: (player.coins_discovered || 0) + 1,
      }).eq('id', player.id);
    }

    // --- Update streak ---
    const now = new Date();
    const currentWeek = getWeekString(now);
    const lastActive = player.streak_last_active;
    const lastWeek = lastActive ? getWeekString(new Date(lastActive)) : null;

    if (lastWeek !== currentWeek) {
      const prevWeekStr = getWeekString(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      const isConsecutive = lastWeek === prevWeekStr;
      await supabase.from('players').update({
        streak_weeks: isConsecutive ? (player.streak_weeks || 0) + 1 : 1,
        streak_last_active: now.toISOString().split('T')[0],
      }).eq('id', player.id);
    }

    // --- Get updated rank ---
    const { data: updatedPlayers } = await supabase
      .from('players')
      .select('id, season_score')
      .eq('group_id', groupId)
      .order('season_score', { ascending: false });

    const seasonRank = (updatedPlayers || []).findIndex(p => p.id === player.id) + 1;

    // --- Check for new badges ---
    const newBadges = await checkBadges(supabase, {
      playerId: player.id,
      groupId: groupId,
      totalClaims: (player.total_claims || 0) + 1,
      totalSteals: (player.total_steals || 0) + (mode === 'stolen' ? 1 : 0),
      coinsDiscovered: (player.coins_discovered || 0) + (isFirstDiscovery ? 1 : 0),
      wasSteal: mode === 'stolen',
      previousHolderRank,
      hadStory: !!storyText?.trim(),
      hadPhoto: !!photoUrl?.trim(),
    });

    // --- Return response ---
    return NextResponse.json({
      ok: true,
      score,
      playerName: cleanName,
      seasonRank,
      newBadges,
    });

  } catch (err) {
    console.error('Claim error:', err);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

// Helper: get ISO week string for streak tracking
function getWeekString(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

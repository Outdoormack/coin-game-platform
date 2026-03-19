// ============================================================
// Scoring Engine — NFC Coin Game Platform
// ============================================================

import { ClaimContext, ScoreBreakdown } from './types';

const RARITY_POINTS: Record<string, number> = {
  common: 1,
  uncommon: 2,
  rare: 3,
  legendary: 5,
};

const EFFECT_ICONS: Record<string, string> = {
  standard: '',
  thief: '🗡️',
  shield: '🛡️',
  wildcard: '🎲',
  cursed: '💀',
  chain: '🔗',
  magnet: '🧲',
  bounty_hunter: '🎯',
  mirror: '🪞',
  rust: '🔧',
};

const EFFECT_NAMES: Record<string, string> = {
  standard: 'Standard',
  thief: 'Thief',
  shield: 'Shield',
  wildcard: 'Wildcard',
  cursed: 'Cursed',
  chain: 'Chain Bonus',
  magnet: 'Magnet',
  bounty_hunter: 'Bounty Hunter',
  mirror: 'Mirror',
  rust: 'Rust Restorer',
};

export function calculateScore(ctx: ClaimContext): ScoreBreakdown {
  const messages: string[] = [];
  const bonusBreakdown: Record<string, number> = {};

  // --- Reclaim: coin was stolen from you — restore holdings, no points ---
  if (ctx.isReclaim) {
    messages.push('🔄 Reclaim — coin restored to your holdings.');
    messages.push('No points awarded. The Treasury keeps the balance.');
    return {
      base_points: 0, effect_points: 0, bonus_points: 0,
      story_bonus: 0, streak_multiplier: 1, total_points: 0,
      bonus_breakdown: {}, effect_name: 'Reclaim',
      rarity: ctx.coin.rarity, messages,
    };
  }

  // --- Base points from rarity ---
  let basePoints = RARITY_POINTS[ctx.coin.rarity] || 1;
  messages.push(`Base (${ctx.coin.rarity}): ${basePoints} pt${basePoints !== 1 ? 's' : ''}`);

  // --- Coin effect modifier ---
  let effectPoints = 0;
  const effect = ctx.coin.current_effect || 'standard';

  switch (effect) {
    case 'standard':
      // No modifier
      break;

    case 'thief':
      if (ctx.previousHolder) {
        effectPoints = 1;
        messages.push(`${EFFECT_ICONS.thief} Thief: +1 pt (stolen from ${ctx.previousHolder.display_name})`);
      }
      break;

    case 'shield':
      // Shield doesn't modify points — it prevents re-claiming for 48h
      // The shield logic is handled in the claim API
      messages.push(`${EFFECT_ICONS.shield} Shield: This coin is protected for 48 hours`);
      break;

    case 'wildcard':
      // Random 1-6, replaces base points
      const roll = Math.floor(Math.random() * 6) + 1;
      effectPoints = roll - basePoints; // Adjust so base + effect = roll
      messages.push(`${EFFECT_ICONS.wildcard} Wildcard roll: ${roll} pts (replaced base)`);
      break;

    case 'cursed':
      // Worth 0 to you. Next person gets 3x.
      effectPoints = -basePoints; // Zeroes out the base
      messages.push(`${EFFECT_ICONS.cursed} Cursed! 0 pts for you — but the next person gets 3×`);
      break;

    case 'chain':
      // +1 per unique claimant this season (stored on coin, passed via context)
      // For MVP, we'll calculate this from claim history
      // TODO: Pass chain count through context
      effectPoints = 1; // Placeholder — will be calculated from claim history
      messages.push(`${EFFECT_ICONS.chain} Chain Bonus: +1 pt (coin has been circulating)`);
      break;

    case 'magnet':
      // Next claim within 24h is doubled. No immediate point change.
      // The magnet effect is tracked and applied on the NEXT claim.
      // TODO: Track magnet status on player
      messages.push(`${EFFECT_ICONS.magnet} Magnet: Your next claim within 24h is worth double!`);
      break;

    case 'bounty_hunter':
      if (ctx.previousHolder && ctx.previousHolderRank <= 3) {
        effectPoints = 3;
        messages.push(`${EFFECT_ICONS.bounty_hunter} Bounty Hunter: +3 pts (previous holder was top 3!)`);
      } else {
        messages.push(`${EFFECT_ICONS.bounty_hunter} Bounty Hunter: No bonus (previous holder wasn't top 3)`);
      }
      break;

    case 'mirror':
      if (ctx.lastClaimRarity && ctx.lastClaimRarity !== ctx.coin.rarity) {
        const mirrorPoints = RARITY_POINTS[ctx.lastClaimRarity] || 1;
        effectPoints = mirrorPoints - basePoints;
        messages.push(`${EFFECT_ICONS.mirror} Mirror: Copied ${ctx.lastClaimRarity} rarity (${mirrorPoints} pts)`);
      } else {
        messages.push(`${EFFECT_ICONS.mirror} Mirror: No change (same rarity as last claim)`);
      }
      break;

    case 'rust':
      // Rust Restorer coins are immune to rusting — no special scoring effect needed.
      // The restore bonus for claiming ANY rusted coin is handled below.
      messages.push(`${EFFECT_ICONS.rust} Rust Restorer: This coin is immune to rusting`);
      break;

    default:
      break;
  }

  // --- Situation bonuses ---
  let bonusPoints = 0;

  // Rust restore: claiming any rusted coin gives +1 bonus
  if (ctx.coin.status === 'rusted') {
    bonusBreakdown.rust_restore = 1;
    bonusPoints += 1;
    messages.push('🔧 Restored! +1 pt for reviving a dormant coin');
  }

  // Kingslayer: steal from #1 player
  if (ctx.mode === 'stolen' && ctx.previousHolder && ctx.previousHolderRank === 1) {
    bonusBreakdown.kingslayer = 2;
    bonusPoints += 2;
    messages.push('👑 Kingslayer! +2 pts (stole from the leader)');
  }

  // Revenge: steal from someone who stole from you within 72h
  if (ctx.isRevenge && ctx.mode === 'stolen') {
    bonusBreakdown.revenge = 2;
    bonusPoints += 2;
    messages.push(`⚔️ Revenge! +2 pts (they stole from you first)`);
  }

  // Underdog: bottom 25% of players
  if (ctx.playerRankPercentile <= 25 && ctx.totalActivePlayers >= 4) {
    bonusBreakdown.underdog = 0; // Handled via multiplier, not flat bonus
    // Underdog is applied as a multiplier at the end
  }

  // First discovery
  if (ctx.isFirstDiscovery) {
    bonusBreakdown.discovery = 1;
    bonusPoints += 1;
    messages.push('🧭 New coin discovered! +1 pt');
  }

  // Hot streak: 3+ claims in one day
  if (ctx.claimsToday >= 2) { // This would be the 3rd claim
    const hotStreakBonus = 1;
    bonusBreakdown.hot_streak = hotStreakBonus;
    bonusPoints += hotStreakBonus;
    messages.push(`🔥 Hot streak! +${hotStreakBonus} pt (${ctx.claimsToday + 1} claims today)`);
  }

  // Fresh blood: player's very first claim ever
  if (ctx.isPlayerFirstClaim) {
    bonusBreakdown.fresh_blood = 3;
    bonusPoints += 3;
    messages.push('🎉 Welcome bonus! +3 pts for your first claim');
  }

  // --- Story & photo bonus ---
  let storyBonus = 0;
  if (ctx.hasStory) {
    storyBonus += 0.2;
    messages.push('📖 Story bonus: +0.2 pts');
  }
  if (ctx.hasPhoto) {
    storyBonus += 0.2;
    messages.push('📸 Photo bonus: +0.2 pts');
  }

  // --- Streak multiplier ---
  let streakMultiplier = 1.0;
  if (ctx.streakWeeks >= 9) {
    streakMultiplier = 1.25;
  } else if (ctx.streakWeeks >= 5) {
    streakMultiplier = 1.15;
  } else if (ctx.streakWeeks >= 3) {
    streakMultiplier = 1.1;
  }

  if (streakMultiplier > 1.0) {
    messages.push(`🔥 ${ctx.streakWeeks}-week streak! ×${streakMultiplier} multiplier`);
  }

  // --- Underdog multiplier (applied separately) ---
  let underdogMultiplier = 1.0;
  if (ctx.playerRankPercentile <= 25 && ctx.totalActivePlayers >= 4) {
    underdogMultiplier = 1.5;
    messages.push('💪 Underdog bonus! ×1.5 multiplier');
  }

  // --- Calculate total ---
  const subtotal = basePoints + effectPoints + bonusPoints + storyBonus;
  const withStreaks = subtotal * streakMultiplier * underdogMultiplier;
  const total = Math.max(0, Math.round(withStreaks * 100) / 100); // Floor at 0, round to 2 decimals

  // --- Hot coin doubler ---
  let finalTotal = total;
  if (ctx.coin.status === 'hot') {
    finalTotal = total * 2;
    messages.push('🔥 HOT COIN! Points doubled!');
  }

  messages.push(`─────────────────────`);
  messages.push(`Total: ${finalTotal} pts`);

  return {
    base_points: basePoints,
    effect_points: effectPoints,
    bonus_points: bonusPoints,
    story_bonus: storyBonus,
    streak_multiplier: streakMultiplier * underdogMultiplier,
    total_points: finalTotal,
    bonus_breakdown: bonusBreakdown,
    effect_name: EFFECT_NAMES[effect] || 'Standard',
    rarity: ctx.coin.rarity,
    messages,
  };
}

// ============================================================
// XP Calculation
// ============================================================

export function calculateXP(mode: 'earned' | 'stolen', hasStory: boolean, hasPhoto: boolean, isFirstDiscovery: boolean): number {
  let xp = mode === 'stolen' ? 15 : 10;
  if (hasStory) xp += 5;
  if (hasPhoto) xp += 5;
  if (isFirstDiscovery) xp += 20;
  return xp;
}

// ============================================================
// Title from XP
// ============================================================

const TITLE_THRESHOLDS: [number, string][] = [
  [2000, 'Mythic'],
  [1200, 'Legend'],
  [800, 'Mastermind'],
  [500, 'Shadow'],
  [300, 'Operative'],
  [150, 'Agent'],
  [50, 'Scout'],
  [0, 'Rookie'],
];

export function titleFromXP(xp: number): string {
  for (const [threshold, title] of TITLE_THRESHOLDS) {
    if (xp >= threshold) return title;
  }
  return 'Rookie';
}

// ============================================================
// Level from XP
// ============================================================

export function levelFromXP(xp: number): number {
  // Every 50 XP = 1 level
  return Math.floor(xp / 50) + 1;
}

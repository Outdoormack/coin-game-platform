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
  momentum: '⚡',
  volatile: '💣',
  gift: '🎁',
  rust: '🛡️',
};

const EFFECT_NAMES: Record<string, string> = {
  standard: 'Standard',
  thief: 'Thief',
  shield: 'Shield',
  wildcard: 'Wildcard',
  cursed: 'Cursed',
  chain: 'Chain',
  momentum: 'Momentum',
  volatile: 'Volatile',
  gift: 'Gift',
  rust: 'Rust-Proof',
};

export function calculateScore(ctx: ClaimContext): ScoreBreakdown {
  const messages: string[] = [];
  const bonusBreakdown: Record<string, number> = {};

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
      // On stolen claims: +1 to claimer, -1 from previous holder (deduction handled in claim API)
      // On earned claims: no thief effect — clean handoff
      if (ctx.mode === 'stolen' && ctx.previousHolder) {
        effectPoints = 1;
        messages.push(`${EFFECT_ICONS.thief} Thief: +1 pt — and ${ctx.previousHolder.display_name} loses 1 pt`);
      } else if (ctx.mode === 'earned') {
        messages.push(`${EFFECT_ICONS.thief} Thief: No sting on earned claims. The blade only cuts when stolen.`);
      }
      break;

    case 'shield':
      // Shield doesn't modify points — it prevents re-claiming for 48h
      // The shield logic is handled in the claim API
      messages.push(`${EFFECT_ICONS.shield} Shield: This coin is protected for 48 hours`);
      break;

    case 'wildcard': {
      // Random 1-6, replaces base points
      const roll = Math.floor(Math.random() * 6) + 1;
      effectPoints = roll - basePoints; // Adjust so base + effect = roll
      messages.push(`${EFFECT_ICONS.wildcard} Wildcard roll: ${roll} pts (replaced base)`);
      break;
    }

    case 'cursed':
      // Costs the claimer 2 points — a weapon to dump on rivals
      effectPoints = -(basePoints + 2); // Zeroes out base, then takes 2 more
      messages.push(`${EFFECT_ICONS.cursed} Cursed! −2 pts. Pass this coin to your enemies.`);
      break;

    case 'chain':
      // +1 per unique holder this season (passed via context)
      effectPoints = ctx.chainCount || 0;
      if (effectPoints > 0) {
        messages.push(`${EFFECT_ICONS.chain} Chain: +${effectPoints} pt${effectPoints !== 1 ? 's' : ''} (${effectPoints} unique holder${effectPoints !== 1 ? 's' : ''} this season)`);
      } else {
        messages.push(`${EFFECT_ICONS.chain} Chain: First holder this season — keep it moving!`);
      }
      break;

    case 'momentum':
      // Double points if this coin was claimed within the last 24h
      if (ctx.coin.last_claimed_at) {
        const hoursSinceLastClaim = (Date.now() - new Date(ctx.coin.last_claimed_at).getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastClaim <= 24) {
          // Double the base points via effect
          effectPoints = basePoints; // base + effect = 2× base
          messages.push(`${EFFECT_ICONS.momentum} Momentum! Double points — claimed within 24h of last claim`);
        } else {
          messages.push(`${EFFECT_ICONS.momentum} Momentum: No bonus (last claimed ${Math.floor(hoursSinceLastClaim)}h ago)`);
        }
      } else {
        messages.push(`${EFFECT_ICONS.momentum} Momentum: First claim — keep it moving for double next time!`);
      }
      break;

    case 'volatile':
      // Double points now, but -5 if held at season end (season end penalty handled separately)
      effectPoints = basePoints; // base + effect = 2× base
      messages.push(`${EFFECT_ICONS.volatile} Volatile! Double points — but −5 if you're holding this at season end`);
      break;

    case 'gift':
      // On earned claims, both giver and receiver get full points (giver credit handled in claim API)
      if (ctx.mode === 'earned' && ctx.previousHolder) {
        messages.push(`${EFFECT_ICONS.gift} Gift! Both you and ${ctx.previousHolder.display_name} earn full points`);
      } else if (ctx.mode === 'stolen') {
        messages.push(`${EFFECT_ICONS.gift} Gift: No gift bonus on stolen claims — gifts reward generosity`);
      } else {
        messages.push(`${EFFECT_ICONS.gift} Gift: Pass this coin to someone for a shared reward`);
      }
      break;

    case 'rust':
      // Rust-Proof coins are immune to rusting — no scoring effect
      messages.push(`${EFFECT_ICONS.rust} Rust-Proof: This coin is immune to rusting`);
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
  const total = Math.round(withStreaks * 100) / 100; // Allow negative (e.g. cursed coins)

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

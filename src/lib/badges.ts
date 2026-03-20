// ============================================================
// Badge Checking — runs after each claim
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';

interface BadgeDef {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  condition_type: string;
  condition_config: Record<string, unknown>;
}

interface EarnedBadge {
  slug: string;
  name: string;
  icon: string | null;
}

interface CheckContext {
  playerId: string;
  groupId: string;
  // Current player stats (after the claim has been applied)
  totalClaims: number;
  totalSteals: number;
  coinsDiscovered: number;
  // Claim-specific context
  wasSteal: boolean;
  previousHolderRank: number; // 1 = first place, 999 = not ranked
  hadStory: boolean;
  hadPhoto: boolean;
}

export async function checkBadges(
  supabase: SupabaseClient,
  ctx: CheckContext
): Promise<EarnedBadge[]> {
  // Get all badge definitions
  const { data: allBadges } = await supabase
    .from('badge_definitions')
    .select('id, slug, name, icon, condition_type, condition_config')
    .eq('condition_type', 'auto');

  if (!allBadges || allBadges.length === 0) return [];

  // Get badges the player already has
  const { data: existingBadges } = await supabase
    .from('player_badges')
    .select('badge_id')
    .eq('player_id', ctx.playerId);

  const earnedIds = new Set((existingBadges || []).map(b => b.badge_id));

  // Check each badge definition
  const newBadges: EarnedBadge[] = [];

  for (const badge of allBadges as BadgeDef[]) {
    // Skip if already earned
    if (earnedIds.has(badge.id)) continue;

    const config = badge.condition_config;
    let earned = false;

    switch (config.type) {
      case 'total_claims':
        earned = ctx.totalClaims >= (config.threshold as number);
        break;

      case 'total_steals':
        earned = ctx.totalSteals >= (config.threshold as number);
        break;

      case 'coins_discovered':
        earned = ctx.coinsDiscovered >= (config.threshold as number);
        break;

      case 'steal_from_rank':
        // Kingslayer: did this claim steal from the #1 player?
        earned = ctx.wasSteal && ctx.previousHolderRank === (config.rank as number);
        break;

      case 'total_stories': {
        // Count claims with story_text
        const { count } = await supabase
          .from('claims')
          .select('id', { count: 'exact', head: true })
          .eq('player_id', ctx.playerId)
          .not('story_text', 'is', null);
        earned = (count || 0) >= (config.threshold as number);
        break;
      }

      case 'total_photos': {
        // Count claims with photo_url
        const { count } = await supabase
          .from('claims')
          .select('id', { count: 'exact', head: true })
          .eq('player_id', ctx.playerId)
          .not('photo_url', 'is', null);
        earned = (count || 0) >= (config.threshold as number);
        break;
      }

      default:
        break;
    }

    if (earned) {
      // Award the badge
      await supabase.from('player_badges').insert({
        player_id: ctx.playerId,
        badge_id: badge.id,
      });

      newBadges.push({
        slug: badge.slug,
        name: badge.name,
        icon: badge.icon,
      });
    }
  }

  return newBadges;
}

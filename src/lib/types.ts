// ============================================================
// Database Types — NFC Coin Game Platform
// ============================================================

export interface Group {
  id: string;
  name: string;
  slug: string;
  owner_id: string | null;
  plan: string;
  max_coins: number;
  max_players: number;
  hoarding_limit: number;
  created_at: string;
}

export interface Coin {
  id: string;
  group_id: string;
  external_id: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  base_points: number;
  active: boolean;
  current_effect: CoinEffect;
  status: 'active' | 'hot' | 'frozen' | 'rusted' | 'bounty';
  status_expires: string | null;
  rust_start: string | null;
  current_holder_id: string | null;
  last_claimed_at: string | null;
  heading: string | null;
  message: string | null;
  created_at: string;
  // Joined fields
  current_holder?: Player;
}

export type CoinEffect =
  | 'standard'
  | 'thief'
  | 'shield'
  | 'wildcard'
  | 'cursed'
  | 'chain'
  | 'magnet'
  | 'bounty_hunter'
  | 'mirror'
  | 'rust';

export interface Player {
  id: string;
  group_id: string;
  auth_user_id: string | null;
  display_name: string;
  email: string | null;
  xp: number;
  level: number;
  title: string;
  season_score: number;
  lifetime_score: number;
  current_holdings: number;
  total_claims: number;
  total_steals: number;
  streak_weeks: number;
  coins_discovered: number;
  joined_at: string;
  last_active_at: string | null;
}

export interface Claim {
  id: string;
  group_id: string;
  coin_id: string;
  player_id: string;
  season_id: string | null;
  mode: 'earned' | 'stolen';
  base_points: number;
  effect_points: number;
  bonus_points: number;
  story_bonus: number;
  streak_multiplier: number;
  total_points: number;
  bonus_breakdown: Record<string, number>;
  coin_effect: string | null;
  coin_rarity: string | null;
  previous_holder_id: string | null;
  story_text: string | null;
  photo_url: string | null;
  claimed_at: string;
  // Joined fields
  player?: Player;
  previous_holder?: Player;
  coin?: Coin;
}

export interface Season {
  id: string;
  group_id: string;
  name: string;
  theme: string;
  status: 'upcoming' | 'active' | 'completed';
  starts_at: string;
  ends_at: string;
  champion_id: string | null;
}

export interface BadgeDefinition {
  id: string;
  group_id: string | null;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  category: string;
  condition_type: string;
  condition_config: Record<string, unknown>;
  xp_reward: number;
  seasonal: boolean;
}

export interface PlayerBadge {
  id: string;
  player_id: string;
  badge_id: string;
  season_id: string | null;
  earned_at: string;
  badge?: BadgeDefinition;
}

// ============================================================
// Scoring Types
// ============================================================

export interface ScoreBreakdown {
  base_points: number;
  effect_points: number;
  bonus_points: number;
  story_bonus: number;
  streak_multiplier: number;
  total_points: number;
  bonus_breakdown: Record<string, number>;
  effect_name: string;
  rarity: string;
  messages: string[]; // Human-readable messages for the reveal screen
}

export interface ClaimContext {
  coin: Coin;
  player: Player;
  mode: 'earned' | 'stolen';
  hasStory: boolean;
  hasPhoto: boolean;
  previousHolder: Player | null;
  isFirstDiscovery: boolean;
  isPlayerFirstClaim: boolean;
  // Leaderboard context
  playerRankPercentile: number; // 0-100, where 0 = last place
  previousHolderRank: number;  // 1 = first place
  totalActivePlayers: number;
  // Streak
  streakWeeks: number;
  // Day context
  claimsToday: number;
  // Last claim context (for mirror effect)
  lastClaimRarity: string | null;
  // Revenge: claimer is stealing from someone who stole from them within 72h
  isRevenge: boolean;
}

// ============================================================
// API Types
// ============================================================

export interface ClaimRequest {
  coinExternalId: string;
  playerName: string;
  mode: 'earned' | 'stolen';
  storyText?: string;
  photoUrl?: string;
}

export interface ClaimResponse {
  ok: boolean;
  error?: string;
  message?: string;
  score?: ScoreBreakdown;
  newBadges?: BadgeDefinition[];
  playerName?: string;
  seasonRank?: number;
}

export interface LeaderboardEntry {
  rank: number;
  display_name: string;
  title: string;
  season_score: number;
  lifetime_score: number;
  current_holdings: number;
  streak_weeks: number;
  xp: number;
  level: number;
  badges: PlayerBadge[];
}

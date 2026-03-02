-- ============================================================
-- NFC Coin Game Platform — Initial Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. GROUPS (tenants)
CREATE TABLE groups (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  owner_id        UUID, -- will reference auth.users later
  plan            TEXT NOT NULL DEFAULT 'starter',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  max_coins       INT NOT NULL DEFAULT 100,
  max_players     INT NOT NULL DEFAULT 50,
  hoarding_limit  INT NOT NULL DEFAULT 5,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. GROUP_SETTINGS
CREATE TABLE group_settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  key             TEXT NOT NULL,
  value           TEXT NOT NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, key)
);

-- 3. SEASONS
CREATE TABLE seasons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  theme           TEXT DEFAULT 'standard',
  theme_config    JSONB DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'upcoming',
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  champion_id     UUID, -- filled on completion, FK added after players table
  results         JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_seasons_group ON seasons(group_id);
CREATE INDEX idx_seasons_active ON seasons(group_id, status);

-- 4. PLAYERS
CREATE TABLE players (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  auth_user_id    UUID, -- nullable for MVP (name-based entry)
  display_name    TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  xp              INT NOT NULL DEFAULT 0,
  level           INT NOT NULL DEFAULT 1,
  title           TEXT NOT NULL DEFAULT 'Rookie',
  season_score    NUMERIC(10,2) NOT NULL DEFAULT 0,
  lifetime_score  NUMERIC(10,2) NOT NULL DEFAULT 0,
  current_holdings INT NOT NULL DEFAULT 0,
  total_claims    INT NOT NULL DEFAULT 0,
  total_steals    INT NOT NULL DEFAULT 0,
  streak_weeks    INT NOT NULL DEFAULT 0,
  streak_last_active DATE,
  coins_discovered INT NOT NULL DEFAULT 0,
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at  TIMESTAMPTZ,
  UNIQUE(group_id, display_name)
);
CREATE INDEX idx_players_group ON players(group_id);
CREATE INDEX idx_players_season ON players(group_id, season_score DESC);
CREATE INDEX idx_players_lifetime ON players(group_id, lifetime_score DESC);

-- Add season champion FK now that players exists
ALTER TABLE seasons ADD CONSTRAINT fk_seasons_champion FOREIGN KEY (champion_id) REFERENCES players(id);

-- 5. COINS
CREATE TABLE coins (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  external_id     TEXT NOT NULL,
  rarity          TEXT NOT NULL DEFAULT 'common',
  base_points     INT NOT NULL DEFAULT 1,
  active          BOOLEAN NOT NULL DEFAULT true,
  current_effect  TEXT DEFAULT 'standard',
  status          TEXT NOT NULL DEFAULT 'active',
  status_expires  TIMESTAMPTZ,
  rust_start      TIMESTAMPTZ,
  current_holder_id UUID REFERENCES players(id),
  last_claimed_at TIMESTAMPTZ,
  heading         TEXT,
  message         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, external_id)
);
CREATE INDEX idx_coins_group ON coins(group_id);
CREATE INDEX idx_coins_holder ON coins(current_holder_id);
CREATE INDEX idx_coins_status ON coins(group_id, status);

-- 6. CLAIMS
CREATE TABLE claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  coin_id         UUID NOT NULL REFERENCES coins(id),
  player_id       UUID NOT NULL REFERENCES players(id),
  season_id       UUID REFERENCES seasons(id),
  mode            TEXT NOT NULL,
  base_points     NUMERIC(10,2) NOT NULL DEFAULT 0,
  effect_points   NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus_points    NUMERIC(10,2) NOT NULL DEFAULT 0,
  story_bonus     NUMERIC(10,2) NOT NULL DEFAULT 0,
  streak_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  total_points    NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonus_breakdown JSONB DEFAULT '{}',
  coin_effect     TEXT,
  coin_rarity     TEXT,
  previous_holder_id UUID REFERENCES players(id),
  story_text      TEXT,
  photo_url       TEXT,
  user_agent      TEXT,
  claimed_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_claims_group ON claims(group_id);
CREATE INDEX idx_claims_coin ON claims(coin_id);
CREATE INDEX idx_claims_player ON claims(player_id);
CREATE INDEX idx_claims_season ON claims(season_id);
CREATE INDEX idx_claims_time ON claims(group_id, claimed_at DESC);

-- 7. BADGE_DEFINITIONS
CREATE TABLE badge_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES groups(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  icon            TEXT,
  category        TEXT NOT NULL DEFAULT 'general',
  condition_type  TEXT NOT NULL DEFAULT 'auto',
  condition_config JSONB DEFAULT '{}',
  xp_reward       INT NOT NULL DEFAULT 10,
  seasonal        BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. PLAYER_BADGES
CREATE TABLE player_badges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  badge_id        UUID NOT NULL REFERENCES badge_definitions(id),
  season_id       UUID REFERENCES seasons(id),
  earned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  claim_id        UUID REFERENCES claims(id)
);
CREATE INDEX idx_player_badges_player ON player_badges(player_id);

-- 9. DISCOVERIES
CREATE TABLE discoveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  coin_id         UUID NOT NULL REFERENCES coins(id),
  discovered_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, coin_id)
);
CREATE INDEX idx_discoveries_player ON discoveries(player_id);

-- 10. RIVALRIES
CREATE TABLE rivalries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  player_a_id     UUID NOT NULL REFERENCES players(id),
  player_b_id     UUID NOT NULL REFERENCES players(id),
  a_steals_from_b INT NOT NULL DEFAULT 0,
  b_steals_from_a INT NOT NULL DEFAULT 0,
  total_interactions INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  activated_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, player_a_id, player_b_id),
  CHECK (player_a_id < player_b_id)
);
CREATE INDEX idx_rivalries_group ON rivalries(group_id);

-- 11. EVENTS
CREATE TABLE events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  config          JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'scheduled',
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  created_by      UUID REFERENCES players(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_events_group ON events(group_id, status);

-- 12. NOTIFICATIONS
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  data            JSONB DEFAULT '{}',
  read            BOOLEAN NOT NULL DEFAULT false,
  delivered       BOOLEAN NOT NULL DEFAULT false,
  delivery_method TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_player ON notifications(player_id, read, created_at DESC);

-- 13. NOTIFICATION_PREFERENCES
CREATE TABLE notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  coin_stolen     BOOLEAN NOT NULL DEFAULT true,
  bounty_placed   BOOLEAN NOT NULL DEFAULT true,
  season_ending   BOOLEAN NOT NULL DEFAULT true,
  event_started   BOOLEAN NOT NULL DEFAULT true,
  badge_earned    BOOLEAN NOT NULL DEFAULT true,
  streak_warning  BOOLEAN NOT NULL DEFAULT true,
  weekly_recap    BOOLEAN NOT NULL DEFAULT true,
  revenge_available BOOLEAN NOT NULL DEFAULT true,
  preferred_method TEXT NOT NULL DEFAULT 'web_push',
  UNIQUE(player_id)
);

-- 14. EFFECT_ROTATIONS
CREATE TABLE effect_rotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  rotated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_assignments JSONB NOT NULL,
  new_assignments JSONB NOT NULL
);
CREATE INDEX idx_rotations_group ON effect_rotations(group_id);

-- ============================================================
-- SEED: Insert default badge definitions (global, no group_id)
-- ============================================================
INSERT INTO badge_definitions (slug, name, description, icon, category, condition_type, condition_config) VALUES
  ('first_tap',    'First Tap',     'Scan your first coin',                   '🟢', 'claiming',   'auto', '{"type": "total_claims", "threshold": 1}'),
  ('double_digits','Double Digits',  '10 total claims',                       '🔟', 'claiming',   'auto', '{"type": "total_claims", "threshold": 10}'),
  ('centurion',    'Centurion',      '100 total claims',                      '💯', 'claiming',   'auto', '{"type": "total_claims", "threshold": 100}'),
  ('pickpocket',   'Pickpocket',     'Your first steal',                      '🤏', 'stealing',   'auto', '{"type": "total_steals", "threshold": 1}'),
  ('cat_burglar',  'Cat Burglar',    '10 steals',                             '🐈‍⬛', 'stealing',   'auto', '{"type": "total_steals", "threshold": 10}'),
  ('master_thief', 'Master Thief',   '25 steals',                             '🦹', 'stealing',   'auto', '{"type": "total_steals", "threshold": 25}'),
  ('kingslayer',   'Kingslayer',     'Steal from the #1 player',              '👑', 'social',     'auto', '{"type": "steal_from_rank", "rank": 1}'),
  ('storyteller',  'Storyteller',    'Submit 10 stories with claims',         '📖', 'social',     'auto', '{"type": "total_stories", "threshold": 10}'),
  ('photographer', 'Photographer',   'Submit 10 photos with claims',          '📸', 'social',     'auto', '{"type": "total_photos", "threshold": 10}'),
  ('explorer',     'Explorer',       'Discover 25 unique coins',              '🧭', 'collection', 'auto', '{"type": "coins_discovered", "threshold": 25}');

-- ============================================================
-- SEED: Default group for Third Space Treasury (David's game)
-- ============================================================
INSERT INTO groups (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Third Space Treasury', 'third-space-treasury');

-- Insert default settings for the group
INSERT INTO group_settings (group_id, key, value) VALUES
  ('00000000-0000-0000-0000-000000000001', 'rarity_enabled', 'true'),
  ('00000000-0000-0000-0000-000000000001', 'effects_enabled', 'true'),
  ('00000000-0000-0000-0000-000000000001', 'effect_rotation', 'none'),
  ('00000000-0000-0000-0000-000000000001', 'bounties_enabled', 'true'),
  ('00000000-0000-0000-0000-000000000001', 'bounty_threshold', '5'),
  ('00000000-0000-0000-0000-000000000001', 'rivalries_enabled', 'true'),
  ('00000000-0000-0000-0000-000000000001', 'revenge_enabled', 'true'),
  ('00000000-0000-0000-0000-000000000001', 'revenge_window_hours', '72'),
  ('00000000-0000-0000-0000-000000000001', 'streaks_enabled', 'true'),
  ('00000000-0000-0000-0000-000000000001', 'rust_enabled', 'true'),
  ('00000000-0000-0000-0000-000000000001', 'rust_days', '14'),
  ('00000000-0000-0000-0000-000000000001', 'underdog_enabled', 'true'),
  ('00000000-0000-0000-0000-000000000001', 'story_bonus', '0.2'),
  ('00000000-0000-0000-0000-000000000001', 'photo_bonus', '0.2'),
  ('00000000-0000-0000-0000-000000000001', 'difficulty_preset', 'standard');

-- Create Season 1
INSERT INTO seasons (group_id, name, status, starts_at, ends_at) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Season 1', 'active', now(), now() + interval '1 month');

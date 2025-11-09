-- =====================================================================
-- PHASE 4: IMMERSIVE EXPERIENCE SYSTEMS
-- =====================================================================
-- Features: Advanced AI NPCs, Voice, Achievements, Housing, PvP, Environment
-- =====================================================================

-- =====================================================================
-- 1. ADVANCED AI NPC SYSTEM
-- =====================================================================

CREATE TABLE IF NOT EXISTS npc_characters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npc_name TEXT NOT NULL UNIQUE,
  npc_type TEXT NOT NULL, -- 'merchant', 'quest_giver', 'trainer', 'companion', 'enemy'
  
  -- Personality
  personality_traits JSONB NOT NULL, -- {friendliness: 8, humor: 6, aggression: 2, wisdom: 9}
  background_story TEXT,
  occupation TEXT,
  faction TEXT,
  
  -- Dialogue
  greeting_messages TEXT[],
  farewell_messages TEXT[],
  idle_dialogues TEXT[],
  
  -- AI Behavior
  behavior_pattern TEXT DEFAULT 'friendly', -- 'friendly', 'neutral', 'hostile', 'mysterious'
  interaction_cooldown INTEGER DEFAULT 5, -- seconds between interactions
  
  -- Appearance
  model_url TEXT,
  voice_profile TEXT, -- For TTS
  animation_set TEXT,
  
  -- Location
  spawn_locations JSONB, -- [{lobby: 'main', x: 0, y: 0, z: 0}]
  roam_radius INTEGER DEFAULT 10,
  
  -- Stats
  npc_level INTEGER DEFAULT 1,
  max_hp INTEGER DEFAULT 100,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS npc_dialogue_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npc_id UUID NOT NULL REFERENCES npc_characters(id) ON DELETE CASCADE,
  
  trigger_condition TEXT, -- 'greeting', 'quest_available', 'relationship_high', etc.
  player_option TEXT NOT NULL,
  npc_response TEXT NOT NULL,
  
  -- Requirements
  required_relationship INTEGER DEFAULT 0,
  required_quest_id TEXT,
  required_item_id TEXT,
  
  -- Consequences
  relationship_change INTEGER DEFAULT 0,
  triggers_quest_id TEXT,
  gives_item_id TEXT,
  
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS npc_quests_generated (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  npc_id UUID NOT NULL REFERENCES npc_characters(id) ON DELETE CASCADE,
  
  quest_title TEXT NOT NULL,
  quest_description TEXT NOT NULL,
  quest_type TEXT NOT NULL, -- 'fetch', 'kill', 'escort', 'explore', 'craft'
  
  -- Objectives
  objectives JSONB NOT NULL,
  
  -- Rewards
  experience_reward INTEGER DEFAULT 0,
  gold_reward INTEGER DEFAULT 0,
  item_rewards JSONB,
  reputation_reward INTEGER DEFAULT 0,
  
  -- Conditions
  min_player_level INTEGER DEFAULT 1,
  max_accepts INTEGER, -- How many players can accept
  current_accepts INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 2. ENHANCED VOICE FEATURES
-- =====================================================================

CREATE TABLE IF NOT EXISTS voice_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_name TEXT NOT NULL,
  channel_type TEXT NOT NULL, -- 'global', 'party', 'guild', 'proximity', 'private'
  
  -- Settings
  max_participants INTEGER DEFAULT 50,
  current_participants INTEGER DEFAULT 0,
  is_proximity_based BOOLEAN DEFAULT FALSE,
  proximity_radius INTEGER, -- meters
  
  -- Permissions
  is_public BOOLEAN DEFAULT TRUE,
  password_hash TEXT,
  allowed_profiles UUID[],
  banned_profiles UUID[],
  
  -- Owner
  created_by UUID REFERENCES profiles(id),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES voice_channels(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- State
  is_muted BOOLEAN DEFAULT FALSE,
  is_deafened BOOLEAN DEFAULT FALSE,
  is_speaking BOOLEAN DEFAULT FALSE,
  
  -- Position (for proximity chat)
  position_x DECIMAL(10,2),
  position_y DECIMAL(10,2),
  position_z DECIMAL(10,2),
  
  -- Quality
  audio_quality TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_spoke TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(channel_id, profile_id)
);

CREATE TABLE IF NOT EXISTS voice_commands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  command_phrase TEXT NOT NULL UNIQUE,
  command_action TEXT NOT NULL, -- 'open_inventory', 'use_ability', 'emote', etc.
  command_parameters JSONB,
  
  -- Requirements
  required_level INTEGER DEFAULT 1,
  
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 3. ACHIEVEMENT & PROGRESSION SYSTEM
-- =====================================================================

CREATE TABLE IF NOT EXISTS achievements_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achievement_id TEXT NOT NULL UNIQUE,
  achievement_name TEXT NOT NULL,
  achievement_description TEXT NOT NULL,
  
  -- Category
  category TEXT NOT NULL, -- 'combat', 'exploration', 'social', 'crafting', 'collection'
  
  -- Requirements
  requirement_type TEXT NOT NULL, -- 'count', 'comparison', 'collection', 'sequence'
  requirement_data JSONB NOT NULL, -- {stat: 'enemies_killed', target: 100}
  
  -- Rewards
  points INTEGER DEFAULT 10,
  title_reward TEXT,
  item_reward TEXT,
  gold_reward INTEGER DEFAULT 0,
  
  -- Rarity
  rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary', 'mythic'
  
  -- Display
  icon TEXT,
  hidden BOOLEAN DEFAULT FALSE, -- Secret achievements
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  
  unlocked_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(profile_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_date DATE NOT NULL,
  
  challenge_title TEXT NOT NULL,
  challenge_description TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  
  -- Objective
  objective_data JSONB NOT NULL,
  
  -- Rewards
  experience_reward INTEGER DEFAULT 100,
  gold_reward INTEGER DEFAULT 50,
  bonus_rewards JSONB,
  
  -- Difficulty
  difficulty TEXT DEFAULT 'normal', -- 'easy', 'normal', 'hard', 'extreme'
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  UNIQUE(challenge_date, challenge_type)
);

CREATE TABLE IF NOT EXISTS player_daily_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
  
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  claimed BOOLEAN DEFAULT FALSE,
  
  completed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(profile_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS global_leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  leaderboard_type TEXT NOT NULL, -- 'level', 'pvp_rating', 'guild_level', 'wealth', 'achievements'
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  score BIGINT NOT NULL,
  rank INTEGER,
  
  -- Metadata
  additional_data JSONB,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(leaderboard_type, profile_id)
);

-- =====================================================================
-- 4. PLAYER HOUSING SYSTEM
-- =====================================================================

CREATE TABLE IF NOT EXISTS player_houses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  house_name TEXT DEFAULT 'My House',
  house_type TEXT NOT NULL, -- 'cottage', 'mansion', 'castle', 'apartment', 'island'
  house_tier INTEGER DEFAULT 1,
  
  -- Location
  district TEXT,
  plot_number INTEGER,
  
  -- Settings
  is_public BOOLEAN DEFAULT FALSE,
  allow_visitors BOOLEAN DEFAULT TRUE,
  visitor_permissions JSONB DEFAULT '{"can_interact": false, "can_trade": false}',
  
  -- Stats
  capacity INTEGER DEFAULT 50, -- Max furniture items
  current_items INTEGER DEFAULT 0,
  decoration_score INTEGER DEFAULT 0,
  
  -- Customization
  theme TEXT DEFAULT 'default',
  exterior_color TEXT,
  interior_style TEXT,
  
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_visited TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(profile_id)
);

CREATE TABLE IF NOT EXISTS furniture_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  furniture_id TEXT NOT NULL UNIQUE,
  furniture_name TEXT NOT NULL,
  furniture_type TEXT NOT NULL, -- 'chair', 'table', 'bed', 'decoration', 'storage', 'functional'
  
  -- Properties
  size_category TEXT DEFAULT 'small', -- 'small', 'medium', 'large'
  is_interactive BOOLEAN DEFAULT FALSE,
  interaction_type TEXT, -- 'sit', 'sleep', 'storage', 'craft'
  
  -- Requirements
  required_level INTEGER DEFAULT 1,
  required_gold INTEGER DEFAULT 100,
  required_materials JSONB,
  
  -- Display
  model_url TEXT,
  thumbnail_url TEXT,
  color_variants TEXT[],
  
  -- Stats
  decoration_points INTEGER DEFAULT 1,
  rarity TEXT DEFAULT 'common',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS placed_furniture (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES player_houses(id) ON DELETE CASCADE,
  furniture_id TEXT NOT NULL,
  
  -- Position
  position_x DECIMAL(10,2) NOT NULL,
  position_y DECIMAL(10,2) NOT NULL,
  position_z DECIMAL(10,2) NOT NULL,
  
  -- Rotation
  rotation_x DECIMAL(10,2) DEFAULT 0,
  rotation_y DECIMAL(10,2) DEFAULT 0,
  rotation_z DECIMAL(10,2) DEFAULT 0,
  
  -- Scale
  scale_x DECIMAL(5,2) DEFAULT 1.0,
  scale_y DECIMAL(5,2) DEFAULT 1.0,
  scale_z DECIMAL(5,2) DEFAULT 1.0,
  
  -- Customization
  color_variant TEXT,
  custom_name TEXT,
  
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS house_visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  house_id UUID NOT NULL REFERENCES player_houses(id) ON DELETE CASCADE,
  visitor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  visit_count INTEGER DEFAULT 1,
  last_visit TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_time_spent INTEGER DEFAULT 0, -- seconds
  
  -- Interaction
  left_comment TEXT,
  rating INTEGER, -- 1-5 stars
  
  UNIQUE(house_id, visitor_id)
);

-- =====================================================================
-- 5. PVP ARENA & TOURNAMENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS pvp_arenas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arena_name TEXT NOT NULL UNIQUE,
  arena_type TEXT NOT NULL, -- '1v1', '2v2', '3v3', '5v5', 'free_for_all'
  
  -- Settings
  max_players INTEGER NOT NULL,
  min_players INTEGER NOT NULL,
  map_name TEXT,
  
  -- Rules
  rules JSONB, -- {friendly_fire: false, time_limit: 600, respawn: true}
  
  -- Rewards
  winner_rewards JSONB,
  participation_rewards JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pvp_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arena_id UUID NOT NULL REFERENCES pvp_arenas(id),
  
  match_type TEXT NOT NULL, -- 'ranked', 'casual', 'tournament'
  
  -- Participants
  team_a_profiles UUID[],
  team_b_profiles UUID[],
  
  -- Results
  winner_team TEXT, -- 'team_a', 'team_b', 'draw'
  team_a_score INTEGER DEFAULT 0,
  team_b_score INTEGER DEFAULT 0,
  
  -- Stats
  match_stats JSONB, -- {kills: {}, deaths: {}, damage: {}}
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Rewards Distributed
  rewards_claimed BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS pvp_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  rating INTEGER DEFAULT 1000, -- ELO rating
  peak_rating INTEGER DEFAULT 1000,
  
  -- Stats
  total_matches INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  
  -- Streaks
  current_win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  
  -- Season
  season_id TEXT,
  rank_tier TEXT DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(profile_id, season_id)
);

CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tournament_name TEXT NOT NULL,
  tournament_type TEXT NOT NULL, -- 'single_elimination', 'double_elimination', 'round_robin'
  
  -- Settings
  max_participants INTEGER NOT NULL,
  entry_fee INTEGER DEFAULT 0,
  
  -- Prize Pool
  prize_pool_gold INTEGER DEFAULT 0,
  prize_pool_items JSONB,
  prize_distribution JSONB, -- {1st: 50%, 2nd: 30%, 3rd: 20%}
  
  -- Schedule
  registration_start TIMESTAMP WITH TIME ZONE,
  registration_end TIMESTAMP WITH TIME ZONE,
  tournament_start TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'registration', -- 'registration', 'in_progress', 'completed', 'cancelled'
  current_round INTEGER DEFAULT 0,
  
  -- Participants
  registered_profiles UUID[],
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- 6. DYNAMIC WORLD ENVIRONMENT
-- =====================================================================

CREATE TABLE IF NOT EXISTS weather_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weather_type TEXT NOT NULL, -- 'sunny', 'cloudy', 'rainy', 'stormy', 'snowy', 'foggy'
  
  -- Effects
  visibility_modifier DECIMAL(5,2) DEFAULT 1.0,
  movement_speed_modifier DECIMAL(5,2) DEFAULT 1.0,
  combat_modifiers JSONB, -- {fire_damage: -20%, lightning_damage: +30%}
  
  -- Visuals
  particle_effects TEXT[],
  sky_color TEXT,
  ambient_sounds TEXT[],
  
  -- Rarity
  occurrence_weight INTEGER DEFAULT 10, -- Higher = more common
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS active_weather (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_code TEXT NOT NULL,
  
  current_weather TEXT NOT NULL,
  weather_intensity INTEGER DEFAULT 50, -- 0-100
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Transition
  transitioning_to TEXT,
  transition_progress INTEGER DEFAULT 0,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(lobby_code)
);

CREATE TABLE IF NOT EXISTS time_of_day_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_code TEXT NOT NULL,
  
  -- Time
  time_minutes INTEGER DEFAULT 720, -- Minutes since midnight (12:00 = 720)
  time_speed DECIMAL(5,2) DEFAULT 1.0, -- 1.0 = real-time, 24.0 = 1 real minute = 1 game hour
  
  -- Lighting
  ambient_light_color TEXT,
  directional_light_intensity DECIMAL(5,2) DEFAULT 1.0,
  shadow_strength DECIMAL(5,2) DEFAULT 0.8,
  
  -- Sky
  sky_gradient JSONB, -- {dawn: [], day: [], dusk: [], night: []}
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(lobby_code)
);

CREATE TABLE IF NOT EXISTS seasonal_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name TEXT NOT NULL,
  season TEXT NOT NULL, -- 'spring', 'summer', 'fall', 'winter', 'special'
  
  -- Schedule
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Changes
  world_decorations JSONB, -- Special decorations to spawn
  special_npcs TEXT[], -- Event-specific NPCs
  exclusive_items TEXT[], -- Limited-time items
  event_quests TEXT[], -- Special quests
  
  -- Rewards
  participation_rewards JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dynamic_lighting_zones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zone_name TEXT NOT NULL,
  lobby_code TEXT NOT NULL,
  
  -- Area
  center_x DECIMAL(10,2) NOT NULL,
  center_y DECIMAL(10,2) NOT NULL,
  center_z DECIMAL(10,2) NOT NULL,
  radius DECIMAL(10,2) DEFAULT 10.0,
  
  -- Lighting
  light_type TEXT NOT NULL, -- 'point', 'spot', 'directional', 'ambient'
  light_color TEXT,
  light_intensity DECIMAL(5,2) DEFAULT 1.0,
  
  -- Behavior
  is_dynamic BOOLEAN DEFAULT FALSE,
  flicker_enabled BOOLEAN DEFAULT FALSE,
  pulse_enabled BOOLEAN DEFAULT FALSE,
  
  -- Effects
  cast_shadows BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_npc_characters_type ON npc_characters(npc_type);
CREATE INDEX IF NOT EXISTS idx_npc_dialogue_npc ON npc_dialogue_options(npc_id);
CREATE INDEX IF NOT EXISTS idx_npc_quests_npc ON npc_quests_generated(npc_id);

CREATE INDEX IF NOT EXISTS idx_voice_participants_channel ON voice_participants(channel_id);
CREATE INDEX IF NOT EXISTS idx_voice_participants_profile ON voice_participants(profile_id);

CREATE INDEX IF NOT EXISTS idx_player_achievements_profile ON player_achievements(profile_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_profile ON player_daily_progress(profile_id);
CREATE INDEX IF NOT EXISTS idx_leaderboards_type_score ON global_leaderboards(leaderboard_type, score DESC);

CREATE INDEX IF NOT EXISTS idx_player_houses_profile ON player_houses(profile_id);
CREATE INDEX IF NOT EXISTS idx_placed_furniture_house ON placed_furniture(house_id);
CREATE INDEX IF NOT EXISTS idx_house_visitors_house ON house_visitors(house_id);

CREATE INDEX IF NOT EXISTS idx_pvp_matches_arena ON pvp_matches(arena_id);
CREATE INDEX IF NOT EXISTS idx_pvp_ratings_profile ON pvp_ratings(profile_id);
CREATE INDEX IF NOT EXISTS idx_pvp_ratings_rating ON pvp_ratings(rating DESC);

CREATE INDEX IF NOT EXISTS idx_active_weather_lobby ON active_weather(lobby_code);
CREATE INDEX IF NOT EXISTS idx_time_settings_lobby ON time_of_day_settings(lobby_code);
CREATE INDEX IF NOT EXISTS idx_seasonal_events_dates ON seasonal_events(start_date, end_date);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- NPC Characters (public read)
ALTER TABLE npc_characters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view NPCs" ON npc_characters FOR SELECT USING (true);

ALTER TABLE npc_dialogue_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view NPC dialogues" ON npc_dialogue_options FOR SELECT USING (true);

ALTER TABLE npc_quests_generated ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view NPC quests" ON npc_quests_generated FOR SELECT USING (true);

-- Voice Channels
ALTER TABLE voice_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public voice channels" ON voice_channels FOR SELECT USING (is_public = true);
CREATE POLICY "Creators can manage their channels" ON voice_channels FOR ALL USING (auth.uid() = created_by);

ALTER TABLE voice_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view channel participants" ON voice_participants FOR SELECT USING (true);
CREATE POLICY "Users can manage own participation" ON voice_participants FOR ALL USING (auth.uid() = profile_id);

-- Achievements
ALTER TABLE achievements_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view achievements" ON achievements_catalog FOR SELECT USING (true);

ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own achievements" ON player_achievements FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can update own achievements" ON player_achievements FOR ALL USING (auth.uid() = profile_id);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view daily challenges" ON daily_challenges FOR SELECT USING (true);

ALTER TABLE player_daily_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own daily progress" ON player_daily_progress FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can update own daily progress" ON player_daily_progress FOR ALL USING (auth.uid() = profile_id);

ALTER TABLE global_leaderboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view leaderboards" ON global_leaderboards FOR SELECT USING (true);

-- Housing
ALTER TABLE player_houses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public houses" ON player_houses FOR SELECT USING (is_public = true);
CREATE POLICY "Users can view own house" ON player_houses FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own house" ON player_houses FOR ALL USING (auth.uid() = profile_id);

ALTER TABLE furniture_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view furniture" ON furniture_catalog FOR SELECT USING (true);

ALTER TABLE placed_furniture ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view furniture in public houses" ON placed_furniture FOR SELECT 
  USING (EXISTS (SELECT 1 FROM player_houses WHERE id = house_id AND is_public = true));
CREATE POLICY "Users can manage own house furniture" ON placed_furniture FOR ALL 
  USING (EXISTS (SELECT 1 FROM player_houses WHERE id = house_id AND profile_id = auth.uid()));

ALTER TABLE house_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view visitors to own house" ON house_visitors FOR SELECT 
  USING (EXISTS (SELECT 1 FROM player_houses WHERE id = house_id AND profile_id = auth.uid()));

-- PvP
ALTER TABLE pvp_arenas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view arenas" ON pvp_arenas FOR SELECT USING (true);

ALTER TABLE pvp_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view matches" ON pvp_matches FOR SELECT USING (true);

ALTER TABLE pvp_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ratings" ON pvp_ratings FOR SELECT USING (true);
CREATE POLICY "Users can update own rating" ON pvp_ratings FOR UPDATE USING (auth.uid() = profile_id);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view tournaments" ON tournaments FOR SELECT USING (true);

-- Environment (public read)
ALTER TABLE weather_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view weather patterns" ON weather_patterns FOR SELECT USING (true);

ALTER TABLE active_weather ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active weather" ON active_weather FOR SELECT USING (true);

ALTER TABLE time_of_day_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view time settings" ON time_of_day_settings FOR SELECT USING (true);

ALTER TABLE seasonal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view seasonal events" ON seasonal_events FOR SELECT USING (true);

ALTER TABLE dynamic_lighting_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view lighting zones" ON dynamic_lighting_zones FOR SELECT USING (true);

-- =====================================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE voice_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE player_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE player_daily_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE global_leaderboards;
ALTER PUBLICATION supabase_realtime ADD TABLE placed_furniture;
ALTER PUBLICATION supabase_realtime ADD TABLE pvp_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE pvp_ratings;
ALTER PUBLICATION supabase_realtime ADD TABLE active_weather;
ALTER PUBLICATION supabase_realtime ADD TABLE time_of_day_settings;

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Update leaderboard rank
CREATE OR REPLACE FUNCTION update_leaderboard_ranks(p_leaderboard_type TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE global_leaderboards
  SET rank = subquery.new_rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
    FROM global_leaderboards
    WHERE leaderboard_type = p_leaderboard_type
  ) AS subquery
  WHERE global_leaderboards.id = subquery.id;
END;
$$ LANGUAGE plpgsql;

-- Calculate house decoration score
CREATE OR REPLACE FUNCTION calculate_decoration_score(p_house_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total_score INTEGER;
BEGIN
  SELECT COALESCE(SUM(fc.decoration_points), 0) INTO total_score
  FROM placed_furniture pf
  JOIN furniture_catalog fc ON pf.furniture_id = fc.furniture_id
  WHERE pf.house_id = p_house_id;
  
  UPDATE player_houses
  SET decoration_score = total_score
  WHERE id = p_house_id;
  
  RETURN total_score;
END;
$$ LANGUAGE plpgsql;

-- Advance time of day
CREATE OR REPLACE FUNCTION advance_time_of_day(p_lobby_code TEXT, minutes_passed INTEGER)
RETURNS INTEGER AS $$
DECLARE
  new_time INTEGER;
BEGIN
  UPDATE time_of_day_settings
  SET time_minutes = ((time_minutes + minutes_passed) % 1440),
      updated_at = NOW()
  WHERE lobby_code = p_lobby_code
  RETURNING time_minutes INTO new_time;
  
  RETURN new_time;
END;
$$ LANGUAGE plpgsql;

-- Update PvP rating (ELO system)
CREATE OR REPLACE FUNCTION update_pvp_rating(
  p_winner_id UUID,
  p_loser_id UUID,
  p_season_id TEXT
)
RETURNS VOID AS $$
DECLARE
  winner_rating INTEGER;
  loser_rating INTEGER;
  expected_winner DECIMAL(5,3);
  expected_loser DECIMAL(5,3);
  k_factor INTEGER := 32;
  rating_change INTEGER;
BEGIN
  -- Get current ratings
  SELECT rating INTO winner_rating FROM pvp_ratings 
  WHERE profile_id = p_winner_id AND season_id = p_season_id;
  
  SELECT rating INTO loser_rating FROM pvp_ratings 
  WHERE profile_id = p_loser_id AND season_id = p_season_id;
  
  -- Calculate expected scores
  expected_winner := 1.0 / (1.0 + POWER(10.0, (loser_rating - winner_rating) / 400.0));
  expected_loser := 1.0 / (1.0 + POWER(10.0, (winner_rating - loser_rating) / 400.0));
  
  -- Calculate rating changes
  rating_change := ROUND(k_factor * (1.0 - expected_winner));
  
  -- Update winner
  UPDATE pvp_ratings
  SET rating = rating + rating_change,
      peak_rating = GREATEST(peak_rating, rating + rating_change),
      wins = wins + 1,
      total_matches = total_matches + 1,
      current_win_streak = current_win_streak + 1,
      best_win_streak = GREATEST(best_win_streak, current_win_streak + 1),
      updated_at = NOW()
  WHERE profile_id = p_winner_id AND season_id = p_season_id;
  
  -- Update loser
  UPDATE pvp_ratings
  SET rating = GREATEST(0, rating - rating_change),
      losses = losses + 1,
      total_matches = total_matches + 1,
      current_win_streak = 0,
      updated_at = NOW()
  WHERE profile_id = p_loser_id AND season_id = p_season_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- SAMPLE DATA
-- =====================================================================

-- Sample NPCs
INSERT INTO npc_characters (npc_name, npc_type, personality_traits, background_story, occupation, behavior_pattern) VALUES
('Merchant Magnus', 'merchant', '{"friendliness": 8, "humor": 5, "aggression": 1, "wisdom": 7}', 'A jovial trader who has traveled the world.', 'General Merchant', 'friendly'),
('Elder Sage', 'quest_giver', '{"friendliness": 9, "humor": 3, "aggression": 0, "wisdom": 10}', 'Ancient keeper of knowledge and secrets.', 'Quest Giver', 'friendly'),
('Blacksmith Grok', 'trainer', '{"friendliness": 6, "humor": 4, "aggression": 3, "wisdom": 8}', 'Master craftsman of weapons and armor.', 'Blacksmith', 'neutral'),
('Shadow Assassin', 'enemy', '{"friendliness": 1, "humor": 0, "aggression": 9, "wisdom": 6}', 'Mysterious hired blade.', 'Assassin', 'hostile')
ON CONFLICT (npc_name) DO NOTHING;

-- Sample Achievements
INSERT INTO achievements_catalog (achievement_id, achievement_name, achievement_description, category, requirement_type, requirement_data, points, rarity) VALUES
('first_blood', 'First Blood', 'Defeat your first enemy', 'combat', 'count', '{"stat": "enemies_killed", "target": 1}', 10, 'common'),
('social_butterfly', 'Social Butterfly', 'Add 10 friends', 'social', 'count', '{"stat": "friends_added", "target": 10}', 15, 'common'),
('master_crafter', 'Master Crafter', 'Craft 100 items', 'crafting', 'count', '{"stat": "items_crafted", "target": 100}', 50, 'rare'),
('world_explorer', 'World Explorer', 'Visit all map regions', 'exploration', 'collection', '{"regions": ["forest", "mountains", "desert", "ocean", "city"]}', 100, 'epic'),
('legend', 'Living Legend', 'Reach level 100', 'progression', 'comparison', '{"stat": "level", "comparison": ">=", "target": 100}', 500, 'legendary')
ON CONFLICT (achievement_id) DO NOTHING;

-- Sample PvP Arenas
INSERT INTO pvp_arenas (arena_name, arena_type, max_players, min_players, rules) VALUES
('Colosseum', '1v1', 2, 2, '{"friendly_fire": false, "time_limit": 300, "respawn": false}'),
('Battle Grounds', '5v5', 10, 10, '{"friendly_fire": false, "time_limit": 900, "respawn": true}'),
('Free for All Arena', 'free_for_all', 10, 4, '{"friendly_fire": true, "time_limit": 600, "respawn": true}')
ON CONFLICT (arena_name) DO NOTHING;

-- Sample Weather Patterns
INSERT INTO weather_patterns (weather_type, visibility_modifier, movement_speed_modifier, occurrence_weight) VALUES
('sunny', 1.0, 1.0, 40),
('cloudy', 0.9, 1.0, 25),
('rainy', 0.7, 0.9, 15),
('stormy', 0.5, 0.8, 5),
('snowy', 0.6, 0.85, 10),
('foggy', 0.4, 1.0, 5);

-- Sample Voice Commands
INSERT INTO voice_commands (command_phrase, command_action, command_parameters) VALUES
('open inventory', 'open_inventory', '{}'),
('close inventory', 'close_inventory', '{}'),
('open map', 'open_map', '{}'),
('use heal', 'use_ability', '{"ability_id": "heal"}'),
('wave emote', 'emote', '{"emote_id": "wave"}');

-- Sample Furniture
INSERT INTO furniture_catalog (furniture_id, furniture_name, furniture_type, size_category, required_gold, decoration_points, rarity) VALUES
('wooden_chair', 'Wooden Chair', 'chair', 'small', 50, 1, 'common'),
('oak_table', 'Oak Table', 'table', 'medium', 150, 3, 'common'),
('king_bed', 'King Bed', 'bed', 'large', 500, 10, 'rare'),
('trophy_case', 'Trophy Case', 'decoration', 'medium', 300, 8, 'uncommon'),
('chandelier', 'Crystal Chandelier', 'decoration', 'medium', 1000, 20, 'epic')
ON CONFLICT (furniture_id) DO NOTHING;

COMMIT;

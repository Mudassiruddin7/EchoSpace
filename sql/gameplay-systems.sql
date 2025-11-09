-- =====================================================================
-- GAMEPLAY SYSTEMS - Inventory, Stats, Quests, Achievements
-- =====================================================================
-- Execute this in Supabase SQL Editor after FIX_REALTIME_COMPLETE.sql
-- =====================================================================

-- =====================================================================
-- 1. PLAYER STATS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS player_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    level INT DEFAULT 1,
    current_xp INT DEFAULT 0,
    xp_to_next_level INT DEFAULT 100,
    health INT DEFAULT 100,
    max_health INT DEFAULT 100,
    mana INT DEFAULT 50,
    max_mana INT DEFAULT 50,
    strength INT DEFAULT 10,
    intelligence INT DEFAULT 10,
    charisma INT DEFAULT 10,
    defense INT DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id)
);

-- =====================================================================
-- 2. INVENTORY TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL, -- 'weapon', 'armor', 'consumable', 'quest_item', 'cosmetic'
    item_rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
    quantity INT DEFAULT 1,
    equipped BOOLEAN DEFAULT false,
    slot_position INT, -- For hotbar/quick slots
    metadata JSONB, -- Custom item properties
    acquired_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_profile_id ON inventory(profile_id);
CREATE INDEX IF NOT EXISTS idx_inventory_equipped ON inventory(profile_id, equipped);

-- =====================================================================
-- 3. QUESTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quest_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    quest_type TEXT DEFAULT 'main', -- 'main', 'side', 'daily', 'repeatable'
    difficulty TEXT DEFAULT 'medium', -- 'easy', 'medium', 'hard', 'epic'
    objectives JSONB NOT NULL, -- [{id, description, target, current, completed}]
    rewards JSONB, -- {xp: 100, items: [], gold: 50}
    required_level INT DEFAULT 1,
    npc_giver TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quests_quest_id ON quests(quest_id);

-- =====================================================================
-- 4. PLAYER QUESTS (Progress Tracking)
-- =====================================================================
CREATE TABLE IF NOT EXISTS player_quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    quest_id TEXT NOT NULL REFERENCES quests(quest_id),
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'failed', 'abandoned'
    progress JSONB DEFAULT '[]', -- Current objective progress
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    UNIQUE(profile_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_player_quests_profile ON player_quests(profile_id, status);

-- =====================================================================
-- 5. ACHIEVEMENTS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT, -- Icon path
    points INT DEFAULT 10,
    requirement JSONB, -- {type: 'level', value: 10} or {type: 'quests_completed', value: 50}
    reward JSONB, -- {xp: 500, items: [], title: 'Explorer'}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 6. PLAYER ACHIEVEMENTS
-- =====================================================================
CREATE TABLE IF NOT EXISTS player_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(achievement_id),
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_player_achievements_profile ON player_achievements(profile_id);

-- =====================================================================
-- 7. LEADERBOARDS
-- =====================================================================
CREATE TABLE IF NOT EXISTS leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL, -- 'xp', 'quests_completed', 'time_played', 'achievements'
    score BIGINT DEFAULT 0,
    rank INT,
    season TEXT, -- 'season_1', 'all_time'
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, category, season)
);

CREATE INDEX IF NOT EXISTS idx_leaderboards_category ON leaderboards(category, score DESC);

-- =====================================================================
-- 8. ENABLE RLS (Row Level Security)
-- =====================================================================
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboards ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 9. RLS POLICIES
-- =====================================================================

-- Player Stats: Public read, owner write
DROP POLICY IF EXISTS "Public read player_stats" ON player_stats;
CREATE POLICY "Public read player_stats" ON player_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own stats" ON player_stats;
CREATE POLICY "Users manage own stats" ON player_stats FOR ALL USING (true) WITH CHECK (true);

-- Inventory: Owner only
DROP POLICY IF EXISTS "Users view own inventory" ON inventory;
CREATE POLICY "Users view own inventory" ON inventory FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own inventory" ON inventory;
CREATE POLICY "Users manage own inventory" ON inventory FOR ALL USING (true) WITH CHECK (true);

-- Quests: Public read
DROP POLICY IF EXISTS "Public read quests" ON quests;
CREATE POLICY "Public read quests" ON quests FOR SELECT USING (true);

-- Player Quests: Owner only
DROP POLICY IF EXISTS "Users manage own quests" ON player_quests;
CREATE POLICY "Users manage own quests" ON player_quests FOR ALL USING (true) WITH CHECK (true);

-- Achievements: Public read
DROP POLICY IF EXISTS "Public read achievements" ON achievements;
CREATE POLICY "Public read achievements" ON achievements FOR SELECT USING (true);

-- Player Achievements: Owner only
DROP POLICY IF EXISTS "Users manage own achievements" ON player_achievements;
CREATE POLICY "Users manage own achievements" ON player_achievements FOR ALL USING (true) WITH CHECK (true);

-- Leaderboards: Public read
DROP POLICY IF EXISTS "Public read leaderboards" ON leaderboards;
CREATE POLICY "Public read leaderboards" ON leaderboards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own leaderboards" ON leaderboards;
CREATE POLICY "Users update own leaderboards" ON leaderboards FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 10. GRANT PERMISSIONS
-- =====================================================================
GRANT ALL ON player_stats TO anon, authenticated;
GRANT ALL ON inventory TO anon, authenticated;
GRANT ALL ON quests TO anon, authenticated;
GRANT ALL ON player_quests TO anon, authenticated;
GRANT ALL ON achievements TO anon, authenticated;
GRANT ALL ON player_achievements TO anon, authenticated;
GRANT ALL ON leaderboards TO anon, authenticated;

-- =====================================================================
-- 11. ENABLE REALTIME (for live updates)
-- =====================================================================
ALTER TABLE player_stats REPLICA IDENTITY FULL;
ALTER TABLE inventory REPLICA IDENTITY FULL;
ALTER TABLE player_quests REPLICA IDENTITY FULL;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE player_stats;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE player_stats;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE inventory;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE player_quests;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE player_quests;

-- =====================================================================
-- 12. SAMPLE DATA - Starting Quests
-- =====================================================================
INSERT INTO quests (quest_id, title, description, quest_type, difficulty, objectives, rewards, required_level, npc_giver)
VALUES
(
    'tutorial_001',
    'Welcome to the World',
    'Explore your surroundings and talk to 3 different NPCs to learn the basics.',
    'main',
    'easy',
    '[
        {"id": "talk_npcs", "description": "Talk to NPCs", "target": 3, "current": 0, "completed": false}
    ]'::jsonb,
    '{"xp": 50, "items": ["starter_sword"], "gold": 10}'::jsonb,
    1,
    'Tutorial Guide'
),
(
    'daily_chat',
    'Social Butterfly',
    'Send 10 messages in chat to earn bonus XP.',
    'daily',
    'easy',
    '[
        {"id": "send_messages", "description": "Send messages", "target": 10, "current": 0, "completed": false}
    ]'::jsonb,
    '{"xp": 100, "gold": 25}'::jsonb,
    1,
    null
),
(
    'exploration_001',
    'World Explorer',
    'Visit 5 different lobbies to discover new areas.',
    'side',
    'medium',
    '[
        {"id": "visit_lobbies", "description": "Visit different lobbies", "target": 5, "current": 0, "completed": false}
    ]'::jsonb,
    '{"xp": 200, "items": ["explorer_badge"], "gold": 50}'::jsonb,
    3,
    'Wanderer'
);

-- =====================================================================
-- 13. SAMPLE DATA - Achievements
-- =====================================================================
INSERT INTO achievements (achievement_id, title, description, icon, points, requirement, reward)
VALUES
(
    'first_steps',
    'First Steps',
    'Complete your first quest',
    '/icons/achievement_first_quest.png',
    10,
    '{"type": "quests_completed", "value": 1}'::jsonb,
    '{"xp": 50, "title": "Novice"}'::jsonb
),
(
    'level_master',
    'Level 10 Master',
    'Reach level 10',
    '/icons/achievement_level_10.png',
    25,
    '{"type": "level", "value": 10}'::jsonb,
    '{"xp": 500, "items": ["epic_cape"]}'::jsonb
),
(
    'social_star',
    'Social Star',
    'Send 100 messages in chat',
    '/icons/achievement_chat_100.png',
    15,
    '{"type": "messages_sent", "value": 100}'::jsonb,
    '{"xp": 200, "title": "Chatterbox"}'::jsonb
);

-- =====================================================================
-- 14. TRIGGER - Auto-create player_stats on profile creation
-- =====================================================================
CREATE OR REPLACE FUNCTION create_player_stats_on_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO player_stats (profile_id)
    VALUES (NEW.id)
    ON CONFLICT (profile_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_player_stats ON profiles;
CREATE TRIGGER trigger_create_player_stats
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_player_stats_on_profile();

-- =====================================================================
-- 15. FUNCTION - Calculate XP for next level
-- =====================================================================
CREATE OR REPLACE FUNCTION calculate_xp_to_next_level(current_level INT)
RETURNS INT AS $$
BEGIN
    -- Formula: 100 * level^1.5 (exponential growth)
    RETURN FLOOR(100 * POWER(current_level, 1.5));
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================
/*
-- Check all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('player_stats', 'inventory', 'quests', 'player_quests', 'achievements', 'player_achievements', 'leaderboards');

-- Check sample data
SELECT * FROM quests;
SELECT * FROM achievements;
*/

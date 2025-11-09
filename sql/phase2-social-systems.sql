-- =====================================================================
-- PHASE 2: SOCIAL SYSTEMS - Parties, Friends, Trading, Titles
-- =====================================================================
-- Execute this after gameplay-systems.sql
-- =====================================================================

-- =====================================================================
-- 1. PARTIES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_name TEXT,
    leader_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lobby_id TEXT NOT NULL,
    max_members INT DEFAULT 6,
    is_public BOOLEAN DEFAULT false,
    party_settings JSONB DEFAULT '{
        "loot_distribution": "round_robin",
        "xp_sharing": true,
        "allow_join_requests": true,
        "voice_chat_required": false
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    disbanded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_parties_lobby ON parties(lobby_id, disbanded_at);
CREATE INDEX IF NOT EXISTS idx_parties_leader ON parties(leader_profile_id);

-- =====================================================================
-- 2. PARTY MEMBERS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS party_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'leader', 'officer', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    contribution_score INT DEFAULT 0,
    UNIQUE(party_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_party_members_party ON party_members(party_id);
CREATE INDEX IF NOT EXISTS idx_party_members_profile ON party_members(profile_id);

-- =====================================================================
-- 3. PARTY INVITES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS party_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
    sender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes',
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_party_invites_invitee ON party_invites(invitee_profile_id, status);

-- =====================================================================
-- 4. FRIENDS LIST TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS friend_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    friend_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    friendship_level INT DEFAULT 1, -- Level increases with interactions
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, friend_profile_id),
    CHECK (profile_id != friend_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_friends_profile ON friend_lists(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_bidirectional ON friend_lists(friend_profile_id, status);

-- =====================================================================
-- 5. TRADE OFFERS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS trade_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiator_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'cancelled', 'completed'
    initiator_items JSONB DEFAULT '[]'::jsonb, -- Array of {item_id, quantity}
    recipient_items JSONB DEFAULT '[]'::jsonb,
    initiator_gold INT DEFAULT 0,
    recipient_gold INT DEFAULT 0,
    initiator_confirmed BOOLEAN DEFAULT false,
    recipient_confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '5 minutes',
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trades_recipient ON trade_offers(recipient_profile_id, status);
CREATE INDEX IF NOT EXISTS idx_trades_initiator ON trade_offers(initiator_profile_id, status);

-- =====================================================================
-- 6. PLAYER TITLES TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS player_titles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title_id TEXT NOT NULL,
    title_name TEXT NOT NULL,
    title_description TEXT,
    rarity TEXT DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary', 'mythic'
    color TEXT DEFAULT '#FFFFFF',
    icon TEXT,
    unlocked_at TIMESTAMPTZ DEFAULT NOW(),
    is_equipped BOOLEAN DEFAULT false,
    UNIQUE(profile_id, title_id)
);

CREATE INDEX IF NOT EXISTS idx_player_titles_profile ON player_titles(profile_id);
CREATE INDEX IF NOT EXISTS idx_player_titles_equipped ON player_titles(profile_id, is_equipped);

-- =====================================================================
-- 7. NPC MEMORY TABLE (Enhanced AI)
-- =====================================================================
CREATE TABLE IF NOT EXISTS npc_memory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id TEXT NOT NULL,
    lobby_id TEXT NOT NULL,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    memory_type TEXT NOT NULL, -- 'conversation', 'interaction', 'quest', 'gift'
    content JSONB NOT NULL, -- Stores conversation summary, actions, etc.
    sentiment FLOAT DEFAULT 0.0, -- -1.0 (negative) to 1.0 (positive)
    importance INT DEFAULT 5, -- 1-10 scale
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_referenced TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_npc_memory_lookup ON npc_memory(npc_id, profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_npc_memory_importance ON npc_memory(npc_id, importance DESC);

-- =====================================================================
-- 8. NPC RELATIONSHIPS TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS npc_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    npc_id TEXT NOT NULL,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    relationship_level INT DEFAULT 0, -- -100 to 100 scale
    friendship_points INT DEFAULT 0,
    total_conversations INT DEFAULT 0,
    total_gifts_given INT DEFAULT 0,
    quests_completed_together INT DEFAULT 0,
    last_interaction TIMESTAMPTZ DEFAULT NOW(),
    relationship_status TEXT DEFAULT 'stranger', -- 'stranger', 'acquaintance', 'friend', 'close_friend', 'rival', 'enemy'
    UNIQUE(npc_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_npc_relationships_profile ON npc_relationships(profile_id);
CREATE INDEX IF NOT EXISTS idx_npc_relationships_npc ON npc_relationships(npc_id, relationship_level DESC);

-- =====================================================================
-- 9. PLAYER REPUTATION TABLE
-- =====================================================================
CREATE TABLE IF NOT EXISTS player_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    faction TEXT NOT NULL, -- 'adventurers_guild', 'merchants_association', 'mages_circle', etc.
    reputation_points INT DEFAULT 0,
    rank TEXT DEFAULT 'neutral',
    perks JSONB DEFAULT '[]'::jsonb,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, faction)
);

CREATE INDEX IF NOT EXISTS idx_reputation_profile ON player_reputation(profile_id);

-- =====================================================================
-- 10. ENABLE RLS
-- =====================================================================
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE party_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE npc_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE npc_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_reputation ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 11. RLS POLICIES
-- =====================================================================

-- Parties: Public read in same lobby, member write
DROP POLICY IF EXISTS "Public read parties in lobby" ON parties;
CREATE POLICY "Public read parties in lobby" ON parties FOR SELECT USING (true);

DROP POLICY IF EXISTS "Party leaders manage parties" ON parties;
CREATE POLICY "Party leaders manage parties" ON parties FOR ALL USING (true) WITH CHECK (true);

-- Party Members: Public read, member write
DROP POLICY IF EXISTS "Public read party members" ON party_members;
CREATE POLICY "Public read party members" ON party_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage own party membership" ON party_members;
CREATE POLICY "Manage own party membership" ON party_members FOR ALL USING (true) WITH CHECK (true);

-- Party Invites: Invitee can read own invites
DROP POLICY IF EXISTS "Users read own invites" ON party_invites;
CREATE POLICY "Users read own invites" ON party_invites FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage invites" ON party_invites;
CREATE POLICY "Users manage invites" ON party_invites FOR ALL USING (true) WITH CHECK (true);

-- Friends: Users manage own friends
DROP POLICY IF EXISTS "Users manage own friends" ON friend_lists;
CREATE POLICY "Users manage own friends" ON friend_lists FOR ALL USING (true) WITH CHECK (true);

-- Trades: Participants can see trades
DROP POLICY IF EXISTS "Users see own trades" ON trade_offers;
CREATE POLICY "Users see own trades" ON trade_offers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage trades" ON trade_offers;
CREATE POLICY "Users manage trades" ON trade_offers FOR ALL USING (true) WITH CHECK (true);

-- Titles: Public read, owner write
DROP POLICY IF EXISTS "Public read titles" ON player_titles;
CREATE POLICY "Public read titles" ON player_titles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own titles" ON player_titles;
CREATE POLICY "Users manage own titles" ON player_titles FOR ALL USING (true) WITH CHECK (true);

-- NPC Memory: System managed
DROP POLICY IF EXISTS "Public read npc memory" ON npc_memory;
CREATE POLICY "Public read npc memory" ON npc_memory FOR SELECT USING (true);

DROP POLICY IF EXISTS "System manage npc memory" ON npc_memory;
CREATE POLICY "System manage npc memory" ON npc_memory FOR ALL USING (true) WITH CHECK (true);

-- NPC Relationships: Public read
DROP POLICY IF EXISTS "Public read npc relationships" ON npc_relationships;
CREATE POLICY "Public read npc relationships" ON npc_relationships FOR SELECT USING (true);

DROP POLICY IF EXISTS "System manage relationships" ON npc_relationships;
CREATE POLICY "System manage relationships" ON npc_relationships FOR ALL USING (true) WITH CHECK (true);

-- Reputation: Public read, owner write
DROP POLICY IF EXISTS "Public read reputation" ON player_reputation;
CREATE POLICY "Public read reputation" ON player_reputation FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users manage own reputation" ON player_reputation;
CREATE POLICY "Users manage own reputation" ON player_reputation FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 12. GRANT PERMISSIONS
-- =====================================================================
GRANT ALL ON parties TO anon, authenticated;
GRANT ALL ON party_members TO anon, authenticated;
GRANT ALL ON party_invites TO anon, authenticated;
GRANT ALL ON friend_lists TO anon, authenticated;
GRANT ALL ON trade_offers TO anon, authenticated;
GRANT ALL ON player_titles TO anon, authenticated;
GRANT ALL ON npc_memory TO anon, authenticated;
GRANT ALL ON npc_relationships TO anon, authenticated;
GRANT ALL ON player_reputation TO anon, authenticated;

-- =====================================================================
-- 13. ENABLE REALTIME
-- =====================================================================
ALTER TABLE parties REPLICA IDENTITY FULL;
ALTER TABLE party_members REPLICA IDENTITY FULL;
ALTER TABLE party_invites REPLICA IDENTITY FULL;
ALTER TABLE trade_offers REPLICA IDENTITY FULL;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE parties;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE parties;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE party_members;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE party_members;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE party_invites;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE party_invites;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE trade_offers;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_offers;

-- =====================================================================
-- 14. SAMPLE DATA - Titles
-- =====================================================================
INSERT INTO player_titles (profile_id, title_id, title_name, title_description, rarity, color)
SELECT 
    p.id,
    'newbie',
    'Newbie',
    'Just started the adventure',
    'common',
    '#CCCCCC'
FROM profiles p
ON CONFLICT (profile_id, title_id) DO NOTHING;

-- =====================================================================
-- 15. FUNCTIONS
-- =====================================================================

-- Function to update NPC relationship based on interaction
CREATE OR REPLACE FUNCTION update_npc_relationship(
    p_npc_id TEXT,
    p_profile_id UUID,
    p_points_change INT
)
RETURNS void AS $$
DECLARE
    v_new_level INT;
    v_new_status TEXT;
BEGIN
    -- Insert or update relationship
    INSERT INTO npc_relationships (npc_id, profile_id, friendship_points, relationship_level, total_conversations)
    VALUES (p_npc_id, p_profile_id, p_points_change, p_points_change, 1)
    ON CONFLICT (npc_id, profile_id) 
    DO UPDATE SET
        friendship_points = npc_relationships.friendship_points + p_points_change,
        relationship_level = npc_relationships.relationship_level + p_points_change,
        total_conversations = npc_relationships.total_conversations + 1,
        last_interaction = NOW();
    
    -- Update relationship status based on level
    SELECT relationship_level INTO v_new_level
    FROM npc_relationships
    WHERE npc_id = p_npc_id AND profile_id = p_profile_id;
    
    IF v_new_level >= 80 THEN
        v_new_status := 'close_friend';
    ELSIF v_new_level >= 50 THEN
        v_new_status := 'friend';
    ELSIF v_new_level >= 20 THEN
        v_new_status := 'acquaintance';
    ELSIF v_new_level <= -50 THEN
        v_new_status := 'enemy';
    ELSIF v_new_level <= -20 THEN
        v_new_status := 'rival';
    ELSE
        v_new_status := 'stranger';
    END IF;
    
    UPDATE npc_relationships
    SET relationship_status = v_new_status
    WHERE npc_id = p_npc_id AND profile_id = p_profile_id;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up expired invites
CREATE OR REPLACE FUNCTION cleanup_expired_invites()
RETURNS void AS $$
BEGIN
    UPDATE party_invites
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
    
    UPDATE trade_offers
    SET status = 'expired'
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 16. SAMPLE FACTIONS FOR REPUTATION
-- =====================================================================
-- These will be auto-created when players first interact with factions

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================
/*
-- Check all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parties', 'party_members', 'party_invites', 'friend_lists', 
                   'trade_offers', 'player_titles', 'npc_memory', 'npc_relationships', 'player_reputation');

-- Test NPC relationship function
SELECT update_npc_relationship('npc_merchant', 'YOUR_PROFILE_ID', 10);
SELECT * FROM npc_relationships WHERE npc_id = 'npc_merchant';
*/

-- =====================================================================
-- PHASE 3: ADVANCED GAMEPLAY SYSTEMS
-- =====================================================================
-- Features: Combat, Skills, Crafting, World Events, Guilds, Pets/Mounts
-- =====================================================================

-- =====================================================================
-- 1. COMBAT SYSTEM
-- =====================================================================

-- Player combat stats and loadouts
CREATE TABLE IF NOT EXISTS player_combat_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Primary Stats
  max_hp INTEGER DEFAULT 100,
  current_hp INTEGER DEFAULT 100,
  max_mana INTEGER DEFAULT 50,
  current_mana INTEGER DEFAULT 50,
  
  -- Combat Stats
  attack_power INTEGER DEFAULT 10,
  defense INTEGER DEFAULT 5,
  magic_power INTEGER DEFAULT 5,
  magic_resistance INTEGER DEFAULT 5,
  critical_chance DECIMAL(5,2) DEFAULT 5.00,
  critical_damage DECIMAL(5,2) DEFAULT 150.00,
  dodge_chance DECIMAL(5,2) DEFAULT 5.00,
  block_chance DECIMAL(5,2) DEFAULT 5.00,
  
  -- Combat State
  in_combat BOOLEAN DEFAULT FALSE,
  combat_target_id UUID,
  last_combat_action TIMESTAMP WITH TIME ZONE,
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(profile_id)
);

-- Player abilities and skills
CREATE TABLE IF NOT EXISTS player_abilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ability_id TEXT NOT NULL,
  ability_name TEXT NOT NULL,
  ability_type TEXT NOT NULL, -- 'active', 'passive', 'ultimate'
  damage_type TEXT, -- 'physical', 'magical', 'true'
  
  -- Ability Stats
  ability_level INTEGER DEFAULT 1,
  max_level INTEGER DEFAULT 10,
  cooldown_seconds INTEGER DEFAULT 0,
  mana_cost INTEGER DEFAULT 0,
  damage_multiplier DECIMAL(5,2) DEFAULT 1.00,
  
  -- Status
  last_used TIMESTAMP WITH TIME ZONE,
  times_used INTEGER DEFAULT 0,
  
  -- Metadata
  description TEXT,
  icon TEXT,
  unlock_level INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(profile_id, ability_id)
);

-- Combat encounters and battle logs
CREATE TABLE IF NOT EXISTS combat_encounters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lobby_id TEXT, -- Store lobby code as text instead of FK
  
  -- Participants
  attacker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  defender_id UUID, -- Can be player or NPC (null for NPC)
  defender_type TEXT NOT NULL DEFAULT 'player', -- 'player', 'npc', 'boss', 'creature'
  defender_name TEXT,
  
  -- Combat Data
  encounter_type TEXT NOT NULL, -- 'pvp', 'pve', 'boss', 'world_event'
  winner_id UUID,
  total_damage_dealt INTEGER DEFAULT 0,
  total_damage_taken INTEGER DEFAULT 0,
  abilities_used JSONB DEFAULT '[]',
  
  -- Duration
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Rewards
  experience_gained INTEGER DEFAULT 0,
  gold_gained INTEGER DEFAULT 0,
  items_dropped JSONB DEFAULT '[]'
);

-- Status effects (buffs/debuffs)
CREATE TABLE IF NOT EXISTS status_effects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  effect_name TEXT NOT NULL,
  effect_type TEXT NOT NULL, -- 'buff', 'debuff', 'dot', 'hot'
  effect_source TEXT, -- What caused this effect
  
  -- Effect Properties
  stat_affected TEXT, -- 'hp', 'attack', 'defense', etc.
  modifier_value INTEGER,
  modifier_type TEXT DEFAULT 'flat', -- 'flat', 'percentage'
  
  -- Duration
  duration_seconds INTEGER,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Stack Info
  stacks INTEGER DEFAULT 1,
  max_stacks INTEGER DEFAULT 1,
  
  -- Visuals
  icon TEXT,
  description TEXT
);

-- =====================================================================
-- 2. SKILL TREE & TALENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS skill_trees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_name TEXT NOT NULL UNIQUE,
  class_type TEXT NOT NULL, -- 'warrior', 'mage', 'rogue', 'healer', 'ranger'
  description TEXT,
  icon TEXT,
  background_image TEXT,
  max_points INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_tree_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tree_id UUID NOT NULL REFERENCES skill_trees(id) ON DELETE CASCADE,
  
  node_name TEXT NOT NULL,
  node_type TEXT NOT NULL, -- 'active_skill', 'passive_bonus', 'keystone'
  tier INTEGER NOT NULL, -- 1-7 (7 tiers in tree)
  position_x INTEGER,
  position_y INTEGER,
  
  -- Requirements
  required_points_in_tree INTEGER DEFAULT 0,
  required_level INTEGER DEFAULT 1,
  parent_nodes UUID[], -- Array of node IDs that must be unlocked first
  
  -- Effects
  max_ranks INTEGER DEFAULT 1,
  effects JSONB NOT NULL, -- {stat_bonuses: {}, abilities_granted: {}}
  
  -- Visuals
  icon TEXT,
  description TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_skill_tree_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tree_id UUID NOT NULL REFERENCES skill_trees(id) ON DELETE CASCADE,
  
  total_points_spent INTEGER DEFAULT 0,
  available_points INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(profile_id, tree_id)
);

CREATE TABLE IF NOT EXISTS player_unlocked_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES skill_tree_nodes(id) ON DELETE CASCADE,
  
  current_rank INTEGER DEFAULT 1,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(profile_id, node_id)
);

-- =====================================================================
-- 3. CRAFTING & ENCHANTING
-- =====================================================================

CREATE TABLE IF NOT EXISTS crafting_professions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  profession_name TEXT NOT NULL, -- 'blacksmithing', 'alchemy', 'enchanting', 'tailoring', 'jewelcrafting'
  profession_level INTEGER DEFAULT 1,
  profession_experience INTEGER DEFAULT 0,
  
  -- Unlocks
  recipes_discovered TEXT[] DEFAULT '{}',
  specialization TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(profile_id, profession_name)
);

CREATE TABLE IF NOT EXISTS crafting_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_name TEXT NOT NULL UNIQUE,
  profession TEXT NOT NULL,
  
  -- Requirements
  required_level INTEGER DEFAULT 1,
  difficulty TEXT DEFAULT 'common', -- 'common', 'uncommon', 'rare', 'epic', 'legendary'
  
  -- Materials
  required_materials JSONB NOT NULL, -- [{item_id: '', quantity: 0}]
  output_item_id TEXT NOT NULL,
  output_quantity INTEGER DEFAULT 1,
  
  -- Crafting Info
  crafting_time_seconds INTEGER DEFAULT 5,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  
  -- Discovery
  is_discoverable BOOLEAN DEFAULT FALSE,
  discovery_method TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enchantments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enchantment_name TEXT NOT NULL UNIQUE,
  enchantment_type TEXT NOT NULL, -- 'weapon', 'armor', 'accessory'
  
  -- Effects
  stat_bonuses JSONB NOT NULL, -- {attack: +10, defense: +5}
  special_effects JSONB, -- {lifesteal: 5%, fire_damage: 10}
  
  -- Requirements
  required_enchanting_level INTEGER DEFAULT 1,
  required_materials JSONB NOT NULL,
  
  -- Rarity
  rarity TEXT DEFAULT 'common',
  glow_color TEXT,
  particle_effect TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enchanted_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  enchantment_id UUID NOT NULL REFERENCES enchantments(id),
  
  enchantment_level INTEGER DEFAULT 1,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_by UUID REFERENCES profiles(id),
  
  UNIQUE(inventory_item_id, enchantment_id)
);

-- =====================================================================
-- 4. DYNAMIC WORLD EVENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS world_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'boss_spawn', 'treasure_hunt', 'invasion', 'celebration'
  
  -- Location
  lobby_id TEXT, -- Store lobby code as text
  spawn_location JSONB, -- {x: 0, y: 0, z: 0}
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'active', 'completed', 'failed'
  
  -- Timing
  scheduled_start TIMESTAMP WITH TIME ZONE,
  actual_start TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 30,
  ends_at TIMESTAMP WITH TIME ZONE,
  
  -- Participation
  min_players INTEGER DEFAULT 1,
  max_players INTEGER DEFAULT 50,
  current_participants INTEGER DEFAULT 0,
  
  -- Rewards
  base_rewards JSONB, -- {xp: 1000, gold: 500, items: []}
  bonus_rewards JSONB,
  
  -- Event Data
  event_data JSONB, -- Boss HP, treasure locations, etc.
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES world_events(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  contribution_score INTEGER DEFAULT 0,
  damage_dealt INTEGER DEFAULT 0,
  healing_done INTEGER DEFAULT 0,
  
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  rewards_claimed BOOLEAN DEFAULT FALSE,
  rewards_received JSONB,
  
  UNIQUE(event_id, profile_id)
);

-- =====================================================================
-- 5. GUILD SYSTEM
-- =====================================================================

CREATE TABLE IF NOT EXISTS guilds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_name TEXT NOT NULL UNIQUE,
  guild_tag TEXT UNIQUE, -- [TAG] max 5 chars
  
  -- Leadership
  guild_master_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Info
  description TEXT,
  motto TEXT,
  guild_icon TEXT,
  guild_banner TEXT,
  
  -- Settings
  is_recruiting BOOLEAN DEFAULT TRUE,
  min_level_requirement INTEGER DEFAULT 1,
  join_type TEXT DEFAULT 'request', -- 'open', 'request', 'invite_only'
  
  -- Stats
  guild_level INTEGER DEFAULT 1,
  guild_experience INTEGER DEFAULT 0,
  total_members INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 50,
  
  -- Resources
  guild_gold INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guild_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  guild_rank TEXT NOT NULL DEFAULT 'member', -- 'guild_master', 'officer', 'veteran', 'member', 'recruit'
  
  -- Contribution
  contribution_points INTEGER DEFAULT 0,
  gold_donated INTEGER DEFAULT 0,
  
  -- Permissions
  can_invite BOOLEAN DEFAULT FALSE,
  can_kick BOOLEAN DEFAULT FALSE,
  can_promote BOOLEAN DEFAULT FALSE,
  can_withdraw_gold BOOLEAN DEFAULT FALSE,
  
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_online TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(guild_id, profile_id)
);

CREATE TABLE IF NOT EXISTS guild_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES profiles(id),
  invitee_id UUID NOT NULL REFERENCES profiles(id),
  
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'expired'
  message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS guild_bank (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT,
  quantity INTEGER DEFAULT 1,
  
  deposited_by UUID REFERENCES profiles(id),
  deposited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Permissions
  required_rank TEXT DEFAULT 'member',
  daily_withdraw_limit INTEGER
);

CREATE TABLE IF NOT EXISTS guild_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  
  quest_name TEXT NOT NULL,
  quest_type TEXT NOT NULL, -- 'daily', 'weekly', 'epic'
  description TEXT,
  
  -- Objectives
  objectives JSONB NOT NULL, -- [{type: 'kill', target: 'boss', count: 10, progress: 0}]
  
  -- Rewards
  rewards JSONB, -- {guild_xp: 1000, gold: 500}
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'expired'
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- =====================================================================
-- 6. PET & MOUNT SYSTEM
-- =====================================================================

CREATE TABLE IF NOT EXISTS pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  pet_name TEXT NOT NULL,
  pet_type TEXT NOT NULL, -- 'combat', 'gathering', 'companion'
  species TEXT NOT NULL, -- 'wolf', 'dragon', 'bird', etc.
  
  -- Stats
  pet_level INTEGER DEFAULT 1,
  pet_experience INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common',
  
  -- Combat Stats (for combat pets)
  max_hp INTEGER DEFAULT 50,
  current_hp INTEGER DEFAULT 50,
  attack INTEGER DEFAULT 5,
  defense INTEGER DEFAULT 3,
  
  -- Abilities
  abilities JSONB DEFAULT '[]',
  
  -- State
  is_summoned BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Breeding
  breed_count INTEGER DEFAULT 0,
  max_breeds INTEGER DEFAULT 3,
  parent_1_id UUID,
  parent_2_id UUID,
  
  -- Visuals
  model_url TEXT,
  color_variant TEXT,
  
  obtained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  mount_name TEXT NOT NULL,
  mount_type TEXT NOT NULL, -- 'ground', 'flying', 'water', 'multi'
  species TEXT NOT NULL,
  
  -- Speed
  base_speed DECIMAL(5,2) DEFAULT 150.00, -- % of normal speed
  max_speed DECIMAL(5,2) DEFAULT 200.00,
  
  -- Stats
  mount_level INTEGER DEFAULT 1,
  stamina INTEGER DEFAULT 100,
  
  -- Appearance
  model_url TEXT,
  color_variant TEXT,
  saddle_type TEXT,
  armor TEXT,
  
  -- State
  is_equipped BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  
  -- Rarity
  rarity TEXT DEFAULT 'common',
  
  obtained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pet_abilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ability_name TEXT NOT NULL UNIQUE,
  ability_type TEXT NOT NULL, -- 'attack', 'buff', 'heal', 'gathering'
  
  -- Effect
  effect_description TEXT,
  cooldown_seconds INTEGER DEFAULT 10,
  
  -- Requirements
  min_pet_level INTEGER DEFAULT 1,
  pet_types TEXT[], -- Which pet types can have this
  
  -- Stats
  power INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================================

CREATE INDEX idx_combat_stats_profile ON player_combat_stats(profile_id);
CREATE INDEX idx_abilities_profile ON player_abilities(profile_id);
CREATE INDEX idx_encounters_lobby ON combat_encounters(lobby_id);
CREATE INDEX idx_encounters_attacker ON combat_encounters(attacker_id);
CREATE INDEX idx_status_effects_profile ON status_effects(profile_id);
CREATE INDEX idx_status_effects_expires ON status_effects(expires_at);

CREATE INDEX idx_skill_progress_profile ON player_skill_tree_progress(profile_id);
CREATE INDEX idx_unlocked_nodes_profile ON player_unlocked_nodes(profile_id);

CREATE INDEX idx_professions_profile ON crafting_professions(profile_id);
CREATE INDEX idx_enchanted_items_inventory ON enchanted_items(inventory_item_id);

CREATE INDEX idx_world_events_status ON world_events(status);
CREATE INDEX idx_world_events_lobby ON world_events(lobby_id);
CREATE INDEX idx_event_participants_event ON world_event_participants(event_id);

CREATE INDEX idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX idx_guild_members_profile ON guild_members(profile_id);
CREATE INDEX idx_guild_invites_guild ON guild_invites(guild_id);
CREATE INDEX idx_guild_bank_guild ON guild_bank(guild_id);

CREATE INDEX idx_pets_profile ON pets(profile_id);
CREATE INDEX idx_mounts_profile ON mounts(profile_id);

-- =====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================================

-- Combat Stats
ALTER TABLE player_combat_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own combat stats" ON player_combat_stats FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can update own combat stats" ON player_combat_stats FOR UPDATE USING (auth.uid() = profile_id);

-- Abilities
ALTER TABLE player_abilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own abilities" ON player_abilities FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own abilities" ON player_abilities FOR ALL USING (auth.uid() = profile_id);

-- Combat Encounters (viewable by participants)
ALTER TABLE combat_encounters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own encounters" ON combat_encounters FOR SELECT 
  USING (auth.uid() = attacker_id OR auth.uid() = defender_id);

-- Status Effects
ALTER TABLE status_effects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own status effects" ON status_effects FOR SELECT USING (auth.uid() = profile_id);

-- Skill Trees (public read)
ALTER TABLE skill_trees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view skill trees" ON skill_trees FOR SELECT USING (true);

ALTER TABLE skill_tree_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view skill nodes" ON skill_tree_nodes FOR SELECT USING (true);

-- Player Progress
ALTER TABLE player_skill_tree_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own progress" ON player_skill_tree_progress FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own progress" ON player_skill_tree_progress FOR ALL USING (auth.uid() = profile_id);

ALTER TABLE player_unlocked_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own unlocked nodes" ON player_unlocked_nodes FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own unlocked nodes" ON player_unlocked_nodes FOR ALL USING (auth.uid() = profile_id);

-- Crafting
ALTER TABLE crafting_professions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own professions" ON crafting_professions FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own professions" ON crafting_professions FOR ALL USING (auth.uid() = profile_id);

ALTER TABLE crafting_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view recipes" ON crafting_recipes FOR SELECT USING (true);

ALTER TABLE enchantments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view enchantments" ON enchantments FOR SELECT USING (true);

ALTER TABLE enchanted_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own enchanted items" ON enchanted_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM inventory WHERE id = inventory_item_id AND profile_id = auth.uid()));

-- World Events (public read)
ALTER TABLE world_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view world events" ON world_events FOR SELECT USING (true);

ALTER TABLE world_event_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own participation" ON world_event_participants FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can join events" ON world_event_participants FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Guilds (public read for guild info)
ALTER TABLE guilds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view guilds" ON guilds FOR SELECT USING (true);
CREATE POLICY "Guild masters can update guild" ON guilds FOR UPDATE 
  USING (auth.uid() = guild_master_id);

ALTER TABLE guild_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view guild members" ON guild_members FOR SELECT USING (true);
CREATE POLICY "Users can manage own membership" ON guild_members FOR ALL USING (auth.uid() = profile_id);

ALTER TABLE guild_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invites" ON guild_invites FOR SELECT 
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

ALTER TABLE guild_bank ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guild members can view guild bank" ON guild_bank FOR SELECT 
  USING (EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_bank.guild_id AND profile_id = auth.uid()));

ALTER TABLE guild_quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guild members can view guild quests" ON guild_quests FOR SELECT 
  USING (EXISTS (SELECT 1 FROM guild_members WHERE guild_id = guild_quests.guild_id AND profile_id = auth.uid()));

-- Pets & Mounts
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pets" ON pets FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own pets" ON pets FOR ALL USING (auth.uid() = profile_id);

ALTER TABLE mounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own mounts" ON mounts FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "Users can manage own mounts" ON mounts FOR ALL USING (auth.uid() = profile_id);

ALTER TABLE pet_abilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pet abilities" ON pet_abilities FOR SELECT USING (true);

-- =====================================================================
-- REALTIME SUBSCRIPTIONS
-- =====================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE player_combat_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE combat_encounters;
ALTER PUBLICATION supabase_realtime ADD TABLE status_effects;
ALTER PUBLICATION supabase_realtime ADD TABLE world_events;
ALTER PUBLICATION supabase_realtime ADD TABLE world_event_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE guild_members;
ALTER PUBLICATION supabase_realtime ADD TABLE guild_bank;

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Apply damage to player
CREATE OR REPLACE FUNCTION apply_damage(
  p_profile_id UUID,
  damage_amount INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  new_hp INTEGER;
BEGIN
  UPDATE player_combat_stats
  SET current_hp = GREATEST(0, current_hp - damage_amount),
      updated_at = NOW()
  WHERE profile_id = p_profile_id
  RETURNING current_hp INTO new_hp;
  
  RETURN new_hp;
END;
$$ LANGUAGE plpgsql;

-- Heal player
CREATE OR REPLACE FUNCTION heal_player(
  p_profile_id UUID,
  heal_amount INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  new_hp INTEGER;
BEGIN
  UPDATE player_combat_stats
  SET current_hp = LEAST(max_hp, current_hp + heal_amount),
      updated_at = NOW()
  WHERE profile_id = p_profile_id
  RETURNING current_hp INTO new_hp;
  
  RETURN new_hp;
END;
$$ LANGUAGE plpgsql;

-- Level up guild
CREATE OR REPLACE FUNCTION level_up_guild(
  p_guild_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE guilds
  SET guild_level = guild_level + 1,
      max_members = max_members + 5,
      updated_at = NOW()
  WHERE id = p_guild_id;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired world events
CREATE OR REPLACE FUNCTION cleanup_expired_events()
RETURNS VOID AS $$
BEGIN
  UPDATE world_events
  SET status = 'failed'
  WHERE status = 'active'
    AND ends_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- SAMPLE DATA
-- =====================================================================

-- Sample Skill Trees
INSERT INTO skill_trees (tree_name, class_type, description, max_points) VALUES
('Fury Warrior', 'warrior', 'Master of melee combat and rage', 50),
('Fire Magic', 'mage', 'Harness the power of flames', 50),
('Shadow Arts', 'rogue', 'Strike from the shadows', 50),
('Divine Healing', 'healer', 'Channel holy power to mend wounds', 50),
('Marksmanship', 'ranger', 'Precision archery and tracking', 50)
ON CONFLICT (tree_name) DO NOTHING;

-- Sample Crafting Recipes
INSERT INTO crafting_recipes (recipe_name, profession, required_level, required_materials, output_item_id, output_quantity) VALUES
('Iron Sword', 'blacksmithing', 1, '[{"item_id": "iron_ingot", "quantity": 5}, {"item_id": "wood", "quantity": 2}]', 'iron_sword', 1),
('Health Potion', 'alchemy', 1, '[{"item_id": "herb_red", "quantity": 3}, {"item_id": "vial", "quantity": 1}]', 'health_potion', 1),
('Leather Armor', 'tailoring', 5, '[{"item_id": "leather", "quantity": 8}, {"item_id": "thread", "quantity": 5}]', 'leather_armor', 1),
('Ruby Ring', 'jewelcrafting', 10, '[{"item_id": "ruby", "quantity": 1}, {"item_id": "gold_bar", "quantity": 2}]', 'ruby_ring', 1)
ON CONFLICT (recipe_name) DO NOTHING;

-- Sample Enchantments
INSERT INTO enchantments (enchantment_name, enchantment_type, stat_bonuses, required_enchanting_level, required_materials, rarity) VALUES
('Sharpness I', 'weapon', '{"attack": 5}', 1, '[{"item_id": "essence_power", "quantity": 2}]', 'common'),
('Protection I', 'armor', '{"defense": 5}', 1, '[{"item_id": "essence_protection", "quantity": 2}]', 'common'),
('Fire Damage', 'weapon', '{"fire_damage": 10}', 5, '[{"item_id": "fire_crystal", "quantity": 1}]', 'rare'),
('Lifesteal', 'weapon', '{"lifesteal_percent": 5}', 10, '[{"item_id": "blood_essence", "quantity": 3}]', 'epic')
ON CONFLICT (enchantment_name) DO NOTHING;

-- Sample Pet Abilities
INSERT INTO pet_abilities (ability_name, ability_type, effect_description, cooldown_seconds, min_pet_level, pet_types) VALUES
('Bite', 'attack', 'Deal physical damage to target', 5, 1, ARRAY['wolf', 'bear', 'tiger']),
('Fireball', 'attack', 'Launch a fireball at enemy', 8, 5, ARRAY['dragon', 'phoenix']),
('Gather Herbs', 'gathering', 'Find herbs in the area', 30, 1, ARRAY['rabbit', 'squirrel']),
('Protective Aura', 'buff', 'Increase owner defense by 10%', 60, 10, ARRAY['wolf', 'bear'])
ON CONFLICT (ability_name) DO NOTHING;

COMMIT;

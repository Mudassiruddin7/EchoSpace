// =====================================================================
// PHASE 3 TYPES - Advanced Gameplay Systems
// =====================================================================

// =====================================================================
// COMBAT SYSTEM
// =====================================================================

export interface PlayerCombatStats {
  id: string;
  profile_id: string;
  
  // Primary Stats
  max_hp: number;
  current_hp: number;
  max_mana: number;
  current_mana: number;
  
  // Combat Stats
  attack_power: number;
  defense: number;
  magic_power: number;
  magic_resistance: number;
  critical_chance: number;
  critical_damage: number;
  dodge_chance: number;
  block_chance: number;
  
  // Combat State
  in_combat: boolean;
  combat_target_id: string | null;
  last_combat_action: string | null;
  
  updated_at: string;
}

export interface PlayerAbility {
  id: string;
  profile_id: string;
  ability_id: string;
  ability_name: string;
  ability_type: 'active' | 'passive' | 'ultimate';
  damage_type: 'physical' | 'magical' | 'true' | null;
  
  // Ability Stats
  ability_level: number;
  max_level: number;
  cooldown_seconds: number;
  mana_cost: number;
  damage_multiplier: number;
  
  // Status
  last_used: string | null;
  times_used: number;
  
  // Metadata
  description: string | null;
  icon: string | null;
  unlock_level: number;
  
  created_at: string;
  updated_at: string;
}

export interface CombatEncounter {
  id: string;
  lobby_id: string;
  
  // Participants
  attacker_id: string;
  defender_id: string | null;
  defender_type: 'player' | 'npc' | 'boss' | 'creature';
  defender_name: string | null;
  
  // Combat Data
  encounter_type: 'pvp' | 'pve' | 'boss' | 'world_event';
  winner_id: string | null;
  total_damage_dealt: number;
  total_damage_taken: number;
  abilities_used: Array<{
    ability_id: string;
    timestamp: string;
    damage: number;
  }>;
  
  // Duration
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  
  // Rewards
  experience_gained: number;
  gold_gained: number;
  items_dropped: Array<{
    item_id: string;
    quantity: number;
  }>;
}

export interface StatusEffect {
  id: string;
  profile_id: string;
  
  effect_name: string;
  effect_type: 'buff' | 'debuff' | 'dot' | 'hot';
  effect_source: string | null;
  
  // Effect Properties
  stat_affected: string | null;
  modifier_value: number | null;
  modifier_type: 'flat' | 'percentage';
  
  // Duration
  duration_seconds: number | null;
  applied_at: string;
  expires_at: string | null;
  
  // Stack Info
  stacks: number;
  max_stacks: number;
  
  // Visuals
  icon: string | null;
  description: string | null;
}

// =====================================================================
// SKILL TREE & TALENTS
// =====================================================================

export interface SkillTree {
  id: string;
  tree_name: string;
  class_type: 'warrior' | 'mage' | 'rogue' | 'healer' | 'ranger';
  description: string | null;
  icon: string | null;
  background_image: string | null;
  max_points: number;
  created_at: string;
}

export interface SkillTreeNode {
  id: string;
  tree_id: string;
  
  node_name: string;
  node_type: 'active_skill' | 'passive_bonus' | 'keystone';
  tier: number;
  position_x: number | null;
  position_y: number | null;
  
  // Requirements
  required_points_in_tree: number;
  required_level: number;
  parent_nodes: string[];
  
  // Effects
  max_ranks: number;
  effects: {
    stat_bonuses?: Record<string, number>;
    abilities_granted?: string[];
    [key: string]: any;
  };
  
  // Visuals
  icon: string | null;
  description: string | null;
  
  created_at: string;
}

export interface PlayerSkillTreeProgress {
  id: string;
  profile_id: string;
  tree_id: string;
  
  total_points_spent: number;
  available_points: number;
  
  created_at: string;
  updated_at: string;
}

export interface PlayerUnlockedNode {
  id: string;
  profile_id: string;
  node_id: string;
  
  current_rank: number;
  unlocked_at: string;
}

// =====================================================================
// CRAFTING & ENCHANTING
// =====================================================================

export interface CraftingProfession {
  id: string;
  profile_id: string;
  
  profession_name: 'blacksmithing' | 'alchemy' | 'enchanting' | 'tailoring' | 'jewelcrafting';
  profession_level: number;
  profession_experience: number;
  
  // Unlocks
  recipes_discovered: string[];
  specialization: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface CraftingRecipe {
  id: string;
  recipe_name: string;
  profession: string;
  
  // Requirements
  required_level: number;
  difficulty: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  
  // Materials
  required_materials: Array<{
    item_id: string;
    quantity: number;
  }>;
  output_item_id: string;
  output_quantity: number;
  
  // Crafting Info
  crafting_time_seconds: number;
  success_rate: number;
  
  // Discovery
  is_discoverable: boolean;
  discovery_method: string | null;
  
  created_at: string;
}

export interface Enchantment {
  id: string;
  enchantment_name: string;
  enchantment_type: 'weapon' | 'armor' | 'accessory';
  
  // Effects
  stat_bonuses: Record<string, number>;
  special_effects: Record<string, any> | null;
  
  // Requirements
  required_enchanting_level: number;
  required_materials: Array<{
    item_id: string;
    quantity: number;
  }>;
  
  // Rarity
  rarity: string;
  glow_color: string | null;
  particle_effect: string | null;
  
  created_at: string;
}

export interface EnchantedItem {
  id: string;
  inventory_item_id: string;
  enchantment_id: string;
  
  enchantment_level: number;
  applied_at: string;
  applied_by: string | null;
}

// =====================================================================
// DYNAMIC WORLD EVENTS
// =====================================================================

export interface WorldEvent {
  id: string;
  event_name: string;
  event_type: 'boss_spawn' | 'treasure_hunt' | 'invasion' | 'celebration';
  
  // Location
  lobby_id: string | null;
  spawn_location: {
    x: number;
    y: number;
    z: number;
  } | null;
  
  // Status
  status: 'scheduled' | 'active' | 'completed' | 'failed';
  
  // Timing
  scheduled_start: string | null;
  actual_start: string | null;
  duration_minutes: number;
  ends_at: string | null;
  
  // Participation
  min_players: number;
  max_players: number;
  current_participants: number;
  
  // Rewards
  base_rewards: {
    xp?: number;
    gold?: number;
    items?: string[];
  } | null;
  bonus_rewards: any;
  
  // Event Data
  event_data: any;
  
  created_at: string;
}

export interface WorldEventParticipant {
  id: string;
  event_id: string;
  profile_id: string;
  
  contribution_score: number;
  damage_dealt: number;
  healing_done: number;
  
  joined_at: string;
  rewards_claimed: boolean;
  rewards_received: any;
}

// =====================================================================
// GUILD SYSTEM
// =====================================================================

export interface Guild {
  id: string;
  guild_name: string;
  guild_tag: string | null;
  
  // Leadership
  guild_master_id: string;
  
  // Info
  description: string | null;
  motto: string | null;
  guild_icon: string | null;
  guild_banner: string | null;
  
  // Settings
  is_recruiting: boolean;
  min_level_requirement: number;
  join_type: 'open' | 'request' | 'invite_only';
  
  // Stats
  guild_level: number;
  guild_experience: number;
  total_members: number;
  max_members: number;
  
  // Resources
  guild_gold: number;
  
  created_at: string;
  updated_at: string;
}

export interface GuildMember {
  id: string;
  guild_id: string;
  profile_id: string;
  
  guild_rank: 'guild_master' | 'officer' | 'veteran' | 'member' | 'recruit';
  
  // Contribution
  contribution_points: number;
  gold_donated: number;
  
  // Permissions
  can_invite: boolean;
  can_kick: boolean;
  can_promote: boolean;
  can_withdraw_gold: boolean;
  
  joined_at: string;
  last_online: string;
}

export interface GuildInvite {
  id: string;
  guild_id: string;
  inviter_id: string;
  invitee_id: string;
  
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message: string | null;
  
  created_at: string;
  expires_at: string;
  responded_at: string | null;
}

export interface GuildBankItem {
  id: string;
  guild_id: string;
  
  item_id: string;
  item_name: string;
  item_type: string | null;
  quantity: number;
  
  deposited_by: string | null;
  deposited_at: string;
  
  // Permissions
  required_rank: string;
  daily_withdraw_limit: number | null;
}

export interface GuildQuest {
  id: string;
  guild_id: string;
  
  quest_name: string;
  quest_type: 'daily' | 'weekly' | 'epic';
  description: string | null;
  
  // Objectives
  objectives: Array<{
    type: string;
    target: string;
    count: number;
    progress: number;
  }>;
  
  // Rewards
  rewards: {
    guild_xp?: number;
    gold?: number;
    [key: string]: any;
  } | null;
  
  // Status
  status: 'active' | 'completed' | 'expired';
  
  started_at: string;
  expires_at: string | null;
  completed_at: string | null;
}

// =====================================================================
// PET & MOUNT SYSTEM
// =====================================================================

export interface Pet {
  id: string;
  profile_id: string;
  
  pet_name: string;
  pet_type: 'combat' | 'gathering' | 'companion';
  species: string;
  
  // Stats
  pet_level: number;
  pet_experience: number;
  rarity: string;
  
  // Combat Stats
  max_hp: number;
  current_hp: number;
  attack: number;
  defense: number;
  
  // Abilities
  abilities: string[];
  
  // State
  is_summoned: boolean;
  is_favorite: boolean;
  
  // Breeding
  breed_count: number;
  max_breeds: number;
  parent_1_id: string | null;
  parent_2_id: string | null;
  
  // Visuals
  model_url: string | null;
  color_variant: string | null;
  
  obtained_at: string;
}

export interface Mount {
  id: string;
  profile_id: string;
  
  mount_name: string;
  mount_type: 'ground' | 'flying' | 'water' | 'multi';
  species: string;
  
  // Speed
  base_speed: number;
  max_speed: number;
  
  // Stats
  mount_level: number;
  stamina: number;
  
  // Appearance
  model_url: string | null;
  color_variant: string | null;
  saddle_type: string | null;
  armor: string | null;
  
  // State
  is_equipped: boolean;
  is_favorite: boolean;
  
  // Rarity
  rarity: string;
  
  obtained_at: string;
}

export interface PetAbility {
  id: string;
  ability_name: string;
  ability_type: 'attack' | 'buff' | 'heal' | 'gathering';
  
  // Effect
  effect_description: string | null;
  cooldown_seconds: number;
  
  // Requirements
  min_pet_level: number;
  pet_types: string[];
  
  // Stats
  power: number | null;
  
  created_at: string;
}

// =====================================================================
// UI HELPER TYPES
// =====================================================================

export interface CombatAction {
  action_type: 'attack' | 'ability' | 'item' | 'defend';
  ability_id?: string;
  target_id?: string;
  timestamp: number;
}

export interface CraftingProgress {
  recipe_id: string;
  progress: number;
  total_time: number;
  started_at: number;
}

export interface ActiveWorldEvent extends WorldEvent {
  participants: WorldEventParticipant[];
  time_remaining: number;
}

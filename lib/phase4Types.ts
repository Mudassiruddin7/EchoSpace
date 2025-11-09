// =====================================================================
// PHASE 4: IMMERSIVE EXPERIENCE SYSTEMS - TypeScript Types
// =====================================================================

// =====================================================================
// 1. ADVANCED AI NPC SYSTEM
// =====================================================================

export interface NPCCharacter {
  id: string;
  npc_name: string;
  npc_type: 'merchant' | 'quest_giver' | 'trainer' | 'companion' | 'enemy';
  
  // Personality
  personality_traits: {
    friendliness: number; // 0-10
    humor: number; // 0-10
    aggression: number; // 0-10
    wisdom: number; // 0-10
  };
  background_story?: string;
  occupation?: string;
  faction?: string;
  
  // Dialogue
  greeting_messages: string[];
  farewell_messages: string[];
  idle_dialogues: string[];
  
  // AI Behavior
  behavior_pattern: 'friendly' | 'neutral' | 'hostile' | 'mysterious';
  interaction_cooldown: number; // seconds
  
  // Appearance
  model_url?: string;
  voice_profile?: string;
  animation_set?: string;
  
  // Location
  spawn_locations?: Array<{
    lobby: string;
    x: number;
    y: number;
    z: number;
  }>;
  roam_radius: number;
  
  // Stats
  npc_level: number;
  max_hp: number;
  
  created_at: string;
  updated_at: string;
}

export interface NPCDialogueOption {
  id: string;
  npc_id: string;
  
  trigger_condition?: string;
  player_option: string;
  npc_response: string;
  
  // Requirements
  required_relationship?: number;
  required_quest_id?: string;
  required_item_id?: string;
  
  // Consequences
  relationship_change: number;
  triggers_quest_id?: string;
  gives_item_id?: string;
  
  priority: number;
  created_at: string;
}

export interface NPCQuestGenerated {
  id: string;
  npc_id: string;
  
  quest_title: string;
  quest_description: string;
  quest_type: 'fetch' | 'kill' | 'escort' | 'explore' | 'craft';
  
  objectives: any; // Quest-specific objectives
  
  // Rewards
  experience_reward: number;
  gold_reward: number;
  item_rewards?: any;
  reputation_reward: number;
  
  // Conditions
  min_player_level: number;
  max_accepts?: number;
  current_accepts: number;
  
  // Status
  is_active: boolean;
  expires_at?: string;
  
  created_at: string;
}

// =====================================================================
// 2. ENHANCED VOICE FEATURES
// =====================================================================

export interface VoiceChannel {
  id: string;
  channel_name: string;
  channel_type: 'global' | 'party' | 'guild' | 'proximity' | 'private';
  
  // Settings
  max_participants: number;
  current_participants: number;
  is_proximity_based: boolean;
  proximity_radius?: number;
  
  // Permissions
  is_public: boolean;
  password_hash?: string;
  allowed_profiles?: string[];
  banned_profiles?: string[];
  
  created_by?: string;
  created_at: string;
}

export interface VoiceParticipant {
  id: string;
  channel_id: string;
  profile_id: string;
  
  // State
  is_muted: boolean;
  is_deafened: boolean;
  is_speaking: boolean;
  
  // Position (for proximity chat)
  position_x?: number;
  position_y?: number;
  position_z?: number;
  
  // Quality
  audio_quality: 'low' | 'medium' | 'high';
  
  joined_at: string;
  last_spoke?: string;
}

export interface VoiceCommand {
  id: string;
  command_phrase: string;
  command_action: string;
  command_parameters?: any;
  
  required_level: number;
  enabled: boolean;
  created_at: string;
}

// =====================================================================
// 3. ACHIEVEMENT & PROGRESSION SYSTEM
// =====================================================================

export interface AchievementCatalog {
  id: string;
  achievement_id: string;
  achievement_name: string;
  achievement_description: string;
  
  category: 'combat' | 'exploration' | 'social' | 'crafting' | 'collection';
  
  requirement_type: 'count' | 'comparison' | 'collection' | 'sequence';
  requirement_data: any;
  
  // Rewards
  points: number;
  title_reward?: string;
  item_reward?: string;
  gold_reward: number;
  
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  
  icon?: string;
  hidden: boolean;
  
  created_at: string;
}

export interface PlayerAchievement {
  id: string;
  profile_id: string;
  achievement_id: string;
  
  progress: number;
  target: number;
  completed: boolean;
  
  unlocked_at?: string;
}

export interface DailyChallenge {
  id: string;
  challenge_date: string;
  
  challenge_title: string;
  challenge_description: string;
  challenge_type: string;
  
  objective_data: any;
  
  // Rewards
  experience_reward: number;
  gold_reward: number;
  bonus_rewards?: any;
  
  difficulty: 'easy' | 'normal' | 'hard' | 'extreme';
  
  expires_at: string;
}

export interface PlayerDailyProgress {
  id: string;
  profile_id: string;
  challenge_id: string;
  
  progress: number;
  completed: boolean;
  claimed: boolean;
  
  completed_at?: string;
}

export interface GlobalLeaderboard {
  id: string;
  leaderboard_type: 'level' | 'pvp_rating' | 'guild_level' | 'wealth' | 'achievements';
  profile_id: string;
  
  score: number;
  rank?: number;
  
  additional_data?: any;
  updated_at: string;
}

// =====================================================================
// 4. PLAYER HOUSING SYSTEM
// =====================================================================

export interface PlayerHouse {
  id: string;
  profile_id: string;
  
  house_name: string;
  house_type: 'cottage' | 'mansion' | 'castle' | 'apartment' | 'island';
  house_tier: number;
  
  // Location
  district?: string;
  plot_number?: number;
  
  // Settings
  is_public: boolean;
  allow_visitors: boolean;
  visitor_permissions: {
    can_interact: boolean;
    can_trade: boolean;
  };
  
  // Stats
  capacity: number;
  current_items: number;
  decoration_score: number;
  
  // Customization
  theme: string;
  exterior_color?: string;
  interior_style?: string;
  
  purchased_at: string;
  last_visited: string;
}

export interface FurnitureCatalog {
  id: string;
  furniture_id: string;
  furniture_name: string;
  furniture_type: 'chair' | 'table' | 'bed' | 'decoration' | 'storage' | 'functional';
  
  size_category: 'small' | 'medium' | 'large';
  is_interactive: boolean;
  interaction_type?: 'sit' | 'sleep' | 'storage' | 'craft';
  
  // Requirements
  required_level: number;
  required_gold: number;
  required_materials?: any;
  
  // Display
  model_url?: string;
  thumbnail_url?: string;
  color_variants?: string[];
  
  // Stats
  decoration_points: number;
  rarity: string;
  
  created_at: string;
}

export interface PlacedFurniture {
  id: string;
  house_id: string;
  furniture_id: string;
  
  // Position
  position_x: number;
  position_y: number;
  position_z: number;
  
  // Rotation
  rotation_x: number;
  rotation_y: number;
  rotation_z: number;
  
  // Scale
  scale_x: number;
  scale_y: number;
  scale_z: number;
  
  // Customization
  color_variant?: string;
  custom_name?: string;
  
  placed_at: string;
}

export interface HouseVisitor {
  id: string;
  house_id: string;
  visitor_id: string;
  
  visit_count: number;
  last_visit: string;
  total_time_spent: number;
  
  left_comment?: string;
  rating?: number; // 1-5
}

// =====================================================================
// 5. PVP ARENA & TOURNAMENTS
// =====================================================================

export interface PvPArena {
  id: string;
  arena_name: string;
  arena_type: '1v1' | '2v2' | '3v3' | '5v5' | 'free_for_all';
  
  max_players: number;
  min_players: number;
  map_name?: string;
  
  rules?: any;
  
  winner_rewards?: any;
  participation_rewards?: any;
  
  is_active: boolean;
  created_at: string;
}

export interface PvPMatch {
  id: string;
  arena_id: string;
  
  match_type: 'ranked' | 'casual' | 'tournament';
  
  team_a_profiles?: string[];
  team_b_profiles?: string[];
  
  winner_team?: 'team_a' | 'team_b' | 'draw';
  team_a_score: number;
  team_b_score: number;
  
  match_stats?: any;
  
  started_at: string;
  ended_at?: string;
  duration_seconds?: number;
  
  rewards_claimed: boolean;
}

export interface PvPRating {
  id: string;
  profile_id: string;
  
  rating: number;
  peak_rating: number;
  
  total_matches: number;
  wins: number;
  losses: number;
  draws: number;
  
  current_win_streak: number;
  best_win_streak: number;
  
  season_id?: string;
  rank_tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';
  
  updated_at: string;
}

export interface Tournament {
  id: string;
  tournament_name: string;
  tournament_type: 'single_elimination' | 'double_elimination' | 'round_robin';
  
  max_participants: number;
  entry_fee: number;
  
  prize_pool_gold: number;
  prize_pool_items?: any;
  prize_distribution?: any;
  
  registration_start?: string;
  registration_end?: string;
  tournament_start?: string;
  
  status: 'registration' | 'in_progress' | 'completed' | 'cancelled';
  current_round: number;
  
  registered_profiles?: string[];
  
  created_at: string;
}

// =====================================================================
// 6. DYNAMIC WORLD ENVIRONMENT
// =====================================================================

export interface WeatherPattern {
  id: string;
  weather_type: 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'snowy' | 'foggy';
  
  visibility_modifier: number;
  movement_speed_modifier: number;
  combat_modifiers?: any;
  
  particle_effects?: string[];
  sky_color?: string;
  ambient_sounds?: string[];
  
  occurrence_weight: number;
  created_at: string;
}

export interface ActiveWeather {
  id: string;
  lobby_code: string;
  
  current_weather: string;
  weather_intensity: number;
  
  started_at: string;
  ends_at?: string;
  
  transitioning_to?: string;
  transition_progress: number;
  
  updated_at: string;
}

export interface TimeOfDaySettings {
  id: string;
  lobby_code: string;
  
  time_minutes: number; // Minutes since midnight
  time_speed: number;
  
  ambient_light_color?: string;
  directional_light_intensity: number;
  shadow_strength: number;
  
  sky_gradient?: any;
  
  updated_at: string;
}

export interface SeasonalEvent {
  id: string;
  event_name: string;
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'special';
  
  start_date: string;
  end_date: string;
  
  world_decorations?: any;
  special_npcs?: string[];
  exclusive_items?: string[];
  event_quests?: string[];
  
  participation_rewards?: any;
  
  is_active: boolean;
  created_at: string;
}

export interface DynamicLightingZone {
  id: string;
  zone_name: string;
  lobby_code: string;
  
  center_x: number;
  center_y: number;
  center_z: number;
  radius: number;
  
  light_type: 'point' | 'spot' | 'directional' | 'ambient';
  light_color?: string;
  light_intensity: number;
  
  is_dynamic: boolean;
  flicker_enabled: boolean;
  pulse_enabled: boolean;
  
  cast_shadows: boolean;
  created_at: string;
}

// =====================================================================
// HELPER TYPES
// =====================================================================

export interface NPCInteraction {
  npc: NPCCharacter;
  availableDialogues: NPCDialogueOption[];
  availableQuests: NPCQuestGenerated[];
  relationshipLevel: number;
}

export interface AchievementProgress {
  achievement: AchievementCatalog;
  playerProgress: PlayerAchievement;
  percentComplete: number;
}

export interface HouseData {
  house: PlayerHouse;
  furniture: PlacedFurniture[];
  furnitureCatalog: FurnitureCatalog[];
  recentVisitors: HouseVisitor[];
}

export interface PvPMatchmaking {
  arena: PvPArena;
  queue: string[]; // profile_ids
  estimatedWaitTime: number;
}

export interface EnvironmentState {
  weather: ActiveWeather;
  timeOfDay: TimeOfDaySettings;
  activeEvents: SeasonalEvent[];
  lightingZones: DynamicLightingZone[];
}

export interface VoiceSession {
  channel: VoiceChannel;
  participants: VoiceParticipant[];
  myParticipation?: VoiceParticipant;
}

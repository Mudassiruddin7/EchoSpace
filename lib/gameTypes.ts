// =====================================================================
// GAME TYPES - Inventory, Stats, Quests, Achievements
// =====================================================================

export interface PlayerStats {
  id: string;
  profile_id: string;
  level: number;
  current_xp: number;
  xp_to_next_level: number;
  health: number;
  max_health: number;
  mana: number;
  max_mana: number;
  strength: number;
  intelligence: number;
  charisma: number;
  defense: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  profile_id: string;
  item_id: string;
  item_name: string;
  item_type: 'weapon' | 'armor' | 'consumable' | 'quest_item' | 'cosmetic';
  item_rarity: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  equipped: boolean;
  slot_position: number | null;
  metadata?: {
    damage?: number;
    defense?: number;
    icon?: string;
    description?: string;
    [key: string]: any;
  };
  acquired_at: string;
}

export interface QuestObjective {
  id: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface Quest {
  id: string;
  quest_id: string;
  title: string;
  description: string;
  quest_type: 'main' | 'side' | 'daily' | 'repeatable';
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  objectives: QuestObjective[];
  rewards: {
    xp?: number;
    items?: string[];
    gold?: number;
  };
  required_level: number;
  npc_giver: string | null;
  created_at: string;
}

export interface PlayerQuest {
  id: string;
  profile_id: string;
  quest_id: string;
  status: 'active' | 'completed' | 'failed' | 'abandoned';
  progress: QuestObjective[];
  started_at: string;
  completed_at: string | null;
  quest?: Quest; // Joined data
}

export interface Achievement {
  id: string;
  achievement_id: string;
  title: string;
  description: string;
  icon: string | null;
  points: number;
  requirement: {
    type: string;
    value: number;
  };
  reward: {
    xp?: number;
    items?: string[];
    title?: string;
  };
  created_at: string;
}

export interface PlayerAchievement {
  id: string;
  profile_id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement; // Joined data
}

export interface LeaderboardEntry {
  id: string;
  profile_id: string;
  category: 'xp' | 'quests_completed' | 'time_played' | 'achievements';
  score: number;
  rank: number | null;
  season: string;
  updated_at: string;
  profile?: {
    username: string;
    selected_avatar_model: string;
  };
}

// Item catalog types
export interface ItemDefinition {
  item_id: string;
  name: string;
  type: InventoryItem['item_type'];
  rarity: InventoryItem['item_rarity'];
  description: string;
  icon: string;
  stats?: {
    damage?: number;
    defense?: number;
    health?: number;
    mana?: number;
  };
  usable?: boolean;
  stackable?: boolean;
  max_stack?: number;
}

// Emote types
export interface Emote {
  id: string;
  name: string;
  icon: string;
  animation: string; // Path to animation file
  duration: number; // In seconds
  category: 'gesture' | 'dance' | 'action' | 'reaction';
}

// HUD types
export interface HUDNotification {
  id: string;
  type: 'xp_gain' | 'quest_update' | 'achievement' | 'item_acquired' | 'level_up';
  message: string;
  icon?: string;
  duration?: number; // milliseconds
}

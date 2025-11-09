// =====================================================================
// PHASE 2 TYPES - Social Systems
// =====================================================================

export interface Party {
  id: string;
  party_name: string | null;
  leader_profile_id: string;
  lobby_id: string;
  max_members: number;
  is_public: boolean;
  party_settings: {
    loot_distribution: 'round_robin' | 'need_before_greed' | 'leader_decides';
    xp_sharing: boolean;
    allow_join_requests: boolean;
    voice_chat_required: boolean;
  };
  created_at: string;
  disbanded_at: string | null;
}

export interface PartyMember {
  id: string;
  party_id: string;
  profile_id: string;
  role: 'leader' | 'officer' | 'member';
  joined_at: string;
  contribution_score: number;
  profile?: {
    username: string;
    selected_avatar_model: string;
  };
}

export interface PartyInvite {
  id: string;
  party_id: string;
  sender_profile_id: string;
  invitee_profile_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  message: string | null;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  party?: Party;
  sender?: {
    username: string;
  };
}

export interface Friend {
  id: string;
  profile_id: string;
  friend_profile_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  friendship_level: number;
  last_interaction: string;
  created_at: string;
  friend?: {
    username: string;
    selected_avatar_model: string;
    last_seen: string;
  };
}

export interface TradeOffer {
  id: string;
  initiator_profile_id: string;
  recipient_profile_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  initiator_items: Array<{ item_id: string; quantity: number }>;
  recipient_items: Array<{ item_id: string; quantity: number }>;
  initiator_gold: number;
  recipient_gold: number;
  initiator_confirmed: boolean;
  recipient_confirmed: boolean;
  created_at: string;
  expires_at: string;
  completed_at: string | null;
}

export interface PlayerTitle {
  id: string;
  profile_id: string;
  title_id: string;
  title_name: string;
  title_description: string | null;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  color: string;
  icon: string | null;
  unlocked_at: string;
  is_equipped: boolean;
}

export interface NPCMemory {
  id: string;
  npc_id: string;
  lobby_id: string;
  profile_id: string;
  memory_type: 'conversation' | 'interaction' | 'quest' | 'gift';
  content: {
    summary?: string;
    keywords?: string[];
    emotions?: string[];
    [key: string]: any;
  };
  sentiment: number; // -1.0 to 1.0
  importance: number; // 1-10
  created_at: string;
  last_referenced: string;
}

export interface NPCRelationship {
  id: string;
  npc_id: string;
  profile_id: string;
  relationship_level: number; // -100 to 100
  friendship_points: number;
  total_conversations: number;
  total_gifts_given: number;
  quests_completed_together: number;
  last_interaction: string;
  relationship_status: 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'rival' | 'enemy';
}

export interface PlayerReputation {
  id: string;
  profile_id: string;
  faction: string;
  reputation_points: number;
  rank: string;
  perks: string[];
  last_updated: string;
}

// Social UI types
export interface PartyListItem extends Party {
  member_count: number;
  members: PartyMember[];
}

export interface OnlineStatus {
  profile_id: string;
  is_online: boolean;
  last_seen: string;
  current_lobby?: string;
}

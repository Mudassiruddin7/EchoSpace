// =====================================================================
// GAME STORE - Zustand store for gameplay systems
// =====================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PlayerStats,
  InventoryItem,
  PlayerQuest,
  PlayerAchievement,
  HUDNotification,
  Emote
} from './gameTypes';

interface GameState {
  // Player Stats
  playerStats: PlayerStats | null;
  setPlayerStats: (stats: PlayerStats) => void;
  updatePlayerStats: (updates: Partial<PlayerStats>) => void;

  // Inventory
  inventory: InventoryItem[];
  setInventory: (items: InventoryItem[]) => void;
  addInventoryItem: (item: InventoryItem) => void;
  removeInventoryItem: (itemId: string) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;

  // Quests
  activeQuests: PlayerQuest[];
  completedQuests: PlayerQuest[];
  setActiveQuests: (quests: PlayerQuest[]) => void;
  setCompletedQuests: (quests: PlayerQuest[]) => void;
  updateQuestProgress: (questId: string, objectiveId: string, progress: number) => void;

  // Achievements
  unlockedAchievements: PlayerAchievement[];
  setUnlockedAchievements: (achievements: PlayerAchievement[]) => void;
  unlockAchievement: (achievement: PlayerAchievement) => void;

  // HUD
  notifications: HUDNotification[];
  addNotification: (notification: Omit<HUDNotification, 'id'>) => void;
  removeNotification: (id: string) => void;

  // UI State
  showInventory: boolean;
  showQuestLog: boolean;
  showMap: boolean;
  showStats: boolean;
  showEmoteWheel: boolean;
  toggleInventory: () => void;
  toggleQuestLog: () => void;
  toggleMap: () => void;
  toggleStats: () => void;
  setShowEmoteWheel: (show: boolean) => void;

  // Emotes
  availableEmotes: Emote[];
  setAvailableEmotes: (emotes: Emote[]) => void;
  performEmote: (emoteId: string) => void;
  currentEmote: string | null;
  setCurrentEmote: (emoteId: string | null) => void;

  // Social - Phase 2
  showPartyPanel: boolean;
  showFriendsList: boolean;
  showTradeWindow: boolean;
  togglePartyPanel: () => void;
  toggleFriendsList: () => void;
  toggleTradeWindow: () => void;
  currentPartyId: string | null;
  setCurrentPartyId: (partyId: string | null) => void;
  pendingPartyInvites: number;
  setPendingPartyInvites: (count: number) => void;
  pendingTradeOffer: string | null;
  setPendingTradeOffer: (offerId: string | null) => void;

  // Phase 3 - Advanced Gameplay
  showCombatHUD: boolean;
  showGuildPanel: boolean;
  toggleCombatHUD: () => void;
  toggleGuildPanel: () => void;

  // Phase 4 - Immersive Experience
  showNPCDialogue: boolean;
  showAchievements: boolean;
  showHousing: boolean;
  showPvPArena: boolean;
  toggleNPCDialogue: () => void;
  toggleAchievements: () => void;
  toggleHousing: () => void;
  togglePvPArena: () => void;
  selectedNPCId: string | null;
  setSelectedNPCId: (npcId: string | null) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // Player Stats
      playerStats: null,
      setPlayerStats: (stats) => set({ playerStats: stats }),
      updatePlayerStats: (updates) => set((state) => ({
        playerStats: state.playerStats ? { ...state.playerStats, ...updates } : null
      })),

      // Inventory
      inventory: [],
      setInventory: (items) => set({ inventory: items }),
      addInventoryItem: (item) => set((state) => ({
        inventory: [...state.inventory, item]
      })),
      removeInventoryItem: (itemId) => set((state) => ({
        inventory: state.inventory.filter(item => item.id !== itemId)
      })),
      equipItem: (itemId) => set((state) => ({
        inventory: state.inventory.map(item =>
          item.id === itemId ? { ...item, equipped: true } : item
        )
      })),
      unequipItem: (itemId) => set((state) => ({
        inventory: state.inventory.map(item =>
          item.id === itemId ? { ...item, equipped: false } : item
        )
      })),

      // Quests
      activeQuests: [],
      completedQuests: [],
      setActiveQuests: (quests) => set({ activeQuests: quests }),
      setCompletedQuests: (quests) => set({ completedQuests: quests }),
      updateQuestProgress: (questId, objectiveId, progress) => set((state) => ({
        activeQuests: state.activeQuests.map(quest =>
          quest.quest_id === questId
            ? {
                ...quest,
                progress: quest.progress.map(obj =>
                  obj.id === objectiveId
                    ? { ...obj, current: progress, completed: progress >= obj.target }
                    : obj
                )
              }
            : quest
        )
      })),

      // Achievements
      unlockedAchievements: [],
      setUnlockedAchievements: (achievements) => set({ unlockedAchievements: achievements }),
      unlockAchievement: (achievement) => set((state) => ({
        unlockedAchievements: [...state.unlockedAchievements, achievement]
      })),

      // HUD
      notifications: [],
      addNotification: (notification) => {
        const id = `notif_${Date.now()}_${Math.random()}`;
        const newNotif = { ...notification, id };
        set((state) => ({
          notifications: [...state.notifications, newNotif]
        }));
        // Auto-remove after duration
        setTimeout(() => {
          get().removeNotification(id);
        }, notification.duration || 3000);
      },
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),

      // UI State
      showInventory: false,
      showQuestLog: false,
      showMap: false,
      showStats: false,
      showEmoteWheel: false,
      toggleInventory: () => set((state) => ({ showInventory: !state.showInventory })),
      toggleQuestLog: () => set((state) => ({ showQuestLog: !state.showQuestLog })),
      toggleMap: () => set((state) => ({ showMap: !state.showMap })),
      toggleStats: () => set((state) => ({ showStats: !state.showStats })),
      setShowEmoteWheel: (show) => set({ showEmoteWheel: show }),

      // Emotes
      availableEmotes: [],
      setAvailableEmotes: (emotes) => set({ availableEmotes: emotes }),
      currentEmote: null,
      setCurrentEmote: (emoteId) => set({ currentEmote: emoteId }),
      performEmote: (emoteId) => {
        const emote = get().availableEmotes.find(e => e.id === emoteId);
        if (emote) {
          set({ currentEmote: emoteId });
          setTimeout(() => {
            if (get().currentEmote === emoteId) {
              set({ currentEmote: null });
            }
          }, emote.duration * 1000);
        }
      },

      // Social - Phase 2
      showPartyPanel: false,
      showFriendsList: false,
      showTradeWindow: false,
      togglePartyPanel: () => set((state) => ({ showPartyPanel: !state.showPartyPanel })),
      toggleFriendsList: () => set((state) => ({ showFriendsList: !state.showFriendsList })),
      toggleTradeWindow: () => set((state) => ({ showTradeWindow: !state.showTradeWindow })),
      currentPartyId: null,
      setCurrentPartyId: (partyId) => set({ currentPartyId: partyId }),
      pendingPartyInvites: 0,
      setPendingPartyInvites: (count) => set({ pendingPartyInvites: count }),
      pendingTradeOffer: null,
      setPendingTradeOffer: (offerId) => set({ pendingTradeOffer: offerId }),

      // Phase 3 - Advanced Gameplay
      showCombatHUD: true,
      showGuildPanel: false,
      toggleCombatHUD: () => set((state) => ({ showCombatHUD: !state.showCombatHUD })),
      toggleGuildPanel: () => set((state) => ({ showGuildPanel: !state.showGuildPanel })),

      // Phase 4 - Immersive Experience
      showNPCDialogue: false,
      showAchievements: false,
      showHousing: false,
      showPvPArena: false,
      toggleNPCDialogue: () => set((state) => ({ showNPCDialogue: !state.showNPCDialogue })),
      toggleAchievements: () => set((state) => ({ showAchievements: !state.showAchievements })),
      toggleHousing: () => set((state) => ({ showHousing: !state.showHousing })),
      togglePvPArena: () => set((state) => ({ showPvPArena: !state.showPvPArena })),
      selectedNPCId: null,
      setSelectedNPCId: (npcId) => set({ selectedNPCId: npcId }),
    }),
    {
      name: 'plottwist-game-storage',
      partialize: (state) => ({
        // Only persist certain parts
        unlockedAchievements: state.unlockedAchievements,
        completedQuests: state.completedQuests,
        currentPartyId: state.currentPartyId,
      }),
    }
  )
);

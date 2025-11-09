"use client";

import { useEffect } from 'react';
import { useGameStore } from '@/lib/gameStore';

export default function KeyboardHandler() {
  const { 
    toggleInventory, 
    toggleQuestLog, 
    toggleMap, 
    togglePartyPanel, 
    toggleFriendsList, 
    toggleTradeWindow,
    toggleGuildPanel,
    toggleNPCDialogue,
    toggleAchievements,
    toggleHousing,
    togglePvPArena
  } = useGameStore();

  useEffect(() => {
    console.log('🎮 KeyboardHandler: Effect mounted');
    
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('🔑 Key pressed:', event.key);
      
      // Don't capture keys if user is typing
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        (activeElement as HTMLElement).contentEditable === 'true'
      );

      if (isTyping) {
        console.log('⚠️ Key ignored: Input field focused');
        return;
      }

      const key = event.key.toLowerCase();
      console.log('✅ Processing key:', key);

      // Handle UI toggle keys
      switch (key) {
        case 'i':
          event.preventDefault();
          console.log('🎒 Toggling inventory...');
          toggleInventory();
          console.log('✅ Inventory toggled, new state:', useGameStore.getState().showInventory);
          break;
        case 'q':
          event.preventDefault();
          console.log('📜 Toggling quest log...');
          toggleQuestLog();
          console.log('✅ Quest log toggled, new state:', useGameStore.getState().showQuestLog);
          break;
        case 'm':
          event.preventDefault();
          toggleMap();
          console.log('Map toggled');
          break;
        case 'e':
          event.preventDefault();
          console.log('😊 Toggling emote wheel...');
          const currentState = useGameStore.getState();
          console.log('Current emote wheel state:', currentState.showEmoteWheel);
          currentState.setShowEmoteWheel(!currentState.showEmoteWheel);
          console.log('✅ Emote wheel toggled, new state:', useGameStore.getState().showEmoteWheel);
          break;
        case 'p':
          event.preventDefault();
          togglePartyPanel();
          console.log('Party panel toggled');
          break;
        case 'f':
          event.preventDefault();
          toggleFriendsList();
          console.log('Friends list toggled');
          break;
        case 't':
          event.preventDefault();
          toggleTradeWindow();
          console.log('Trade window toggled');
          break;
        case 'g':
          event.preventDefault();
          toggleGuildPanel();
          console.log('Guild panel toggled');
          break;
        case 'n':
          event.preventDefault();
          toggleNPCDialogue();
          console.log('NPC dialogue toggled');
          break;
        case 'a':
          event.preventDefault();
          toggleAchievements();
          console.log('Achievements toggled');
          break;
        case 'h':
          event.preventDefault();
          toggleHousing();
          console.log('Housing panel toggled');
          break;
        case 'v':
          event.preventDefault();
          togglePvPArena();
          console.log('PvP arena toggled');
          break;
        case 'escape':
          // Close all panels on escape
          event.preventDefault();
          const { 
            showInventory, 
            showQuestLog, 
            showMap, 
            showEmoteWheel, 
            showPartyPanel, 
            showFriendsList, 
            showTradeWindow,
            showGuildPanel,
            showNPCDialogue,
            showAchievements,
            showHousing,
            showPvPArena,
            setShowEmoteWheel
          } = useGameStore.getState();
          if (showInventory) toggleInventory();
          if (showQuestLog) toggleQuestLog();
          if (showMap) toggleMap();
          if (showEmoteWheel) setShowEmoteWheel(false);
          if (showPartyPanel) togglePartyPanel();
          if (showFriendsList) toggleFriendsList();
          if (showTradeWindow) toggleTradeWindow();
          if (showGuildPanel) toggleGuildPanel();
          if (showNPCDialogue) toggleNPCDialogue();
          if (showAchievements) toggleAchievements();
          if (showHousing) toggleHousing();
          if (showPvPArena) togglePvPArena();
          break;
      }
    };    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    console.log('KeyboardHandler: Listeners attached for I, Q, M, E, P, F, T, G, N, A, H, V keys');

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      console.log('KeyboardHandler: Listeners removed');
    };
  }, [toggleInventory, toggleQuestLog, toggleMap, togglePartyPanel, toggleFriendsList, toggleTradeWindow, toggleGuildPanel, toggleNPCDialogue, toggleAchievements, toggleHousing, togglePvPArena]);

  return null; // This component doesn't render anything
}

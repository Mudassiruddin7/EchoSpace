"use client";

import { useGameStore } from '@/lib/gameStore';

export default function QuickAccessHUD() {
  const { 
    toggleInventory, 
    toggleQuestLog, 
    toggleMap, 
    togglePartyPanel,
    toggleFriendsList,
    showInventory, 
    showQuestLog, 
    showMap,
    showPartyPanel,
    showFriendsList
  } = useGameStore();

  const buttons = [
    { label: 'Inventory', key: 'I', action: toggleInventory, active: showInventory, icon: '🎒' },
    { label: 'Quests', key: 'Q', action: toggleQuestLog, active: showQuestLog, icon: '📜' },
    { label: 'Map', key: 'M', action: toggleMap, active: showMap, icon: '🗺️' },
    { label: 'Party', key: 'P', action: togglePartyPanel, active: showPartyPanel, icon: '👥' },
    { label: 'Friends', key: 'F', action: toggleFriendsList, active: showFriendsList, icon: '👫' },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 select-none">
      <div className="flex gap-2">
        {buttons.map(button => (
          <button
            key={button.key}
            onClick={button.action}
            className={`
              px-4 py-2 rounded-lg font-medium text-sm
              transition-all duration-200
              flex items-center gap-2
              ${button.active
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50 scale-105'
                : 'bg-gray-900/90 text-gray-300 hover:bg-gray-800 hover:text-white border border-gray-700'
              }
            `}
          >
            <span className="text-xl">{button.icon}</span>
            <span>{button.label}</span>
            <kbd className="ml-1 bg-black/30 px-1.5 py-0.5 rounded text-xs font-mono">
              {button.key}
            </kbd>
          </button>
        ))}
      </div>
    </div>
  );
}

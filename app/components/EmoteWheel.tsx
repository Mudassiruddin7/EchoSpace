"use client";

import { useState, useEffect } from 'react';
import { useGameStore } from '@/lib/gameStore';
import type { Emote } from '@/lib/gameTypes';

const EMOTES: Emote[] = [
  { id: 'wave', name: 'Wave', icon: '👋', animation: 'wave', duration: 2, category: 'gesture' },
  { id: 'dance', name: 'Dance', icon: '💃', animation: 'dance', duration: 4, category: 'dance' },
  { id: 'cheer', name: 'Cheer', icon: '🎉', animation: 'cheer', duration: 2.5, category: 'gesture' },
  { id: 'clap', name: 'Clap', icon: '👏', animation: 'clap', duration: 2, category: 'gesture' },
  { id: 'laugh', name: 'Laugh', icon: '😂', animation: 'laugh', duration: 3, category: 'reaction' },
  { id: 'cry', name: 'Cry', icon: '😢', animation: 'cry', duration: 3, category: 'reaction' },
  { id: 'sit', name: 'Sit', icon: '🪑', animation: 'sit', duration: 0, category: 'action' },
  { id: 'sleep', name: 'Sleep', icon: '😴', animation: 'sleep', duration: 0, category: 'action' },
];

export default function EmoteWheel() {
  const [selectedEmote, setSelectedEmote] = useState<string | null>(null);
  const { performEmote, currentEmote, setAvailableEmotes, showEmoteWheel, setShowEmoteWheel } = useGameStore();

  useEffect(() => {
    // Initialize available emotes
    setAvailableEmotes(EMOTES);
  }, [setAvailableEmotes]);

  const handleEmoteSelect = (emoteId: string) => {
    performEmote(emoteId);
    setShowEmoteWheel(false);
    
    // Broadcast emote to other players via avatar_states
    // This will be handled by the world component
    window.dispatchEvent(new CustomEvent('performEmote', { detail: { emoteId } }));
  };

  if (!showEmoteWheel) {
    return (
      <div className="fixed bottom-24 right-4 z-30">
        <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-3 py-2 text-white text-xs border border-gray-700 shadow-lg">
          Press <kbd className="bg-gray-700 px-2 py-1 rounded font-mono">E</kbd> for Emotes
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {/* Emote Wheel */}
      <div className="relative w-96 h-96">
        {/* Center circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 bg-gray-900/95 border-4 border-gray-700 rounded-full flex items-center justify-center shadow-2xl">
            <div className="text-center">
              <div className="text-3xl mb-1">
                {selectedEmote ? EMOTES.find(e => e.id === selectedEmote)?.icon : '😊'}
              </div>
              <div className="text-white text-xs font-semibold">
                {selectedEmote ? EMOTES.find(e => e.id === selectedEmote)?.name : 'Select'}
              </div>
            </div>
          </div>
        </div>

        {/* Emote buttons in circle */}
        {EMOTES.map((emote, index) => {
          const angle = (index / EMOTES.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 150;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <button
              key={emote.id}
              onClick={() => handleEmoteSelect(emote.id)}
              onMouseEnter={() => setSelectedEmote(emote.id)}
              onMouseLeave={() => setSelectedEmote(null)}
              className={`
                absolute w-16 h-16 rounded-full
                transform -translate-x-1/2 -translate-y-1/2
                transition-all duration-200
                ${selectedEmote === emote.id 
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 scale-110 shadow-2xl' 
                  : 'bg-gray-800/90 hover:bg-gray-700/90 hover:scale-105'
                }
                border-2 border-gray-600
                flex flex-col items-center justify-center
                group
              `}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
              }}
            >
              <div className="text-3xl mb-0.5">{emote.icon}</div>
              <div className="text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                {emote.name}
              </div>
            </button>
          );
        })}

        {/* Instructions */}
        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center">
          <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm border border-gray-700">
            Click an emote or press <kbd className="bg-gray-700 px-2 py-1 rounded font-mono text-xs">ESC</kbd> to close
          </div>
        </div>
      </div>

      {/* Current emote indicator */}
      {currentEmote && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="text-8xl animate-bounce">
            {EMOTES.find(e => e.id === currentEmote)?.icon}
          </div>
        </div>
      )}
    </div>
  );
}

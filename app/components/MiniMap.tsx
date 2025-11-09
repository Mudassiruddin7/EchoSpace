"use client";

import { useEffect, useState } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import type { AvatarState } from '@/lib/types';

interface PlayerMarker {
  id: string;
  username: string;
  position: { x: number; z: number };
  distance: number;
  angle: number;
}

export default function MiniMap() {
  const { otherAvatars, profile } = useLobbyStore();
  const [playerMarkers, setPlayerMarkers] = useState<PlayerMarker[]>([]);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, z: 0 });

  const RADAR_RADIUS = 80; // pixels
  const WORLD_SCALE = 15; // world units per radar radius
  const MAX_DISTANCE = 30; // Only show players within 30 units

  useEffect(() => {
    const updateInterval = setInterval(() => {
      // Convert Map to Array
      const avatarsArray = Array.from(otherAvatars.values());
      
      // Get current player position from avatar_states
      const currentPlayer = profile?.id 
        ? avatarsArray.find((p: AvatarState) => p.profile_id === profile.id)
        : null;

      if (currentPlayer) {
        setPlayerPosition({
          x: currentPlayer.position.x,
          z: currentPlayer.position.z
        });
      }

      // Calculate relative positions for other players
      const markers = avatarsArray
        .filter((player: AvatarState) => player.profile_id !== profile?.id)
        .map((player: AvatarState) => {
          const dx = player.position.x - playerPosition.x;
          const dz = player.position.z - playerPosition.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          const angle = Math.atan2(dz, dx);

          return {
            id: player.profile_id,
            username: 'Player', // Username needs to be fetched from profilesCache
            position: { x: player.position.x, z: player.position.z },
            distance,
            angle
          };
        })
        .filter((marker: PlayerMarker) => marker.distance <= MAX_DISTANCE);

      setPlayerMarkers(markers);
    }, 500); // Update twice per second

    return () => clearInterval(updateInterval);
  }, [otherAvatars, profile?.id, playerPosition.x, playerPosition.z]);

  const getMarkerPosition = (marker: PlayerMarker) => {
    const scale = RADAR_RADIUS / WORLD_SCALE;
    const dx = (marker.position.x - playerPosition.x) * scale;
    const dz = (marker.position.z - playerPosition.z) * scale;
    
    // Clamp to radar bounds
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance > RADAR_RADIUS) {
      const ratio = RADAR_RADIUS / distance;
      return {
        x: RADAR_RADIUS + dx * ratio,
        y: RADAR_RADIUS + dz * ratio
      };
    }

    return {
      x: RADAR_RADIUS + dx,
      y: RADAR_RADIUS + dz
    };
  };

  return (
    <div className="fixed top-4 right-4 z-30 select-none">
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 shadow-2xl border border-gray-700">
        {/* Title */}
        <div className="text-white text-xs font-semibold mb-2 text-center">Mini-Map</div>

        {/* Radar Circle */}
        <div className="relative" style={{ width: RADAR_RADIUS * 2, height: RADAR_RADIUS * 2 }}>
          {/* Background circles */}
          <svg className="absolute inset-0 w-full h-full">
            {/* Outer circle */}
            <circle
              cx={RADAR_RADIUS}
              cy={RADAR_RADIUS}
              r={RADAR_RADIUS - 2}
              fill="rgba(0, 0, 0, 0.5)"
              stroke="rgba(100, 255, 100, 0.3)"
              strokeWidth="2"
            />
            {/* Middle circle */}
            <circle
              cx={RADAR_RADIUS}
              cy={RADAR_RADIUS}
              r={(RADAR_RADIUS - 2) / 2}
              fill="none"
              stroke="rgba(100, 255, 100, 0.2)"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            {/* Crosshair */}
            <line
              x1={RADAR_RADIUS}
              y1="4"
              x2={RADAR_RADIUS}
              y2={RADAR_RADIUS * 2 - 4}
              stroke="rgba(100, 255, 100, 0.2)"
              strokeWidth="1"
            />
            <line
              x1="4"
              y1={RADAR_RADIUS}
              x2={RADAR_RADIUS * 2 - 4}
              y2={RADAR_RADIUS}
              stroke="rgba(100, 255, 100, 0.2)"
              strokeWidth="1"
            />
            
            {/* Scanning sweep animation */}
            <line
              x1={RADAR_RADIUS}
              y1={RADAR_RADIUS}
              x2={RADAR_RADIUS}
              y2="4"
              stroke="rgba(100, 255, 100, 0.4)"
              strokeWidth="2"
              className="animate-spin origin-center"
              style={{ transformOrigin: `${RADAR_RADIUS}px ${RADAR_RADIUS}px` }}
            />
          </svg>

          {/* Player markers */}
          {playerMarkers.map(marker => {
            const pos = getMarkerPosition(marker);
            return (
              <div
                key={marker.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`
                }}
              >
                {/* Marker dot */}
                <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap border border-gray-700">
                    {marker.username}
                    <div className="text-gray-400 text-[10px]">
                      {Math.round(marker.distance)}m away
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Current player (center) */}
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${RADAR_RADIUS}px`,
              top: `${RADAR_RADIUS}px`
            }}
          >
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow-lg" />
            <div className="absolute inset-0 bg-green-500/30 rounded-full animate-ping" />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-2 pt-2 border-t border-gray-700 text-[10px] text-gray-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span>You</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              <span>Players ({playerMarkers.length})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

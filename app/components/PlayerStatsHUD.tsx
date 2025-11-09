"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import type { PlayerStats } from '@/lib/gameTypes';

export default function PlayerStatsHUD() {
  const { playerStats, setPlayerStats } = useGameStore();
  const { profile } = useLobbyStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchPlayerStats = async () => {
      try {
        const { data, error } = await supabase
          .from('player_stats')
          .select('*')
          .eq('profile_id', profile.id)
          .single();

        if (error) {
          console.error('Error fetching player stats:', error);
          return;
        }

        if (data) {
          setPlayerStats(data as PlayerStats);
        }
      } catch (error) {
        console.error('Failed to fetch player stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`player_stats_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_stats',
          filter: `profile_id=eq.${profile.id}`
        },
        (payload) => {
          if (payload.new) {
            setPlayerStats(payload.new as PlayerStats);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id, setPlayerStats]);

  if (loading || !playerStats) return null;

  const hpPercentage = (playerStats.health / playerStats.max_health) * 100;
  const manaPercentage = (playerStats.mana / playerStats.max_mana) * 100;
  const xpPercentage = (playerStats.current_xp / playerStats.xp_to_next_level) * 100;

  return (
    <div className="fixed top-4 left-4 z-30 select-none">
      <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg p-4 shadow-2xl border border-gray-700 w-64">
        {/* Level Badge */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
              {playerStats.level}
            </div>
            <div>
              <div className="text-white font-semibold text-sm">{profile?.username}</div>
              <div className="text-gray-400 text-xs">Level {playerStats.level}</div>
            </div>
          </div>
        </div>

        {/* Health Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-red-400 font-medium">HP</span>
            <span className="text-white">{playerStats.health} / {playerStats.max_health}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-300 ease-out shadow-inner"
              style={{ width: `${hpPercentage}%` }}
            >
              <div className="w-full h-full bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Mana Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-blue-400 font-medium">MP</span>
            <span className="text-white">{playerStats.mana} / {playerStats.max_mana}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out shadow-inner"
              style={{ width: `${manaPercentage}%` }}
            >
              <div className="w-full h-full bg-white/20 animate-pulse" />
            </div>
          </div>
        </div>

        {/* XP Bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-yellow-400 font-medium">XP</span>
            <span className="text-white">{playerStats.current_xp} / {playerStats.xp_to_next_level}</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500 ease-out"
              style={{ width: `${xpPercentage}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-700">
          <StatBadge icon="⚔️" label="STR" value={playerStats.strength} color="text-red-400" />
          <StatBadge icon="🧠" label="INT" value={playerStats.intelligence} color="text-blue-400" />
          <StatBadge icon="💬" label="CHA" value={playerStats.charisma} color="text-purple-400" />
        </div>
      </div>
    </div>
  );
}

function StatBadge({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800/50 rounded px-2 py-1.5 text-center">
      <div className="text-lg mb-0.5">{icon}</div>
      <div className="text-gray-400 text-[10px] font-medium">{label}</div>
      <div className={`${color} text-sm font-bold`}>{value}</div>
    </div>
  );
}

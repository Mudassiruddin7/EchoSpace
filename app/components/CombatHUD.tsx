"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import type { PlayerCombatStats, PlayerAbility, StatusEffect } from '@/lib/gameplayTypes';
import { Card } from '@/components/ui/card';

export default function CombatHUD() {
  const { profile } = useLobbyStore();
  const { addNotification } = useGameStore();
  const [combatStats, setCombatStats] = useState<PlayerCombatStats | null>(null);
  const [abilities, setAbilities] = useState<PlayerAbility[]>([]);
  const [statusEffects, setStatusEffects] = useState<StatusEffect[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!profile?.id) return;

    loadCombatData();
    subscribeToUpdates();
  }, [profile?.id]);

  useEffect(() => {
    // Update cooldowns every second
    const interval = setInterval(() => {
      setCooldowns(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (updated[key] > 0) {
            updated[key] = Math.max(0, updated[key] - 1);
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const loadCombatData = async () => {
    if (!profile?.id) return;

    try {
      // Load combat stats
      let { data: statsData } = await supabase
        .from('player_combat_stats')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (!statsData) {
        // Create default combat stats
        const { data: newStats } = await supabase
          .from('player_combat_stats')
          .insert({ profile_id: profile.id })
          .select()
          .single();
        statsData = newStats;
      }

      setCombatStats(statsData);

      // Load abilities
      const { data: abilitiesData } = await supabase
        .from('player_abilities')
        .select('*')
        .eq('profile_id', profile.id)
        .order('ability_level', { ascending: true });

      if (abilitiesData && abilitiesData.length === 0) {
        // Give starter abilities
        await initializeStarterAbilities();
      } else {
        setAbilities(abilitiesData || []);
      }

      // Load status effects
      const { data: effectsData } = await supabase
        .from('status_effects')
        .select('*')
        .eq('profile_id', profile.id)
        .gte('expires_at', new Date().toISOString());

      setStatusEffects(effectsData || []);
    } catch (error) {
      console.error('Failed to load combat data:', error);
    }
  };

  const initializeStarterAbilities = async () => {
    if (!profile?.id) return;

    const starterAbilities = [
      {
        profile_id: profile.id,
        ability_id: 'basic_attack',
        ability_name: 'Basic Attack',
        ability_type: 'active',
        damage_type: 'physical',
        cooldown_seconds: 1,
        mana_cost: 0,
        damage_multiplier: 1.0,
        description: 'A basic melee attack',
        icon: '⚔️',
        unlock_level: 1
      },
      {
        profile_id: profile.id,
        ability_id: 'power_strike',
        ability_name: 'Power Strike',
        ability_type: 'active',
        damage_type: 'physical',
        cooldown_seconds: 5,
        mana_cost: 10,
        damage_multiplier: 2.0,
        description: 'A powerful strike dealing 200% damage',
        icon: '💥',
        unlock_level: 1
      },
      {
        profile_id: profile.id,
        ability_id: 'heal',
        ability_name: 'Heal',
        ability_type: 'active',
        damage_type: null,
        cooldown_seconds: 10,
        mana_cost: 20,
        damage_multiplier: 0,
        description: 'Restore 30 HP',
        icon: '💚',
        unlock_level: 1
      }
    ];

    const { data } = await supabase
      .from('player_abilities')
      .insert(starterAbilities)
      .select();

    setAbilities(data || []);
  };

  const subscribeToUpdates = () => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`combat_${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_combat_stats',
        filter: `profile_id=eq.${profile.id}`
      }, () => {
        loadCombatData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'status_effects',
        filter: `profile_id=eq.${profile.id}`
      }, () => {
        loadCombatData();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const useAbility = async (ability: PlayerAbility) => {
    if (!profile?.id || !combatStats) return;

    // Check cooldown
    if (cooldowns[ability.ability_id] > 0) {
      addNotification({
        type: 'quest_update',
        message: `Ability on cooldown: ${cooldowns[ability.ability_id]}s`,
        icon: '⏳'
      });
      return;
    }

    // Check mana
    if (combatStats.current_mana < ability.mana_cost) {
      addNotification({
        type: 'quest_update',
        message: 'Not enough mana!',
        icon: '❌'
      });
      return;
    }

    try {
      // Special handling for heal
      if (ability.ability_id === 'heal') {
        await supabase.rpc('heal_player', {
          p_profile_id: profile.id,
          heal_amount: 30
        });

        addNotification({
          type: 'achievement',
          message: 'Healed for 30 HP!',
          icon: '💚'
        });
      } else {
        // Combat abilities
        const damage = Math.floor(combatStats.attack_power * ability.damage_multiplier);
        
        addNotification({
          type: 'achievement',
          message: `${ability.ability_name}: ${damage} damage!`,
          icon: ability.icon || '⚔️'
        });
      }

      // Deduct mana
      await supabase
        .from('player_combat_stats')
        .update({ 
          current_mana: Math.max(0, combatStats.current_mana - ability.mana_cost),
          last_combat_action: new Date().toISOString()
        })
        .eq('profile_id', profile.id);

      // Update ability usage
      await supabase
        .from('player_abilities')
        .update({
          last_used: new Date().toISOString(),
          times_used: ability.times_used + 1
        })
        .eq('id', ability.id);

      // Set cooldown
      setCooldowns(prev => ({
        ...prev,
        [ability.ability_id]: ability.cooldown_seconds
      }));

      loadCombatData();
    } catch (error) {
      console.error('Failed to use ability:', error);
    }
  };

  const regenerateMana = async () => {
    if (!profile?.id || !combatStats) return;

    const newMana = Math.min(combatStats.max_mana, combatStats.current_mana + 10);

    await supabase
      .from('player_combat_stats')
      .update({ current_mana: newMana })
      .eq('profile_id', profile.id);

    loadCombatData();
  };

  if (!combatStats) return null;

  const hpPercent = (combatStats.current_hp / combatStats.max_hp) * 100;
  const manaPercent = (combatStats.current_mana / combatStats.max_mana) * 100;

  return (
    <div className="fixed top-20 right-4 z-30 w-80 space-y-2 select-none">
      {/* HP/Mana Bars */}
      <Card className="bg-gray-900/95 border-gray-700 p-3">
        <div className="space-y-2">
          {/* HP Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>HP</span>
              <span>{combatStats.current_hp} / {combatStats.max_hp}</span>
            </div>
            <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-300 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${hpPercent}%` }}
              >
                {hpPercent > 20 && `${Math.round(hpPercent)}%`}
              </div>
            </div>
          </div>

          {/* Mana Bar */}
          <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Mana</span>
              <span>{combatStats.current_mana} / {combatStats.max_mana}</span>
            </div>
            <div className="h-6 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-300 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${manaPercent}%` }}
              >
                {manaPercent > 20 && `${Math.round(manaPercent)}%`}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-red-400">⚔️</span>
              <span className="text-gray-400">Attack:</span>
              <span className="text-white font-bold">{combatStats.attack_power}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-400">🛡️</span>
              <span className="text-gray-400">Defense:</span>
              <span className="text-white font-bold">{combatStats.defense}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-purple-400">✨</span>
              <span className="text-gray-400">Magic:</span>
              <span className="text-white font-bold">{combatStats.magic_power}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-yellow-400">💫</span>
              <span className="text-gray-400">Crit:</span>
              <span className="text-white font-bold">{combatStats.critical_chance}%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Abilities */}
      <Card className="bg-gray-900/95 border-gray-700 p-3">
        <h3 className="text-white font-bold mb-2 flex items-center gap-2">
          <span>⚡</span> Abilities
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {abilities.map((ability) => {
            const onCooldown = cooldowns[ability.ability_id] > 0;
            const notEnoughMana = combatStats.current_mana < ability.mana_cost;
            const disabled = onCooldown || notEnoughMana;

            return (
              <button
                key={ability.id}
                onClick={() => !disabled && useAbility(ability)}
                disabled={disabled}
                className={`
                  relative aspect-square rounded-lg flex flex-col items-center justify-center
                  transition-all duration-200 border-2
                  ${disabled
                    ? 'bg-gray-800/50 border-gray-700 cursor-not-allowed opacity-50'
                    : 'bg-purple-600/20 border-purple-500 hover:bg-purple-600/40 hover:scale-105'
                  }
                `}
                title={ability.description || ''}
              >
                <span className="text-2xl mb-1">{ability.icon || '⚔️'}</span>
                <span className="text-xs text-white font-medium text-center px-1">
                  {ability.ability_name.split(' ')[0]}
                </span>
                {ability.mana_cost > 0 && (
                  <span className="text-xs text-blue-300">{ability.mana_cost}M</span>
                )}
                {onCooldown && (
                  <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">{cooldowns[ability.ability_id]}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <button
          onClick={regenerateMana}
          className="w-full mt-2 py-1 rounded bg-blue-600/20 border border-blue-500 text-blue-300 text-xs hover:bg-blue-600/40 transition-colors"
        >
          Regenerate Mana (+10)
        </button>
      </Card>

      {/* Status Effects */}
      {statusEffects.length > 0 && (
        <Card className="bg-gray-900/95 border-gray-700 p-3">
          <h3 className="text-white font-bold mb-2 flex items-center gap-2">
            <span>✨</span> Status Effects
          </h3>
          <div className="space-y-1">
            {statusEffects.map((effect) => (
              <div
                key={effect.id}
                className={`flex items-center justify-between p-2 rounded text-xs ${
                  effect.effect_type === 'buff' ? 'bg-green-600/20 border border-green-500' : 'bg-red-600/20 border border-red-500'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{effect.icon || (effect.effect_type === 'buff' ? '⬆️' : '⬇️')}</span>
                  <div>
                    <div className="text-white font-medium">{effect.effect_name}</div>
                    <div className="text-gray-400">{effect.description}</div>
                  </div>
                </div>
                {effect.stacks > 1 && (
                  <span className="text-white font-bold">x{effect.stacks}</span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

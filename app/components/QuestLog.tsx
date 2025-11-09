"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import type { PlayerQuest, Quest } from '@/lib/gameTypes';
import { Card } from '@/components/ui/card';

export default function QuestLog() {
  const { showQuestLog, toggleQuestLog, activeQuests, setActiveQuests, completedQuests, setCompletedQuests } = useGameStore();
  const { profile } = useLobbyStore();
  const [selectedQuest, setSelectedQuest] = useState<PlayerQuest | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id || !showQuestLog) return;

    const fetchQuests = async () => {
      try {
        // Fetch player quests with joined quest data
        const { data: playerQuestsData, error: questsError } = await supabase
          .from('player_quests')
          .select(`
            *,
            quest:quests(*)
          `)
          .eq('profile_id', profile.id);

        if (questsError) throw questsError;

        const active = (playerQuestsData || []).filter(q => q.status === 'active');
        const completed = (playerQuestsData || []).filter(q => q.status === 'completed');

        setActiveQuests(active as PlayerQuest[]);
        setCompletedQuests(completed as PlayerQuest[]);
      } catch (error) {
        console.error('Failed to fetch quests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuests();

    // Subscribe to quest updates
    const channel = supabase
      .channel(`quests_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_quests',
          filter: `profile_id=eq.${profile.id}`
        },
        () => {
          fetchQuests(); // Refetch on any change
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id, showQuestLog, setActiveQuests, setCompletedQuests]);

  const handleAbandonQuest = async (questId: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('player_quests')
        .update({ status: 'abandoned' })
        .eq('profile_id', profile.id)
        .eq('quest_id', questId);

      if (error) throw error;

      setActiveQuests(activeQuests.filter(q => q.quest_id !== questId));
      setSelectedQuest(null);
    } catch (error) {
      console.error('Failed to abandon quest:', error);
    }
  };

  if (!showQuestLog) return null;

  const displayQuests = activeTab === 'active' ? activeQuests : completedQuests;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-gray-900/95 border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Quest Log</h2>
            <p className="text-sm text-gray-400">
              {activeQuests.length} Active • {completedQuests.length} Completed
            </p>
          </div>
          <button
            onClick={toggleQuestLog}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800/50">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'active'
                ? 'text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Active Quests ({activeQuests.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'completed'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Completed ({completedQuests.length})
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Quest List */}
          <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-gray-500 text-center">Loading...</div>
            ) : displayQuests.length === 0 ? (
              <div className="p-4 text-gray-500 text-center italic">
                {activeTab === 'active' ? 'No active quests' : 'No completed quests'}
              </div>
            ) : (
              displayQuests.map(quest => (
                <QuestListItem
                  key={quest.id}
                  quest={quest}
                  isSelected={selectedQuest?.id === quest.id}
                  onClick={() => setSelectedQuest(quest)}
                />
              ))
            )}
          </div>

          {/* Quest Details */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedQuest ? (
              <QuestDetails
                quest={selectedQuest}
                onAbandon={activeTab === 'active' ? handleAbandonQuest : undefined}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                Select a quest to view details
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function QuestListItem({ 
  quest, 
  isSelected, 
  onClick 
}: { 
  quest: PlayerQuest; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  const questData = quest.quest as unknown as Quest;
  const totalObjectives = questData?.objectives?.length || 0;
  const completedObjectives = quest.progress?.filter(obj => obj.completed).length || 0;

  const difficultyColors = {
    easy: 'text-green-400',
    medium: 'text-yellow-400',
    hard: 'text-orange-400',
    epic: 'text-purple-400',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left transition-colors border-b border-gray-700 ${
        isSelected ? 'bg-gray-700/50' : 'hover:bg-gray-800/30'
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className="text-2xl">📜</span>
        <div className="flex-1">
          <h4 className="font-semibold text-white text-sm mb-1">{questData?.title}</h4>
          <div className="flex items-center gap-2 text-xs">
            <span className={`capitalize ${difficultyColors[questData?.difficulty || 'medium']}`}>
              {questData?.difficulty}
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 capitalize">{questData?.quest_type}</span>
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-400 ml-8">
        {completedObjectives} / {totalObjectives} Objectives
      </div>
    </button>
  );
}

function QuestDetails({ 
  quest, 
  onAbandon 
}: { 
  quest: PlayerQuest; 
  onAbandon?: (questId: string) => void;
}) {
  const questData = quest.quest as unknown as Quest;

  const difficultyColors = {
    easy: 'bg-green-900/30 text-green-400 border-green-500',
    medium: 'bg-yellow-900/30 text-yellow-400 border-yellow-500',
    hard: 'bg-orange-900/30 text-orange-400 border-orange-500',
    epic: 'bg-purple-900/30 text-purple-400 border-purple-500',
  };

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-2xl font-bold text-white mb-2">{questData?.title}</h3>
        <div className="flex gap-2 mb-3">
          <span className={`px-2 py-1 rounded text-xs font-medium border ${difficultyColors[questData?.difficulty || 'medium']}`}>
            {questData?.difficulty?.toUpperCase()}
          </span>
          <span className="px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-300 capitalize">
            {questData?.quest_type}
          </span>
          {questData?.npc_giver && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-900/30 text-blue-300">
              From: {questData.npc_giver}
            </span>
          )}
        </div>
        <p className="text-gray-300">{questData?.description}</p>
      </div>

      {/* Objectives */}
      <div className="mb-4">
        <h4 className="text-lg font-semibold text-white mb-3">Objectives</h4>
        <div className="space-y-2">
          {quest.progress?.map((objective, index) => (
            <div
              key={objective.id}
              className={`p-3 rounded-lg border ${
                objective.completed
                  ? 'bg-green-900/20 border-green-700'
                  : 'bg-gray-800/50 border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-medium ${objective.completed ? 'text-green-400 line-through' : 'text-white'}`}>
                  {objective.completed ? '✓' : '○'} {objective.description}
                </span>
                <span className={`text-xs ${objective.completed ? 'text-green-400' : 'text-gray-400'}`}>
                  {objective.current} / {objective.target}
                </span>
              </div>
              {!objective.completed && (
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-yellow-400 h-1.5 rounded-full transition-all"
                    style={{ width: `${(objective.current / objective.target) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Rewards */}
      {questData?.rewards && (
        <div className="mb-4 p-4 rounded-lg bg-yellow-900/20 border border-yellow-700/50">
          <h4 className="text-lg font-semibold text-yellow-400 mb-2">Rewards</h4>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {questData.rewards.xp && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <div>
                  <div className="text-gray-400 text-xs">XP</div>
                  <div className="text-white font-semibold">{questData.rewards.xp}</div>
                </div>
              </div>
            )}
            {questData.rewards.gold && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">💰</span>
                <div>
                  <div className="text-gray-400 text-xs">Gold</div>
                  <div className="text-white font-semibold">{questData.rewards.gold}</div>
                </div>
              </div>
            )}
            {questData.rewards.items && questData.rewards.items.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎁</span>
                <div>
                  <div className="text-gray-400 text-xs">Items</div>
                  <div className="text-white font-semibold">{questData.rewards.items.length}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {onAbandon && (
        <button
          onClick={() => onAbandon(quest.quest_id)}
          className="w-full py-2 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-700 font-medium transition-colors"
        >
          Abandon Quest
        </button>
      )}
    </div>
  );
}

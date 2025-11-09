'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLobbyStore } from '@/lib/lobbyStore';
import { useGameStore } from '@/lib/gameStore';
import type { NPCCharacter, NPCDialogueOption, NPCQuestGenerated } from '@/lib/phase4Types';

interface NPCDialoguePanelProps {
  selectedNPCId?: string;
}

export default function NPCDialoguePanel({ selectedNPCId }: NPCDialoguePanelProps) {
  const { profile } = useLobbyStore();
  const { showNPCDialogue, toggleNPCDialogue } = useGameStore();
  
  const [currentNPC, setCurrentNPC] = useState<NPCCharacter | null>(null);
  const [nearbyNPCs, setNearbyNPCs] = useState<NPCCharacter[]>([]);
  const [dialogueOptions, setDialogueOptions] = useState<NPCDialogueOption[]>([]);
  const [availableQuests, setAvailableQuests] = useState<NPCQuestGenerated[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{ speaker: string; text: string }>>([]);
  const [relationshipLevel, setRelationshipLevel] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showNPCDialogue) {
      loadNearbyNPCs();
      if (selectedNPCId) {
        selectNPC(selectedNPCId);
      }
    }
  }, [showNPCDialogue, selectedNPCId]);

  const loadNearbyNPCs = async () => {
    try {
      const { data, error } = await supabase
        .from('npc_characters')
        .select('*')
        .limit(10);

      if (error) throw error;
      setNearbyNPCs(data || []);
    } catch (error) {
      console.error('Error loading NPCs:', error);
    }
  };

  const selectNPC = async (npcId: string) => {
    setLoading(true);
    try {
      // Load NPC data
      const { data: npcData, error: npcError } = await supabase
        .from('npc_characters')
        .select('*')
        .eq('id', npcId)
        .single();

      if (npcError) throw npcError;
      setCurrentNPC(npcData);

      // Load dialogue options
      const { data: dialogues, error: dialogueError } = await supabase
        .from('npc_dialogue_options')
        .select('*')
        .eq('npc_id', npcId)
        .order('priority', { ascending: false });

      if (dialogueError) throw dialogueError;
      setDialogueOptions(dialogues || []);

      // Load available quests
      const { data: quests, error: questError } = await supabase
        .from('npc_quests_generated')
        .select('*')
        .eq('npc_id', npcId)
        .eq('is_active', true);

      if (questError) throw questError;
      setAvailableQuests(quests || []);

      // Load relationship (from npc_relationships if exists)
      const { data: relationshipData } = await supabase
        .from('npc_relationships')
        .select('relationship_level')
        .eq('profile_id', profile?.id)
        .eq('npc_name', npcData.npc_name)
        .single();

      setRelationshipLevel(relationshipData?.relationship_level || 0);

      // Show greeting
      const greeting = npcData.greeting_messages?.[Math.floor(Math.random() * npcData.greeting_messages.length)] || 'Hello!';
      setConversationHistory([{ speaker: npcData.npc_name, text: greeting }]);

    } catch (error) {
      console.error('Error selecting NPC:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectDialogueOption = async (option: NPCDialogueOption) => {
    if (!currentNPC || !profile) return;

    // Add player's choice to history
    setConversationHistory(prev => [...prev, { speaker: 'You', text: option.player_option }]);

    // Add NPC response
    setTimeout(() => {
      setConversationHistory(prev => [...prev, { speaker: currentNPC.npc_name, text: option.npc_response }]);
    }, 500);

    // Handle consequences
    if (option.relationship_change !== 0) {
      const newLevel = relationshipLevel + option.relationship_change;
      setRelationshipLevel(newLevel);

      // Update in database
      await supabase
        .from('npc_relationships')
        .upsert({
          profile_id: profile.id,
          npc_name: currentNPC.npc_name,
          relationship_level: newLevel,
          last_interaction: new Date().toISOString()
        });
    }

    if (option.triggers_quest_id) {
      // Trigger quest logic here
      console.log('Quest triggered:', option.triggers_quest_id);
    }

    if (option.gives_item_id) {
      // Give item logic here
      console.log('Item given:', option.gives_item_id);
    }

    // Reload dialogue options after interaction
    setTimeout(() => {
      if (currentNPC) selectNPC(currentNPC.id);
    }, 1500);
  };

  const acceptQuest = async (quest: NPCQuestGenerated) => {
    if (!profile) return;

    try {
      // Add quest to player_quests
      const { error } = await supabase
        .from('player_quests')
        .insert({
          profile_id: profile.id,
          quest_id: quest.id,
          quest_name: quest.quest_title,
          quest_description: quest.quest_description,
          quest_type: quest.quest_type,
          objectives: quest.objectives,
          rewards: {
            experience: quest.experience_reward,
            gold: quest.gold_reward,
            items: quest.item_rewards
          },
          status: 'active'
        });

      if (error) throw error;

      // Update quest accepts count
      await supabase
        .from('npc_quests_generated')
        .update({ current_accepts: (quest.current_accepts || 0) + 1 })
        .eq('id', quest.id);

      setConversationHistory(prev => [
        ...prev,
        { speaker: currentNPC?.npc_name || 'NPC', text: 'Good luck on your quest!' }
      ]);

      // Reload quests
      if (currentNPC) selectNPC(currentNPC.id);

    } catch (error) {
      console.error('Error accepting quest:', error);
    }
  };

  const endConversation = () => {
    if (currentNPC?.farewell_messages) {
      const farewell = currentNPC.farewell_messages[Math.floor(Math.random() * currentNPC.farewell_messages.length)];
      setConversationHistory(prev => [...prev, { speaker: currentNPC.npc_name, text: farewell }]);
    }

    setTimeout(() => {
      setCurrentNPC(null);
      setConversationHistory([]);
      toggleNPCDialogue();
    }, 1000);
  };

  if (!showNPCDialogue) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">💬</div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {currentNPC ? currentNPC.npc_name : 'Nearby NPCs'}
              </h2>
              {currentNPC && (
                <p className="text-sm text-slate-400">{currentNPC.occupation} • Level {currentNPC.npc_level}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => currentNPC ? endConversation() : toggleNPCDialogue()}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!currentNPC ? (
            // NPC Selection
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white mb-4">Select an NPC to talk to:</h3>
              {nearbyNPCs.map(npc => (
                <button
                  key={npc.id}
                  onClick={() => selectNPC(npc.id)}
                  className="w-full bg-slate-700/50 hover:bg-slate-600/50 p-4 rounded-lg border border-slate-600 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getNPCIcon(npc.npc_type)}</span>
                        <div>
                          <div className="font-semibold text-white">{npc.npc_name}</div>
                          <div className="text-sm text-slate-400">{npc.occupation}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getBehaviorColor(npc.behavior_pattern)}`}>
                        {npc.behavior_pattern}
                      </div>
                      <div className="text-xs text-slate-400">Lv. {npc.npc_level}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-slate-400">Loading...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* NPC Info Card */}
              <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getNPCIcon(currentNPC.npc_type)}</span>
                    <div>
                      <div className="font-semibold text-white text-lg">{currentNPC.npc_name}</div>
                      <div className="text-sm text-slate-400">{currentNPC.occupation}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-300">Relationship</div>
                    <div className="text-xl font-bold text-blue-400">{relationshipLevel}</div>
                  </div>
                </div>
                {currentNPC.background_story && (
                  <p className="text-sm text-slate-300 italic">{currentNPC.background_story}</p>
                )}
              </div>

              {/* Conversation History */}
              <div className="bg-slate-700/20 rounded-lg p-4 max-h-64 overflow-y-auto space-y-3 border border-slate-600">
                {conversationHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`${
                      message.speaker === 'You'
                        ? 'ml-12 bg-blue-600/20 border-blue-500/30'
                        : 'mr-12 bg-slate-600/30 border-slate-500/30'
                    } p-3 rounded-lg border`}
                  >
                    <div className="text-xs font-semibold text-slate-400 mb-1">{message.speaker}</div>
                    <div className="text-sm text-white">{message.text}</div>
                  </div>
                ))}
              </div>

              {/* Available Quests */}
              {availableQuests.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>📜</span> Available Quests
                  </h3>
                  {availableQuests.map(quest => (
                    <div
                      key={quest.id}
                      className="bg-yellow-600/10 border border-yellow-500/30 p-4 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-semibold text-yellow-400">{quest.quest_title}</div>
                          <div className="text-sm text-slate-300">{quest.quest_description}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-slate-400">
                          Rewards: {quest.experience_reward} XP, {quest.gold_reward} Gold
                        </div>
                        <button
                          onClick={() => acceptQuest(quest)}
                          className="bg-yellow-600 hover:bg-yellow-700 px-4 py-1 rounded text-sm font-medium"
                        >
                          Accept Quest
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Dialogue Options */}
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-white mb-3">What would you like to say?</h3>
                {dialogueOptions
                  .filter(option => !option.required_relationship || relationshipLevel >= option.required_relationship)
                  .map(option => (
                    <button
                      key={option.id}
                      onClick={() => selectDialogueOption(option)}
                      className="w-full bg-slate-700/40 hover:bg-slate-600/60 p-3 rounded-lg border border-slate-600 transition-all text-left"
                    >
                      <div className="text-white">{option.player_option}</div>
                      {option.relationship_change !== 0 && (
                        <div className={`text-xs mt-1 ${option.relationship_change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {option.relationship_change > 0 ? '+' : ''}{option.relationship_change} Relationship
                        </div>
                      )}
                    </button>
                  ))}
                <button
                  onClick={endConversation}
                  className="w-full bg-red-600/20 hover:bg-red-600/30 p-3 rounded-lg border border-red-500/30 text-red-400 font-medium"
                >
                  End Conversation
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getNPCIcon(type: string): string {
  const icons: Record<string, string> = {
    merchant: '🛒',
    quest_giver: '📜',
    trainer: '🎓',
    companion: '👥',
    enemy: '⚔️'
  };
  return icons[type] || '👤';
}

function getBehaviorColor(behavior: string): string {
  const colors: Record<string, string> = {
    friendly: 'text-green-400',
    neutral: 'text-yellow-400',
    hostile: 'text-red-400',
    mysterious: 'text-purple-400'
  };
  return colors[behavior] || 'text-slate-400';
}

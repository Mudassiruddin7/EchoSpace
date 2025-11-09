"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import type { Guild, GuildMember, GuildInvite } from '@/lib/gameplayTypes';
import { Card } from '@/components/ui/card';

export default function GuildPanel() {
  const { showGuildPanel, toggleGuildPanel, addNotification } = useGameStore();
  const { profile } = useLobbyStore();
  const [myGuild, setMyGuild] = useState<Guild | null>(null);
  const [guildMembers, setGuildMembers] = useState<GuildMember[]>([]);
  const [availableGuilds, setAvailableGuilds] = useState<Guild[]>([]);
  const [pendingInvites, setPendingInvites] = useState<GuildInvite[]>([]);
  const [activeTab, setActiveTab] = useState<'my-guild' | 'browse' | 'invites' | 'create'>('my-guild');
  const [newGuildName, setNewGuildName] = useState('');
  const [newGuildTag, setNewGuildTag] = useState('');
  const [newGuildDescription, setNewGuildDescription] = useState('');

  useEffect(() => {
    if (!profile?.id || !showGuildPanel) return;

    loadGuildData();
  }, [profile?.id, showGuildPanel]);

  const loadGuildData = async () => {
    if (!profile?.id) return;

    try {
      // Check if user is in a guild
      const { data: membershipData } = await supabase
        .from('guild_members')
        .select('guild_id')
        .eq('profile_id', profile.id)
        .single();

      if (membershipData) {
        // Load guild info
        const { data: guildData } = await supabase
          .from('guilds')
          .select('*')
          .eq('id', membershipData.guild_id)
          .single();

        setMyGuild(guildData);

        // Load members
        const { data: membersData } = await supabase
          .from('guild_members')
          .select('*')
          .eq('guild_id', membershipData.guild_id)
          .order('guild_rank');

        setGuildMembers(membersData || []);
      } else {
        setMyGuild(null);
      }

      // Load available guilds
      const { data: guildsData } = await supabase
        .from('guilds')
        .select('*')
        .eq('is_recruiting', true)
        .order('guild_level', { ascending: false })
        .limit(10);

      setAvailableGuilds(guildsData || []);

      // Load pending invites
      const { data: invitesData } = await supabase
        .from('guild_invites')
        .select('*')
        .eq('invitee_id', profile.id)
        .eq('status', 'pending')
        .gte('expires_at', new Date().toISOString());

      setPendingInvites(invitesData || []);
    } catch (error) {
      console.error('Failed to load guild data:', error);
    }
  };

  const createGuild = async () => {
    if (!profile?.id || !newGuildName.trim()) return;

    try {
      const { data: guildData, error } = await supabase
        .from('guilds')
        .insert({
          guild_name: newGuildName.trim(),
          guild_tag: newGuildTag.trim() || null,
          description: newGuildDescription.trim() || null,
          guild_master_id: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as guild master
      await supabase
        .from('guild_members')
        .insert({
          guild_id: guildData.id,
          profile_id: profile.id,
          guild_rank: 'guild_master',
          can_invite: true,
          can_kick: true,
          can_promote: true,
          can_withdraw_gold: true
        });

      addNotification({
        type: 'achievement',
        message: `Guild "${newGuildName}" created!`,
        icon: '🏰'
      });

      setNewGuildName('');
      setNewGuildTag('');
      setNewGuildDescription('');
      setActiveTab('my-guild');
      loadGuildData();
    } catch (error: any) {
      addNotification({
        type: 'quest_update',
        message: error.message || 'Failed to create guild',
        icon: '❌'
      });
    }
  };

  const joinGuild = async (guildId: string) => {
    if (!profile?.id) return;

    try {
      await supabase
        .from('guild_members')
        .insert({
          guild_id: guildId,
          profile_id: profile.id,
          guild_rank: 'recruit'
        });

      addNotification({
        type: 'achievement',
        message: 'Joined guild successfully!',
        icon: '🎉'
      });

      loadGuildData();
      setActiveTab('my-guild');
    } catch (error) {
      console.error('Failed to join guild:', error);
    }
  };

  const leaveGuild = async () => {
    if (!profile?.id || !myGuild) return;

    const confirmed = confirm('Are you sure you want to leave the guild?');
    if (!confirmed) return;

    try {
      await supabase
        .from('guild_members')
        .delete()
        .eq('profile_id', profile.id)
        .eq('guild_id', myGuild.id);

      addNotification({
        type: 'quest_update',
        message: 'Left guild',
        icon: '👋'
      });

      loadGuildData();
    } catch (error) {
      console.error('Failed to leave guild:', error);
    }
  };

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    try {
      await supabase
        .from('guild_invites')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', inviteId);

      if (accept) {
        const invite = pendingInvites.find(i => i.id === inviteId);
        if (invite) {
          await joinGuild(invite.guild_id);
        }
      }

      loadGuildData();
    } catch (error) {
      console.error('Failed to respond to invite:', error);
    }
  };

  if (!showGuildPanel) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-gray-900/95 border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>🏰</span> Guild System
            </h2>
            {myGuild && (
              <p className="text-sm text-gray-400">
                {myGuild.guild_tag && `[${myGuild.guild_tag}] `}{myGuild.guild_name} • Level {myGuild.guild_level}
              </p>
            )}
          </div>
          <button
            onClick={toggleGuildPanel}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800/50">
          <button
            onClick={() => setActiveTab('my-guild')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'my-guild'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            My Guild
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'browse'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Browse Guilds
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 py-3 font-medium transition-colors relative ${
              activeTab === 'invites'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Invites
            {pendingInvites.length > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingInvites.length}
              </span>
            )}
          </button>
          {!myGuild && (
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-3 font-medium transition-colors ${
                activeTab === 'create'
                  ? 'text-yellow-400 border-b-2 border-yellow-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Create Guild
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'my-guild' && (
            myGuild ? (
              <div className="space-y-4">
                {/* Guild Info */}
                <Card className="bg-gray-800/30 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">
                        {myGuild.guild_tag && `[${myGuild.guild_tag}] `}{myGuild.guild_name}
                      </h3>
                      <p className="text-gray-300 mb-3">{myGuild.description || 'No description'}</p>
                      <div className="flex gap-4 text-sm">
                        <div>
                          <span className="text-gray-400">Level:</span>
                          <span className="text-white font-bold ml-1">{myGuild.guild_level}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Members:</span>
                          <span className="text-white font-bold ml-1">{myGuild.total_members}/{myGuild.max_members}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Gold:</span>
                          <span className="text-yellow-400 font-bold ml-1">{myGuild.guild_gold}💰</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={leaveGuild}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Leave Guild
                    </button>
                  </div>
                </Card>

                {/* Members List */}
                <div>
                  <h3 className="text-white font-bold mb-2">Members ({guildMembers.length})</h3>
                  <div className="space-y-2">
                    {guildMembers.map((member) => (
                      <div key={member.id} className="bg-gray-800/30 rounded p-3 flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">{member.profile_id}</div>
                          <div className="text-xs text-gray-400 capitalize">{member.guild_rank.replace('_', ' ')}</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          Contribution: <span className="text-white">{member.contribution_points}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-12">
                <div className="text-6xl mb-4">🏰</div>
                <p>You are not in a guild</p>
                <p className="text-sm mt-2">Browse available guilds or create your own!</p>
              </div>
            )
          )}

          {activeTab === 'browse' && (
            availableGuilds.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No guilds available</div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {availableGuilds.map((guild) => (
                  <Card key={guild.id} className="bg-gray-800/30 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-white font-bold">
                          {guild.guild_tag && `[${guild.guild_tag}] `}{guild.guild_name}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">{guild.description || 'No description'}</p>
                        <div className="flex gap-4 text-xs text-gray-400 mt-2">
                          <span>Level {guild.guild_level}</span>
                          <span>{guild.total_members}/{guild.max_members} members</span>
                        </div>
                      </div>
                      <button
                        onClick={() => joinGuild(guild.id)}
                        disabled={!!myGuild}
                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors"
                      >
                        Join
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {activeTab === 'invites' && (
            pendingInvites.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No pending invites</div>
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <Card key={invite.id} className="bg-gray-800/30 p-4">
                    <div className="mb-3">
                      <div className="text-white font-medium">Guild Invitation</div>
                      {invite.message && (
                        <p className="text-sm text-gray-400 mt-1">{invite.message}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToInvite(invite.id, true)}
                        className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respondToInvite(invite.id, false)}
                        className="flex-1 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}

          {activeTab === 'create' && (
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Guild Name *</label>
                <input
                  type="text"
                  value={newGuildName}
                  onChange={(e) => setNewGuildName(e.target.value)}
                  placeholder="Enter guild name"
                  maxLength={50}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Guild Tag (Optional)</label>
                <input
                  type="text"
                  value={newGuildTag}
                  onChange={(e) => setNewGuildTag(e.target.value.toUpperCase())}
                  placeholder="TAG"
                  maxLength={5}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-purple-500 outline-none uppercase"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 block mb-1">Description (Optional)</label>
                <textarea
                  value={newGuildDescription}
                  onChange={(e) => setNewGuildDescription(e.target.value)}
                  placeholder="Describe your guild..."
                  maxLength={200}
                  rows={4}
                  className="w-full bg-gray-800 text-white px-4 py-2 rounded border border-gray-700 focus:border-purple-500 outline-none resize-none"
                />
              </div>

              <button
                onClick={createGuild}
                disabled={!newGuildName.trim()}
                className="w-full py-3 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold transition-colors"
              >
                Create Guild
              </button>

              <p className="text-xs text-gray-400 text-center">
                Creating a guild costs 1,000 gold
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

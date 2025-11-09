"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import type { Party, PartyMember, PartyInvite } from '@/lib/socialTypes';
import { Card } from '@/components/ui/card';

export default function PartyPanel() {
  const { showPartyPanel, togglePartyPanel, currentPartyId, setCurrentPartyId, addNotification } = useGameStore();
  const { profile, currentLobby } = useLobbyStore();
  const [currentParty, setCurrentParty] = useState<Party | null>(null);
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);
  const [availableParties, setAvailableParties] = useState<Party[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PartyInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'current' | 'browse' | 'invites'>('current');

  useEffect(() => {
    if (!profile?.id || !showPartyPanel) return;

    loadPartyData();
    subscribeToPartyUpdates();
  }, [profile?.id, showPartyPanel, currentLobby]);

  const loadPartyData = async () => {
    if (!profile?.id || !currentLobby?.lobbyId) return;

    try {
      // Check if user is in a party
      const { data: memberData } = await supabase
        .from('party_members')
        .select('party_id')
        .eq('profile_id', profile.id)
        .single();

      if (memberData) {
        setCurrentPartyId(memberData.party_id);
        await loadCurrentParty(memberData.party_id);
      }

      // Load available parties in lobby
      const { data: partiesData } = await supabase
        .from('parties')
        .select('*')
        .eq('lobby_id', currentLobby.lobbyId)
        .is('disbanded_at', null)
        .eq('is_public', true);

      setAvailableParties(partiesData || []);

      // Load pending invites
      const { data: invitesData } = await supabase
        .from('party_invites')
        .select(`
          *,
          party:parties(*),
          sender:profiles!party_invites_sender_profile_id_fkey(username)
        `)
        .eq('invitee_profile_id', profile.id)
        .eq('status', 'pending');

      setPendingInvites(invitesData || []);
    } catch (error) {
      console.error('Failed to load party data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentParty = async (partyId: string) => {
    const { data: partyData } = await supabase
      .from('parties')
      .select('*')
      .eq('id', partyId)
      .single();

    const { data: membersData } = await supabase
      .from('party_members')
      .select(`
        *,
        profile:profiles(username, selected_avatar_model)
      `)
      .eq('party_id', partyId);

    setCurrentParty(partyData);
    setPartyMembers(membersData || []);
  };

  const subscribeToPartyUpdates = () => {
    if (!currentPartyId) return;

    const channel = supabase
      .channel(`party_${currentPartyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'party_members',
        filter: `party_id=eq.${currentPartyId}`
      }, () => {
        loadCurrentParty(currentPartyId);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const createParty = async () => {
    if (!profile?.id || !currentLobby?.lobbyId) return;

    try {
      const { data: partyData, error } = await supabase
        .from('parties')
        .insert({
          leader_profile_id: profile.id,
          lobby_id: currentLobby.lobbyId,
          party_name: `${profile.username}'s Party`,
          is_public: true
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as first member
      await supabase
        .from('party_members')
        .insert({
          party_id: partyData.id,
          profile_id: profile.id,
          role: 'leader'
        });

      setCurrentPartyId(partyData.id);
      addNotification({
        type: 'achievement',
        message: 'Party created successfully!',
        icon: '🎉'
      });
      
      await loadPartyData();
    } catch (error) {
      console.error('Failed to create party:', error);
      addNotification({
        type: 'quest_update',
        message: 'Failed to create party',
        icon: '❌'
      });
    }
  };

  const joinParty = async (partyId: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('party_members')
        .insert({
          party_id: partyId,
          profile_id: profile.id,
          role: 'member'
        });

      if (error) throw error;

      setCurrentPartyId(partyId);
      addNotification({
        type: 'achievement',
        message: 'Joined party successfully!',
        icon: '👥'
      });
      
      await loadPartyData();
    } catch (error) {
      console.error('Failed to join party:', error);
    }
  };

  const leaveParty = async () => {
    if (!profile?.id || !currentPartyId) return;

    try {
      await supabase
        .from('party_members')
        .delete()
        .eq('party_id', currentPartyId)
        .eq('profile_id', profile.id);

      setCurrentPartyId(null);
      setCurrentParty(null);
      setPartyMembers([]);
      
      addNotification({
        type: 'quest_update',
        message: 'Left party',
        icon: '👋'
      });
      
      await loadPartyData();
    } catch (error) {
      console.error('Failed to leave party:', error);
    }
  };

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    try {
      const { data: invite } = await supabase
        .from('party_invites')
        .update({
          status: accept ? 'accepted' : 'declined',
          responded_at: new Date().toISOString()
        })
        .eq('id', inviteId)
        .select()
        .single();

      if (accept && invite) {
        await joinParty(invite.party_id);
      }

      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (error) {
      console.error('Failed to respond to invite:', error);
    }
  };

  if (!showPartyPanel) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] bg-gray-900/95 border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>👥</span> Party System
            </h2>
            {currentParty && (
              <p className="text-sm text-gray-400">
                {partyMembers.length} / {currentParty.max_members} Members
              </p>
            )}
          </div>
          <button
            onClick={togglePartyPanel}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800/50">
          <button
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'current'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Current Party
          </button>
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'browse'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Browse Parties ({availableParties.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 py-3 font-medium transition-colors relative ${
              activeTab === 'invites'
                ? 'text-green-400 border-b-2 border-green-400'
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'current' && (
            <CurrentPartyTab
              currentParty={currentParty}
              partyMembers={partyMembers}
              onCreateParty={createParty}
              onLeaveParty={leaveParty}
              isLeader={currentParty?.leader_profile_id === profile?.id}
              loading={loading}
            />
          )}

          {activeTab === 'browse' && (
            <BrowsePartiesTab
              parties={availableParties}
              currentPartyId={currentPartyId}
              onJoinParty={joinParty}
              loading={loading}
            />
          )}

          {activeTab === 'invites' && (
            <InvitesTab
              invites={pendingInvites}
              onRespond={respondToInvite}
              loading={loading}
            />
          )}
        </div>
      </Card>
    </div>
  );
}

function CurrentPartyTab({ currentParty, partyMembers, onCreateParty, onLeaveParty, isLeader, loading }: any) {
  if (loading) return <div className="text-center text-gray-500">Loading...</div>;

  if (!currentParty) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-xl font-bold text-white mb-2">No Active Party</h3>
        <p className="text-gray-400 mb-6">Create a party to play with friends!</p>
        <button
          onClick={onCreateParty}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Create Party
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-bold text-white mb-2">{currentParty.party_name}</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">XP Sharing:</span>{' '}
            <span className="text-green-400">{currentParty.party_settings.xp_sharing ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div>
            <span className="text-gray-400">Loot:</span>{' '}
            <span className="text-blue-400 capitalize">{currentParty.party_settings.loot_distribution.replace('_', ' ')}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-white font-semibold">Members ({partyMembers.length})</h4>
        {partyMembers.map((member: PartyMember) => (
          <div key={member.id} className="bg-gray-800/30 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {member.profile?.username?.charAt(0) || '?'}
              </div>
              <div>
                <div className="text-white font-medium">{member.profile?.username || 'Unknown'}</div>
                <div className="text-xs text-gray-400 capitalize">{member.role}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-yellow-400">{member.contribution_score} pts</div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onLeaveParty}
        className="w-full mt-6 py-2 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-700 font-medium transition-colors"
      >
        Leave Party
      </button>
    </div>
  );
}

function BrowsePartiesTab({ parties, currentPartyId, onJoinParty, loading }: any) {
  if (loading) return <div className="text-center text-gray-500">Loading...</div>;

  if (parties.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No public parties available in this lobby
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {parties.map((party: Party) => (
        <div key={party.id} className="bg-gray-800/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-white font-semibold">{party.party_name}</h4>
            <span className="text-sm text-gray-400">
              {/* Member count would need to be fetched */}
              ? / {party.max_members}
            </span>
          </div>
          <button
            onClick={() => onJoinParty(party.id)}
            disabled={currentPartyId !== null}
            className={`w-full py-2 rounded font-medium transition-colors ${
              currentPartyId
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {currentPartyId ? 'Already in Party' : 'Join Party'}
          </button>
        </div>
      ))}
    </div>
  );
}

function InvitesTab({ invites, onRespond, loading }: any) {
  if (loading) return <div className="text-center text-gray-500">Loading...</div>;

  if (invites.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No pending invites
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invites.map((invite: PartyInvite) => (
        <div key={invite.id} className="bg-gray-800/30 rounded-lg p-4">
          <div className="mb-3">
            <div className="text-white font-medium mb-1">
              Party Invite from {invite.sender?.username}
            </div>
            {invite.message && (
              <p className="text-sm text-gray-400">{invite.message}</p>
            )}
            <div className="text-xs text-gray-500 mt-1">
              Expires: {new Date(invite.expires_at).toLocaleTimeString()}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onRespond(invite.id, true)}
              className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => onRespond(invite.id, false)}
              className="flex-1 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

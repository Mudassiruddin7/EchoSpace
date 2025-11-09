"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import type { Friend } from '@/lib/socialTypes';
import { Card } from '@/components/ui/card';

export default function FriendsList() {
  const { showFriendsList, toggleFriendsList, addNotification } = useGameStore();
  const { profile } = useLobbyStore();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.id || !showFriendsList) return;

    loadFriends();
    subscribeToFriendUpdates();
  }, [profile?.id, showFriendsList]);

  const loadFriends = async () => {
    if (!profile?.id) return;

    try {
      // Load accepted friends
      const friendsResult = await supabase
        .from('friend_lists')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('status', 'accepted');

      setFriends(friendsResult.data || []);

      // Load pending friend requests
      const requestsResult = await supabase
        .from('friend_lists')
        .select('*')
        .eq('friend_profile_id', profile.id)
        .eq('status', 'pending');

      setPendingRequests(requestsResult.data || []);
    } catch (error) {
      console.error('Failed to load friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToFriendUpdates = () => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`friends_${profile.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_lists',
        filter: `profile_id=eq.${profile.id}`
      }, () => {
        loadFriends();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || !profile?.id) return;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, selected_avatar_model')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', profile.id)
        .limit(10);

      setSearchResults(data || []);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!profile?.id) return;

    try {
      const { error } = await supabase
        .from('friend_lists')
        .insert({
          profile_id: profile.id,
          friend_profile_id: friendId,
          status: 'pending'
        });

      if (error) throw error;

      addNotification({
        type: 'achievement',
        message: 'Friend request sent!',
        icon: '👋'
      });

      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Failed to send friend request:', error);
      addNotification({
        type: 'quest_update',
        message: 'Failed to send friend request',
        icon: '❌'
      });
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    try {
      if (accept) {
        await supabase
          .from('friend_lists')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        addNotification({
          type: 'achievement',
          message: 'Friend request accepted!',
          icon: '🤝'
        });
      } else {
        await supabase
          .from('friend_lists')
          .delete()
          .eq('id', requestId);
      }

      loadFriends();
    } catch (error) {
      console.error('Failed to respond to request:', error);
    }
  };

  const removeFriend = async (friendshipId: string) => {
    try {
      await supabase
        .from('friend_lists')
        .delete()
        .eq('id', friendshipId);

      addNotification({
        type: 'quest_update',
        message: 'Friend removed',
        icon: '👋'
      });

      loadFriends();
    } catch (error) {
      console.error('Failed to remove friend:', error);
    }
  };

  if (!showFriendsList) return null;

  const isOnline = (lastSeen: string) => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return new Date(lastSeen) > fiveMinutesAgo;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[90vh] bg-gray-900/95 border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>👫</span> Friends
            </h2>
            <p className="text-sm text-gray-400">
              {friends.length} Friends • {friends.filter(f => isOnline(f.friend?.last_seen || '')).length} Online
            </p>
          </div>
          <button
            onClick={toggleFriendsList}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
              placeholder="Search users..."
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 outline-none"
            />
            <button
              onClick={searchUsers}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 bg-gray-800 rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <div key={user.id} className="p-3 flex items-center justify-between border-b border-gray-700 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {user.username.charAt(0)}
                    </div>
                    <span className="text-white">{user.username}</span>
                  </div>
                  <button
                    onClick={() => sendFriendRequest(user.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-800/50">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 font-medium transition-colors ${
              activeTab === 'friends'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 font-medium transition-colors relative ${
              activeTab === 'requests'
                ? 'text-green-400 border-b-2 border-green-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-gray-500 py-12">Loading...</div>
          ) : activeTab === 'friends' ? (
            friends.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="text-6xl mb-4">👥</div>
                <p>No friends yet. Search to add friends!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div key={friend.id} className="bg-gray-800/30 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          👤
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900" />
                      </div>
                      <div>
                        <div className="text-white font-medium">{friend.friend_profile_id}</div>
                        <div className="text-xs text-gray-400">
                          Level {friend.friendship_level} • Friends since {new Date(friend.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFriend(friend.id)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            pendingRequests.length === 0 ? (
              <div className="text-center text-gray-500 py-12">No pending requests</div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="bg-gray-800/30 rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        👤
                      </div>
                      <div>
                        <div className="text-white font-medium">{request.profile_id}</div>
                        <div className="text-xs text-gray-400">Wants to be friends</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => respondToRequest(request.id, true)}
                        className="flex-1 py-2 rounded bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => respondToRequest(request.id, false)}
                        className="flex-1 py-2 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Card>
    </div>
  );
}

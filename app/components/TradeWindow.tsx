"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import type { TradeOffer } from '@/lib/socialTypes';
import { Card } from '@/components/ui/card';

export default function TradeWindow() {
  const { 
    showTradeWindow, 
    toggleTradeWindow, 
    pendingTradeOffer,
    setPendingTradeOffer,
    addNotification 
  } = useGameStore();
  const { profile } = useLobbyStore();
  const [tradeOffer, setTradeOffer] = useState<TradeOffer | null>(null);
  const [myItems, setMyItems] = useState<any[]>([]);
  const [selectedMyItems, setSelectedMyItems] = useState<string[]>([]);
  const [myGoldOffer, setMyGoldOffer] = useState(0);
  const [theirItems, setTheirItems] = useState<any[]>([]);
  const [theirGoldOffer, setTheirGoldOffer] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes

  useEffect(() => {
    if (!profile?.id || !showTradeWindow) return;

    if (pendingTradeOffer) {
      loadTradeOffer(pendingTradeOffer);
    }
    loadMyInventory();
  }, [profile?.id, showTradeWindow, pendingTradeOffer]);

  useEffect(() => {
    if (!tradeOffer || tradeOffer.status !== 'pending') return;

    const timer = setInterval(() => {
      const expiresAt = new Date(tradeOffer.expires_at).getTime();
      const now = Date.now();
      const remaining = Math.floor((expiresAt - now) / 1000);

      if (remaining <= 0) {
        handleCloseTrade();
      } else {
        setTimeRemaining(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [tradeOffer]);

  const loadTradeOffer = async (offerId: string) => {
    try {
      const { data } = await supabase
        .from('trade_offers')
        .select('*')
        .eq('id', offerId)
        .single();

      if (data) {
        setTradeOffer(data);
        const isRecipient = data.recipient_profile_id === profile?.id;
        setSelectedMyItems((isRecipient ? data.recipient_items : data.initiator_items).map((item: any) => item.item_id) || []);
        setMyGoldOffer(isRecipient ? data.recipient_gold : data.initiator_gold || 0);
        setTheirItems((isRecipient ? data.initiator_items : data.recipient_items) || []);
        setTheirGoldOffer(isRecipient ? data.initiator_gold : data.recipient_gold || 0);
      }
    } catch (error) {
      console.error('Failed to load trade offer:', error);
    }
  };

  const loadMyInventory = async () => {
    if (!profile?.id) return;

    try {
      const { data } = await supabase
        .from('inventory')
        .select('*')
        .eq('profile_id', profile.id)
        .eq('equipped', false);

      setMyItems(data || []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
  };

  const createTradeOffer = async (targetProfileId: string) => {
    if (!profile?.id) return;

    try {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from('trade_offers')
        .insert({
          initiator_profile_id: profile.id,
          recipient_profile_id: targetProfileId,
          initiator_items: selectedMyItems.map(id => ({ item_id: id, quantity: 1 })),
          initiator_gold: myGoldOffer,
          recipient_items: [],
          recipient_gold: 0,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (data) {
        setTradeOffer(data);
        addNotification({
          type: 'achievement',
          message: 'Trade offer sent!',
          icon: '💱'
        });
      }
    } catch (error) {
      console.error('Failed to create trade offer:', error);
    }
  };

  const updateTradeOffer = async () => {
    if (!tradeOffer || !profile?.id) return;

    const isReceiver = tradeOffer.recipient_profile_id === profile.id;

    try {
      const updates = isReceiver
        ? {
            recipient_items: selectedMyItems.map(id => ({ item_id: id, quantity: 1 })),
            recipient_gold: myGoldOffer,
            recipient_confirmed: false
          }
        : {
            initiator_items: selectedMyItems.map(id => ({ item_id: id, quantity: 1 })),
            initiator_gold: myGoldOffer,
            initiator_confirmed: false
          };

      await supabase
        .from('trade_offers')
        .update(updates)
        .eq('id', tradeOffer.id);

      loadTradeOffer(tradeOffer.id);
    } catch (error) {
      console.error('Failed to update trade offer:', error);
    }
  };

  const confirmTrade = async () => {
    if (!tradeOffer || !profile?.id) return;

    const isReceiver = tradeOffer.recipient_profile_id === profile.id;

    try {
      const updates = isReceiver
        ? { recipient_confirmed: true }
        : { initiator_confirmed: true };

      await supabase
        .from('trade_offers')
        .update(updates)
        .eq('id', tradeOffer.id);

      // Check if both confirmed
      const { data: updatedOffer } = await supabase
        .from('trade_offers')
        .select('*')
        .eq('id', tradeOffer.id)
        .single();

      if (updatedOffer?.initiator_confirmed && updatedOffer?.recipient_confirmed) {
        await executeTrade(updatedOffer);
      } else {
        addNotification({
          type: 'achievement',
          message: 'Trade confirmed! Waiting for other player...',
          icon: '✅'
        });
        loadTradeOffer(tradeOffer.id);
      }
    } catch (error) {
      console.error('Failed to confirm trade:', error);
    }
  };

  const executeTrade = async (offer: TradeOffer) => {
    try {
      // Transfer items from initiator to recipient
      for (const item of offer.initiator_items) {
        await supabase
          .from('inventory')
          .update({ profile_id: offer.recipient_profile_id })
          .eq('id', item.item_id);
      }

      // Transfer items from recipient to initiator
      for (const item of offer.recipient_items) {
        await supabase
          .from('inventory')
          .update({ profile_id: offer.initiator_profile_id })
          .eq('id', item.item_id);
      }

      // Transfer gold
      if (offer.initiator_gold > 0) {
        await supabase.rpc('add_gold', {
          p_profile_id: offer.recipient_profile_id,
          amount: offer.initiator_gold
        });
        await supabase.rpc('add_gold', {
          p_profile_id: offer.initiator_profile_id,
          amount: -offer.initiator_gold
        });
      }

      if (offer.recipient_gold > 0) {
        await supabase.rpc('add_gold', {
          p_profile_id: offer.initiator_profile_id,
          amount: offer.recipient_gold
        });
        await supabase.rpc('add_gold', {
          p_profile_id: offer.recipient_profile_id,
          amount: -offer.recipient_gold
        });
      }

      // Mark trade as completed
      await supabase
        .from('trade_offers')
        .update({ status: 'completed' })
        .eq('id', offer.id);

      addNotification({
        type: 'achievement',
        message: 'Trade completed successfully!',
        icon: '🎉'
      });

      handleCloseTrade();
    } catch (error) {
      console.error('Failed to execute trade:', error);
      addNotification({
        type: 'quest_update',
        message: 'Trade failed!',
        icon: '❌'
      });
    }
  };

  const cancelTrade = async () => {
    if (!tradeOffer) return;

    try {
      await supabase
        .from('trade_offers')
        .update({ status: 'cancelled' })
        .eq('id', tradeOffer.id);

      addNotification({
        type: 'quest_update',
        message: 'Trade cancelled',
        icon: '❌'
      });

      handleCloseTrade();
    } catch (error) {
      console.error('Failed to cancel trade:', error);
    }
  };

  const handleCloseTrade = () => {
    setTradeOffer(null);
    setSelectedMyItems([]);
    setMyGoldOffer(0);
    setTheirItems([]);
    setTheirGoldOffer(0);
    setPendingTradeOffer(null);
    toggleTradeWindow();
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedMyItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: 'text-gray-400',
      uncommon: 'text-green-400',
      rare: 'text-blue-400',
      epic: 'text-purple-400',
      legendary: 'text-orange-400'
    };
    return colors[rarity] || 'text-gray-400';
  };

  if (!showTradeWindow) return null;

  const isReceiver = tradeOffer?.recipient_profile_id === profile?.id;
  const myConfirmed = isReceiver ? tradeOffer?.recipient_confirmed : tradeOffer?.initiator_confirmed;
  const theirConfirmed = isReceiver ? tradeOffer?.initiator_confirmed : tradeOffer?.recipient_confirmed;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-5xl max-h-[90vh] bg-gray-900/95 border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span>💱</span> Trade Window
            </h2>
            {tradeOffer && (
              <p className="text-sm text-gray-400">
                Time Remaining: {minutes}:{seconds.toString().padStart(2, '0')}
              </p>
            )}
          </div>
          <button
            onClick={handleCloseTrade}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Trade Area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Your Offer */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white border-b border-gray-700 pb-2">
                Your Offer {myConfirmed && <span className="text-green-400">✓ Confirmed</span>}
              </h3>

              {/* Gold Input */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Gold Amount</label>
                <input
                  type="number"
                  value={myGoldOffer}
                  onChange={(e) => setMyGoldOffer(Math.max(0, parseInt(e.target.value) || 0))}
                  disabled={myConfirmed}
                  className="w-full bg-gray-800 text-white px-3 py-2 rounded border border-gray-700 focus:border-yellow-500 outline-none disabled:opacity-50"
                />
              </div>

              {/* Item Selection */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Select Items to Trade</label>
                <div className="bg-gray-800/50 rounded-lg p-3 max-h-96 overflow-y-auto space-y-2">
                  {myItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No items to trade</p>
                  ) : (
                    myItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => !myConfirmed && toggleItemSelection(item.id)}
                        className={`p-3 rounded cursor-pointer transition-all ${
                          selectedMyItems.includes(item.id)
                            ? 'bg-purple-600/30 border-2 border-purple-500'
                            : 'bg-gray-700/50 border-2 border-transparent hover:border-gray-600'
                        } ${myConfirmed ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className={`font-medium ${getRarityColor(item.item_rarity)}`}>
                              {item.item_name}
                            </div>
                            <div className="text-xs text-gray-400">
                              {item.item_type} • Qty: {item.quantity}
                            </div>
                          </div>
                          {selectedMyItems.includes(item.id) && (
                            <span className="text-green-400 text-xl">✓</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Their Offer */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white border-b border-gray-700 pb-2">
                Their Offer {theirConfirmed && <span className="text-green-400">✓ Confirmed</span>}
              </h3>

              {/* Their Gold */}
              <div>
                <label className="text-sm text-gray-400 block mb-1">Gold Amount</label>
                <div className="w-full bg-gray-800 text-yellow-400 px-3 py-2 rounded border border-gray-700 font-bold">
                  {theirGoldOffer} 💰
                </div>
              </div>

              {/* Their Items */}
              <div>
                <label className="text-sm text-gray-400 block mb-2">Items Offered</label>
                <div className="bg-gray-800/50 rounded-lg p-3 max-h-96 overflow-y-auto space-y-2">
                  {theirItems.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No items offered</p>
                  ) : (
                    theirItems.map((item, index) => (
                      <div key={index} className="p-3 rounded bg-gray-700/50 border-2 border-gray-600">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-blue-400">{item.name}</div>
                            <div className="text-xs text-gray-400">
                              {item.type} • Qty: {item.quantity}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-700 flex gap-3">
          {!myConfirmed && tradeOffer && (
            <>
              <button
                onClick={updateTradeOffer}
                className="flex-1 py-3 rounded bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
              >
                Update Offer
              </button>
              <button
                onClick={confirmTrade}
                className="flex-1 py-3 rounded bg-green-600 hover:bg-green-700 text-white font-medium transition-colors"
              >
                Confirm Trade
              </button>
            </>
          )}
          {myConfirmed && !theirConfirmed && (
            <div className="flex-1 text-center py-3 text-yellow-400">
              Waiting for other player to confirm...
            </div>
          )}
          <button
            onClick={cancelTrade}
            className="px-6 py-3 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
          >
            Cancel Trade
          </button>
        </div>
      </Card>
    </div>
  );
}

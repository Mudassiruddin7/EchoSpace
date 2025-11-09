"use client";

import { useEffect, useState } from 'react';
import { useGameStore } from '@/lib/gameStore';
import { useLobbyStore } from '@/lib/lobbyStore';
import { supabase } from '@/lib/supabase';
import type { InventoryItem } from '@/lib/gameTypes';
import { Card } from '@/components/ui/card';

const RARITY_COLORS = {
  common: 'border-gray-500 bg-gray-800/50',
  rare: 'border-blue-500 bg-blue-900/30',
  epic: 'border-purple-500 bg-purple-900/30',
  legendary: 'border-yellow-500 bg-yellow-900/30',
};

const TYPE_ICONS = {
  weapon: '⚔️',
  armor: '🛡️',
  consumable: '🧪',
  quest_item: '📜',
  cosmetic: '✨',
};

export default function InventoryPanel() {
  console.log('🔵 InventoryPanel component MOUNTED');
  
  const { showInventory, toggleInventory, inventory, setInventory, equipItem, unequipItem } = useGameStore();
  const { profile } = useLobbyStore();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  console.log('🔵 InventoryPanel hook values - profile:', profile?.id, 'showInventory:', showInventory);

  useEffect(() => {
    if (!profile?.id || !showInventory) return;

    const fetchInventory = async () => {
      try {
        const { data, error } = await supabase
          .from('inventory')
          .select('*')
          .eq('profile_id', profile.id)
          .order('acquired_at', { ascending: false });

        if (error) {
          console.error('Error fetching inventory:', error);
          return;
        }

        if (data) {
          setInventory(data as InventoryItem[]);
        }
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();

    // Subscribe to real-time inventory updates
    const channel = supabase
      .channel(`inventory_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `profile_id=eq.${profile.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setInventory([...inventory, payload.new as InventoryItem]);
          } else if (payload.eventType === 'DELETE') {
            setInventory(inventory.filter(item => item.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setInventory(inventory.map(item => 
              item.id === payload.new.id ? payload.new as InventoryItem : item
            ));
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [profile?.id, showInventory, setInventory]);

  const handleEquipToggle = async (item: InventoryItem) => {
    if (!profile?.id) return;

    try {
      const newEquippedState = !item.equipped;

      // If equipping, unequip other items in the same slot
      if (newEquippedState && item.item_type !== 'consumable') {
        const sameTypeItems = inventory.filter(
          i => i.item_type === item.item_type && i.equipped && i.id !== item.id
        );

        for (const existingItem of sameTypeItems) {
          await supabase
            .from('inventory')
            .update({ equipped: false })
            .eq('id', existingItem.id);
          unequipItem(existingItem.id);
        }
      }

      // Toggle current item
      const { error } = await supabase
        .from('inventory')
        .update({ equipped: newEquippedState })
        .eq('id', item.id);

      if (error) throw error;

      if (newEquippedState) {
        equipItem(item.id);
      } else {
        unequipItem(item.id);
      }
    } catch (error) {
      console.error('Failed to toggle equip:', error);
    }
  };

  const handleUseItem = async (item: InventoryItem) => {
    if (item.item_type !== 'consumable') return;

    try {
      // Decrease quantity or remove if last one
      if (item.quantity > 1) {
        await supabase
          .from('inventory')
          .update({ quantity: item.quantity - 1 })
          .eq('id', item.id);
      } else {
        await supabase
          .from('inventory')
          .delete()
          .eq('id', item.id);
      }

      // TODO: Apply item effects (health, mana, buffs)
      console.log(`Used ${item.item_name}`);
    } catch (error) {
      console.error('Failed to use item:', error);
    }
  };

  console.log('📦 InventoryPanel render - showInventory:', showInventory, 'inventory items:', inventory.length);
  
  if (!showInventory) return null;

  console.log('✅ InventoryPanel RENDERING UI');
  
  const equippedItems = inventory.filter(item => item.equipped);
  const backpackItems = inventory.filter(item => !item.equipped);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-5xl max-h-[90vh] bg-gray-900/95 border-gray-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Inventory</h2>
            <p className="text-sm text-gray-400">{inventory.length} / 50 Items</p>
          </div>
          <button
            onClick={toggleInventory}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Equipped Items Section */}
          <div>
            <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <span>⚡</span> Equipped
            </h3>
            {equippedItems.length === 0 ? (
              <div className="text-gray-500 text-sm italic py-4 text-center bg-gray-800/30 rounded-lg">
                No items equipped
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {equippedItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Backpack Section */}
          <div>
            <h3 className="text-lg font-semibold text-blue-400 mb-3 flex items-center gap-2">
              <span>🎒</span> Backpack
            </h3>
            {loading ? (
              <div className="text-gray-500 text-sm py-4 text-center">Loading...</div>
            ) : backpackItems.length === 0 ? (
              <div className="text-gray-500 text-sm italic py-4 text-center bg-gray-800/30 rounded-lg">
                Your backpack is empty
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-3">
                {backpackItems.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onClick={() => setSelectedItem(item)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Item Details Panel */}
        {selectedItem && (
          <div className="border-t border-gray-700 p-4 bg-gray-800/50">
            <div className="flex gap-4">
              <div className={`w-20 h-20 rounded-lg border-2 ${RARITY_COLORS[selectedItem.item_rarity]} flex items-center justify-center text-4xl`}>
                {TYPE_ICONS[selectedItem.item_type]}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-bold text-white">{selectedItem.item_name}</h4>
                    <div className="flex gap-2 text-xs mt-1">
                      <span className={`px-2 py-0.5 rounded ${RARITY_COLORS[selectedItem.item_rarity]} capitalize`}>
                        {selectedItem.item_rarity}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-gray-700 capitalize">
                        {selectedItem.item_type}
                      </span>
                      {selectedItem.quantity > 1 && (
                        <span className="px-2 py-0.5 rounded bg-blue-900/50 text-blue-300">
                          ×{selectedItem.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mb-3">
                  {selectedItem.metadata?.description || 'No description available.'}
                </p>
                
                {/* Item Stats */}
                {selectedItem.metadata && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {selectedItem.metadata.damage && (
                      <div className="text-xs">
                        <span className="text-gray-400">Damage:</span>{' '}
                        <span className="text-red-400 font-semibold">{selectedItem.metadata.damage}</span>
                      </div>
                    )}
                    {selectedItem.metadata.defense && (
                      <div className="text-xs">
                        <span className="text-gray-400">Defense:</span>{' '}
                        <span className="text-blue-400 font-semibold">{selectedItem.metadata.defense}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {selectedItem.item_type !== 'consumable' && selectedItem.item_type !== 'quest_item' && (
                    <button
                      onClick={() => handleEquipToggle(selectedItem)}
                      className={`px-4 py-2 rounded font-medium transition-colors ${
                        selectedItem.equipped
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {selectedItem.equipped ? 'Unequip' : 'Equip'}
                    </button>
                  )}
                  {selectedItem.item_type === 'consumable' && (
                    <button
                      onClick={() => handleUseItem(selectedItem)}
                      className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
                    >
                      Use
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function ItemCard({ 
  item, 
  isSelected, 
  onClick 
}: { 
  item: InventoryItem; 
  isSelected: boolean; 
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square rounded-lg border-2 transition-all duration-200
        ${RARITY_COLORS[item.item_rarity]}
        ${isSelected ? 'ring-2 ring-white scale-105' : 'hover:scale-110'}
        ${item.equipped ? 'shadow-lg shadow-yellow-500/50' : ''}
      `}
    >
      <div className="w-full h-full flex flex-col items-center justify-center p-2">
        <div className="text-3xl mb-1">{TYPE_ICONS[item.item_type]}</div>
        {item.quantity > 1 && (
          <div className="absolute top-1 right-1 bg-gray-900 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            {item.quantity}
          </div>
        )}
        {item.equipped && (
          <div className="absolute bottom-1 left-1 right-1">
            <div className="bg-yellow-500 text-black text-[10px] font-bold px-1 py-0.5 rounded">
              EQUIPPED
            </div>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1 truncate rounded-b-lg">
        {item.item_name}
      </div>
    </button>
  );
}

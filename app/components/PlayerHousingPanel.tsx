'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLobbyStore } from '@/lib/lobbyStore';
import { useGameStore } from '@/lib/gameStore';
import type { 
  PlayerHouse, 
  FurnitureCatalog, 
  PlacedFurniture,
  HouseVisitor 
} from '@/lib/phase4Types';

export default function PlayerHousingPanel() {
  const { profile } = useLobbyStore();
  const { showHousing, toggleHousing } = useGameStore();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'furniture' | 'visitors' | 'settings'>('overview');
  
  // House data
  const [myHouse, setMyHouse] = useState<PlayerHouse | null>(null);
  const [placedFurniture, setPlacedFurniture] = useState<PlacedFurniture[]>([]);
  const [furnitureCatalog, setFurnitureCatalog] = useState<FurnitureCatalog[]>([]);
  const [visitors, setVisitors] = useState<HouseVisitor[]>([]);
  const [hasHouse, setHasHouse] = useState(false);
  
  // Furniture placement
  const [selectedFurniture, setSelectedFurniture] = useState<FurnitureCatalog | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (showHousing && profile) {
      loadHouseData();
      loadFurnitureCatalog();
    }
  }, [showHousing, profile]);

  const loadHouseData = async () => {
    if (!profile) return;

    try {
      // Load player's house
      const { data: houseData, error: houseError } = await supabase
        .from('player_houses')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (houseError && houseError.code !== 'PGRST116') throw houseError;

      if (houseData) {
        setMyHouse(houseData);
        setHasHouse(true);

        // Load placed furniture
        const { data: furnitureData, error: furnitureError } = await supabase
          .from('placed_furniture')
          .select('*')
          .eq('house_id', houseData.id);

        if (furnitureError) throw furnitureError;
        setPlacedFurniture(furnitureData || []);

        // Load visitors
        const { data: visitorsData, error: visitorsError } = await supabase
          .from('house_visitors')
          .select(`
            *,
            profiles:visitor_id (username, avatar_url)
          `)
          .eq('house_id', houseData.id)
          .order('last_visit', { ascending: false })
          .limit(20);

        if (visitorsError) throw visitorsError;
        setVisitors(visitorsData || []);

      } else {
        setHasHouse(false);
      }

    } catch (error) {
      console.error('Error loading house data:', error);
    }
  };

  const loadFurnitureCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('furniture_catalog')
        .select('*')
        .order('furniture_type', { ascending: true });

      if (error) throw error;
      setFurnitureCatalog(data || []);

    } catch (error) {
      console.error('Error loading furniture catalog:', error);
    }
  };

  const purchaseHouse = async (houseType: PlayerHouse['house_type']) => {
    if (!profile) return;

    const prices: Record<string, number> = {
      cottage: 5000,
      apartment: 10000,
      mansion: 50000,
      castle: 100000,
      island: 250000
    };

    try {
      const { data, error } = await supabase
        .from('player_houses')
        .insert({
          profile_id: profile.id,
          house_name: 'My House',
          house_type: houseType,
          house_tier: 1,
          is_public: false,
          allow_visitors: true
        })
        .select()
        .single();

      if (error) throw error;

      setMyHouse(data);
      setHasHouse(true);

      console.log(`Purchased ${houseType} for ${prices[houseType]} gold`);

    } catch (error) {
      console.error('Error purchasing house:', error);
    }
  };

  const purchaseFurniture = async (furniture: FurnitureCatalog) => {
    if (!myHouse || !profile) return;

    try {
      // Check capacity
      if (myHouse.current_items >= myHouse.capacity) {
        alert('House is at maximum capacity!');
        return;
      }

      // Place furniture at default position
      const { data, error } = await supabase
        .from('placed_furniture')
        .insert({
          house_id: myHouse.id,
          furniture_id: furniture.furniture_id,
          position_x: 0,
          position_y: 0,
          position_z: 0,
          rotation_x: 0,
          rotation_y: 0,
          rotation_z: 0,
          scale_x: 1.0,
          scale_y: 1.0,
          scale_z: 1.0
        })
        .select()
        .single();

      if (error) throw error;

      // Update house item count
      await supabase
        .from('player_houses')
        .update({ current_items: myHouse.current_items + 1 })
        .eq('id', myHouse.id);

      // Recalculate decoration score
      await supabase.rpc('calculate_decoration_score', { p_house_id: myHouse.id });

      console.log(`Purchased ${furniture.furniture_name} for ${furniture.required_gold} gold`);
      loadHouseData();

    } catch (error) {
      console.error('Error purchasing furniture:', error);
    }
  };

  const removeFurniture = async (furnitureId: string) => {
    if (!myHouse) return;

    try {
      const { error } = await supabase
        .from('placed_furniture')
        .delete()
        .eq('id', furnitureId);

      if (error) throw error;

      // Update house item count
      await supabase
        .from('player_houses')
        .update({ current_items: myHouse.current_items - 1 })
        .eq('id', myHouse.id);

      // Recalculate decoration score
      await supabase.rpc('calculate_decoration_score', { p_house_id: myHouse.id });

      loadHouseData();

    } catch (error) {
      console.error('Error removing furniture:', error);
    }
  };

  const updateHouseSettings = async (settings: Partial<PlayerHouse>) => {
    if (!myHouse) return;

    try {
      const { error } = await supabase
        .from('player_houses')
        .update(settings)
        .eq('id', myHouse.id);

      if (error) throw error;

      setMyHouse({ ...myHouse, ...settings });

    } catch (error) {
      console.error('Error updating house settings:', error);
    }
  };

  if (!showHousing) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-slate-700 w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🏠</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Player Housing</h2>
              {myHouse && (
                <p className="text-sm text-slate-400">
                  {myHouse.house_name} • Tier {myHouse.house_tier} • Decoration Score: {myHouse.decoration_score}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={toggleHousing}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {!hasHouse ? (
          // House Purchase Screen
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-white mb-2">Welcome to Housing!</h3>
              <p className="text-slate-300">Choose your first home and start decorating.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { type: 'cottage' as const, price: 5000, capacity: 30, desc: 'Cozy starter home' },
                { type: 'apartment' as const, price: 10000, capacity: 50, desc: 'Modern city living' },
                { type: 'mansion' as const, price: 50000, capacity: 100, desc: 'Spacious luxury home' },
                { type: 'castle' as const, price: 100000, capacity: 200, desc: 'Grand fortress' },
                { type: 'island' as const, price: 250000, capacity: 300, desc: 'Private paradise' }
              ].map(house => (
                <div
                  key={house.type}
                  className="bg-slate-700/30 p-6 rounded-lg border border-slate-600 hover:border-blue-500 transition-all"
                >
                  <div className="text-4xl mb-3 text-center">{getHouseIcon(house.type)}</div>
                  <h4 className="text-lg font-bold text-white text-center capitalize mb-2">{house.type}</h4>
                  <p className="text-sm text-slate-300 text-center mb-4">{house.desc}</p>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Price:</span>
                      <span className="text-yellow-400 font-medium">{house.price} 🪙</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Capacity:</span>
                      <span className="text-white">{house.capacity} items</span>
                    </div>
                  </div>
                  <button
                    onClick={() => purchaseHouse(house.type)}
                    className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded font-medium"
                  >
                    Purchase
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 p-4 border-b border-slate-700">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🏠 Overview
              </button>
              <button
                onClick={() => setActiveTab('furniture')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'furniture'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🛋️ Furniture ({myHouse?.current_items}/{myHouse?.capacity})
              </button>
              <button
                onClick={() => setActiveTab('visitors')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'visitors'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                👥 Visitors ({visitors.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                ⚙️ Settings
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'overview' && myHouse && (
                <div className="space-y-6">
                  {/* House Info Card */}
                  <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 rounded-lg border border-blue-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-6xl">{getHouseIcon(myHouse.house_type)}</div>
                        <div>
                          <h3 className="text-2xl font-bold text-white">{myHouse.house_name}</h3>
                          <p className="text-slate-300 capitalize">{myHouse.house_type} • Tier {myHouse.house_tier}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-yellow-400">{myHouse.decoration_score}</div>
                        <div className="text-sm text-slate-400">Decoration Score</div>
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="text-slate-400 text-sm mb-1">Capacity</div>
                      <div className="text-2xl font-bold text-white">{myHouse.current_items}/{myHouse.capacity}</div>
                    </div>
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="text-slate-400 text-sm mb-1">Furniture</div>
                      <div className="text-2xl font-bold text-white">{placedFurniture.length}</div>
                    </div>
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="text-slate-400 text-sm mb-1">Visitors</div>
                      <div className="text-2xl font-bold text-white">{visitors.length}</div>
                    </div>
                    <div className="bg-slate-700/30 p-4 rounded-lg border border-slate-600">
                      <div className="text-slate-400 text-sm mb-1">Visibility</div>
                      <div className="text-2xl font-bold text-white">{myHouse.is_public ? '🌐' : '🔒'}</div>
                    </div>
                  </div>

                  {/* Recent Furniture */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Recent Furniture</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {placedFurniture.slice(0, 8).map(item => {
                        const catalog = furnitureCatalog.find(f => f.furniture_id === item.furniture_id);
                        return (
                          <div
                            key={item.id}
                            className="bg-slate-700/30 p-3 rounded-lg border border-slate-600 text-center"
                          >
                            <div className="text-2xl mb-2">🪑</div>
                            <div className="text-sm text-white truncate">{catalog?.furniture_name || 'Unknown'}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'furniture' && (
                <div className="space-y-4">
                  {/* Placed Furniture */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Placed Furniture</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {placedFurniture.map(item => {
                        const catalog = furnitureCatalog.find(f => f.furniture_id === item.furniture_id);
                        return (
                          <div
                            key={item.id}
                            className="bg-slate-700/30 p-4 rounded-lg border border-slate-600 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">🪑</span>
                              <div>
                                <div className="font-medium text-white">{catalog?.furniture_name || 'Unknown'}</div>
                                <div className="text-xs text-slate-400">
                                  Position: ({item.position_x.toFixed(1)}, {item.position_y.toFixed(1)}, {item.position_z.toFixed(1)})
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFurniture(item.id)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Furniture Shop */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">Furniture Shop</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {furnitureCatalog.map(furniture => (
                        <div
                          key={furniture.id}
                          className="bg-slate-700/30 p-4 rounded-lg border border-slate-600"
                        >
                          <div className="text-3xl mb-2 text-center">🪑</div>
                          <div className="font-medium text-white text-center mb-1">{furniture.furniture_name}</div>
                          <div className="text-xs text-slate-400 text-center capitalize mb-3">{furniture.furniture_type}</div>
                          <div className="flex items-center justify-between text-sm mb-3">
                            <span className="text-slate-400">Price:</span>
                            <span className="text-yellow-400 font-medium">{furniture.required_gold} 🪙</span>
                          </div>
                          <button
                            onClick={() => purchaseFurniture(furniture)}
                            className="w-full bg-blue-600 hover:bg-blue-700 py-2 rounded text-sm font-medium"
                            disabled={!!myHouse && myHouse.current_items >= myHouse.capacity}
                          >
                            Purchase
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'visitors' && (
                <div className="space-y-3">
                  {visitors.map(visitor => (
                    <div
                      key={visitor.id}
                      className="bg-slate-700/30 p-4 rounded-lg border border-slate-600 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-white">{(visitor as any).profiles?.username || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">
                          Visits: {visitor.visit_count} • Last visit: {new Date(visitor.last_visit).toLocaleDateString()}
                        </div>
                        {visitor.left_comment && (
                          <div className="text-sm text-slate-300 italic mt-1">"{visitor.left_comment}"</div>
                        )}
                      </div>
                      {visitor.rating && (
                        <div className="text-yellow-400">{'⭐'.repeat(visitor.rating)}</div>
                      )}
                    </div>
                  ))}
                  {visitors.length === 0 && (
                    <div className="text-center text-slate-400 py-12">
                      No visitors yet. Make your house public to attract visitors!
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && myHouse && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">House Name</label>
                    <input
                      type="text"
                      value={myHouse.house_name}
                      onChange={(e) => updateHouseSettings({ house_name: e.target.value })}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-white"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                    <div>
                      <div className="font-medium text-white">Public House</div>
                      <div className="text-sm text-slate-400">Allow other players to visit your house</div>
                    </div>
                    <button
                      onClick={() => updateHouseSettings({ is_public: !myHouse.is_public })}
                      className={`px-4 py-2 rounded font-medium ${
                        myHouse.is_public ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      {myHouse.is_public ? 'Public' : 'Private'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                    <div>
                      <div className="font-medium text-white">Allow Visitors</div>
                      <div className="text-sm text-slate-400">Let visitors enter when house is public</div>
                    </div>
                    <button
                      onClick={() => updateHouseSettings({ allow_visitors: !myHouse.allow_visitors })}
                      className={`px-4 py-2 rounded font-medium ${
                        myHouse.allow_visitors ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-600 hover:bg-slate-700'
                      }`}
                    >
                      {myHouse.allow_visitors ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getHouseIcon(type: string): string {
  const icons: Record<string, string> = {
    cottage: '🏡',
    apartment: '🏢',
    mansion: '🏰',
    castle: '🏯',
    island: '🏝️'
  };
  return icons[type] || '🏠';
}

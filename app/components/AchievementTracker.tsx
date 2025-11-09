'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLobbyStore } from '@/lib/lobbyStore';
import { useGameStore } from '@/lib/gameStore';
import type { 
  AchievementCatalog, 
  PlayerAchievement, 
  DailyChallenge, 
  PlayerDailyProgress,
  GlobalLeaderboard 
} from '@/lib/phase4Types';

export default function AchievementTracker() {
  const { profile } = useLobbyStore();
  const { showAchievements, toggleAchievements } = useGameStore();
  
  const [activeTab, setActiveTab] = useState<'achievements' | 'dailies' | 'leaderboards'>('achievements');
  
  // Achievements
  const [achievementsCatalog, setAchievementsCatalog] = useState<AchievementCatalog[]>([]);
  const [playerAchievements, setPlayerAchievements] = useState<PlayerAchievement[]>([]);
  const [achievementPoints, setAchievementPoints] = useState(0);
  
  // Daily Challenges
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [dailyProgress, setDailyProgress] = useState<PlayerDailyProgress[]>([]);
  
  // Leaderboards
  const [leaderboardType, setLeaderboardType] = useState<'level' | 'pvp_rating' | 'wealth' | 'achievements'>('level');
  const [leaderboardData, setLeaderboardData] = useState<GlobalLeaderboard[]>([]);

  useEffect(() => {
    if (showAchievements && profile) {
      loadAchievements();
      loadDailyChallenges();
      loadLeaderboards();
      subscribeToUpdates();
    }
  }, [showAchievements, profile, activeTab, leaderboardType]);

  const loadAchievements = async () => {
    if (!profile) return;

    try {
      // Load achievement catalog
      const { data: catalog, error: catalogError } = await supabase
        .from('achievements_catalog')
        .select('*')
        .order('rarity', { ascending: true });

      if (catalogError) throw catalogError;
      setAchievementsCatalog(catalog || []);

      // Load player progress
      const { data: progress, error: progressError } = await supabase
        .from('player_achievements')
        .select('*')
        .eq('profile_id', profile.id);

      if (progressError) throw progressError;
      setPlayerAchievements(progress || []);

      // Calculate total points
      const completedIds = (progress || []).filter(p => p.completed).map(p => p.achievement_id);
      const totalPoints = (catalog || [])
        .filter(a => completedIds.includes(a.achievement_id))
        .reduce((sum, a) => sum + a.points, 0);
      setAchievementPoints(totalPoints);

    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const loadDailyChallenges = async () => {
    if (!profile) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Load today's challenges
      const { data: challenges, error: challengeError } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('challenge_date', today);

      if (challengeError) throw challengeError;
      setDailyChallenges(challenges || []);

      // Load player progress
      if (challenges && challenges.length > 0) {
        const challengeIds = challenges.map(c => c.id);
        const { data: progress, error: progressError } = await supabase
          .from('player_daily_progress')
          .select('*')
          .eq('profile_id', profile.id)
          .in('challenge_id', challengeIds);

        if (progressError) throw progressError;
        setDailyProgress(progress || []);
      }

    } catch (error) {
      console.error('Error loading daily challenges:', error);
    }
  };

  const loadLeaderboards = async () => {
    try {
      const { data, error } = await supabase
        .from('global_leaderboards')
        .select(`
          *,
          profiles (username, avatar_url)
        `)
        .eq('leaderboard_type', leaderboardType)
        .order('rank', { ascending: true })
        .limit(100);

      if (error) throw error;
      setLeaderboardData(data || []);

    } catch (error) {
      console.error('Error loading leaderboards:', error);
    }
  };

  const subscribeToUpdates = () => {
    if (!profile) return;

    const achievementChannel = supabase
      .channel('achievement-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_achievements',
          filter: `profile_id=eq.${profile.id}`
        },
        () => loadAchievements()
      )
      .subscribe();

    const dailyChannel = supabase
      .channel('daily-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_daily_progress',
          filter: `profile_id=eq.${profile.id}`
        },
        () => loadDailyChallenges()
      )
      .subscribe();

    return () => {
      achievementChannel.unsubscribe();
      dailyChannel.unsubscribe();
    };
  };

  const claimDailyReward = async (challenge: DailyChallenge) => {
    if (!profile) return;

    const progress = dailyProgress.find(p => p.challenge_id === challenge.id);
    if (!progress || !progress.completed || progress.claimed) return;

    try {
      // Mark as claimed
      const { error: updateError } = await supabase
        .from('player_daily_progress')
        .update({ claimed: true })
        .eq('id', progress.id);

      if (updateError) throw updateError;

      // Add rewards to player (this would integrate with existing systems)
      console.log('Claimed rewards:', {
        experience: challenge.experience_reward,
        gold: challenge.gold_reward,
        bonus: challenge.bonus_rewards
      });

      loadDailyChallenges();

    } catch (error) {
      console.error('Error claiming daily reward:', error);
    }
  };

  if (!showAchievements) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-2xl border border-slate-700 w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-3xl">🏆</div>
            <div>
              <h2 className="text-2xl font-bold text-white">Achievements & Progress</h2>
              <p className="text-sm text-slate-400">Total Points: {achievementPoints}</p>
            </div>
          </div>
          <button
            onClick={toggleAchievements}
            className="text-slate-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-4 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'achievements'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🏆 Achievements
          </button>
          <button
            onClick={() => setActiveTab('dailies')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'dailies'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📅 Daily Challenges
          </button>
          <button
            onClick={() => setActiveTab('leaderboards')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'leaderboards'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📊 Leaderboards
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'achievements' && (
            <div className="space-y-3">
              {achievementsCatalog.map(achievement => {
                const progress = playerAchievements.find(p => p.achievement_id === achievement.achievement_id);
                const percentComplete = progress ? (progress.progress / progress.target) * 100 : 0;
                const isCompleted = progress?.completed || false;

                return (
                  <div
                    key={achievement.id}
                    className={`bg-slate-700/30 p-4 rounded-lg border ${
                      isCompleted ? 'border-yellow-500/50' : 'border-slate-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{achievement.icon || '🏅'}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${isCompleted ? 'text-yellow-400' : 'text-white'}`}>
                              {achievement.achievement_name}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${getRarityColor(achievement.rarity)}`}>
                              {achievement.rarity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 mt-1">{achievement.achievement_description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold">{achievement.points} pts</div>
                        {isCompleted && <div className="text-xs text-green-400">✓ Unlocked</div>}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {progress && !isCompleted && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{progress.progress} / {progress.target}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(percentComplete, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Rewards */}
                    {achievement.title_reward && (
                      <div className="mt-2 text-xs text-purple-400">
                        Reward: Title "{achievement.title_reward}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'dailies' && (
            <div className="space-y-4">
              <div className="bg-blue-600/10 border border-blue-500/30 p-4 rounded-lg">
                <div className="text-sm text-blue-400 font-medium mb-1">Daily Challenges</div>
                <div className="text-xs text-slate-300">
                  Complete challenges before midnight to earn bonus rewards!
                </div>
              </div>

              {dailyChallenges.map(challenge => {
                const progress = dailyProgress.find(p => p.challenge_id === challenge.id);
                const isCompleted = progress?.completed || false;
                const isClaimed = progress?.claimed || false;

                return (
                  <div
                    key={challenge.id}
                    className="bg-slate-700/30 p-4 rounded-lg border border-slate-600"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{challenge.challenge_title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(challenge.difficulty)}`}>
                            {challenge.difficulty.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300">{challenge.challenge_description}</p>
                      </div>
                      {isCompleted && (
                        <div className="text-2xl">{isClaimed ? '✅' : '🎁'}</div>
                      )}
                    </div>

                    {/* Progress */}
                    {progress && !isCompleted && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>Progress</span>
                          <span>{progress.progress}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full"
                            style={{ width: `${Math.min(progress.progress, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Rewards */}
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        Rewards: {challenge.experience_reward} XP, {challenge.gold_reward} Gold
                      </div>
                      {isCompleted && !isClaimed && (
                        <button
                          onClick={() => claimDailyReward(challenge)}
                          className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded text-sm font-medium"
                        >
                          Claim Rewards
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {dailyChallenges.length === 0 && (
                <div className="text-center text-slate-400 py-12">
                  No daily challenges available today. Check back tomorrow!
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaderboards' && (
            <div className="space-y-4">
              {/* Leaderboard Type Selector */}
              <div className="flex gap-2 flex-wrap">
                {(['level', 'pvp_rating', 'wealth', 'achievements'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setLeaderboardType(type)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      leaderboardType === type
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {type.replace('_', ' ').toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Leaderboard Table */}
              <div className="bg-slate-700/30 rounded-lg border border-slate-600 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Rank</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-400">Player</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-400">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboardData.map((entry, index) => {
                      const isCurrentPlayer = entry.profile_id === profile?.id;
                      return (
                        <tr
                          key={entry.id}
                          className={`border-t border-slate-700 ${isCurrentPlayer ? 'bg-blue-600/10' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {entry.rank && entry.rank <= 3 && (
                                <span className="text-xl">{getRankEmoji(entry.rank)}</span>
                              )}
                              <span className="text-white font-semibold">#{entry.rank || index + 1}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-white">{(entry as any).profiles?.username || 'Unknown'}</span>
                              {isCurrentPlayer && (
                                <span className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">YOU</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="text-white font-bold">{entry.score.toLocaleString()}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {leaderboardData.length === 0 && (
                <div className="text-center text-slate-400 py-12">
                  No leaderboard data available yet.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: 'bg-gray-600/20 text-gray-300',
    rare: 'bg-blue-600/20 text-blue-400',
    epic: 'bg-purple-600/20 text-purple-400',
    legendary: 'bg-yellow-600/20 text-yellow-400',
    mythic: 'bg-red-600/20 text-red-400'
  };
  return colors[rarity] || colors.common;
}

function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    easy: 'bg-green-600/20 text-green-400',
    normal: 'bg-blue-600/20 text-blue-400',
    hard: 'bg-orange-600/20 text-orange-400',
    extreme: 'bg-red-600/20 text-red-400'
  };
  return colors[difficulty] || colors.normal;
}

function getRankEmoji(rank: number): string {
  const emojis: Record<number, string> = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
  };
  return emojis[rank] || '';
}

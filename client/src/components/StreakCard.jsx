// components/StreakCard.jsx - FIXED VERSION
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Flame, Trophy, Award, RefreshCw } from 'lucide-react';

export default function StreakCard({ onRefresh }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading streak stats...');
      const response = await api.get('/points/my-stats');
      console.log('Streak stats response:', response.data);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load streak stats:', err);
      console.error('Error details:', err.response?.data);
      // Don't set error for 404, just show default stats
      if (err.response?.status === 404) {
        setStats({
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          next_streak_milestone: 5,
          points_to_next_milestone: 50,
          rank: "Unranked"
        });
        setError(null);
      } else {
        setError(err.response?.data?.error || 'Failed to load stats');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Listen for points update events
    const handlePointsUpdate = () => {
      console.log('Points updated event received, reloading streak stats...');
      loadStats();
    };
    
    window.addEventListener('pointsUpdated', handlePointsUpdate);
    
    return () => {
      window.removeEventListener('pointsUpdated', handlePointsUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/[0.06] animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-24 bg-white/[0.06] rounded animate-pulse mb-2" />
            <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-12 bg-white/[0.04] rounded-lg animate-pulse" />
          <div className="h-12 bg-white/[0.04] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  // Show default stats even if there's an error
  if (error || !stats) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-white">Your Progress</h3>
            <p className="text-slate-500 text-xs">Complete quizzes to earn points!</p>
          </div>
        </div>

        {/* Total Points */}
        <div className="bg-white/[0.03] rounded-lg p-3 mb-3 text-center">
          <p className="text-2xl font-bold text-white">0</p>
          <p className="text-xs text-slate-400">Total Points</p>
        </div>

        {/* Streak Info */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-orange-400">0</p>
            <p className="text-xs text-slate-400">Day Streak</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-2 text-center">
            <p className="text-xl font-bold text-purple-400">0</p>
            <p className="text-xs text-slate-400">Best Streak</p>
          </div>
        </div>

        {/* Next Milestone */}
        <div className="bg-gradient-to-r from-electric-500/10 to-purple-500/10 rounded-lg p-2 mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Next Milestone:</span>
            <span className="text-electric-400 font-semibold">5 days</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">+50 points at 7 days!</span>
            <Award className="w-3 h-3 text-yellow-400" />
          </div>
        </div>

        {/* Rank */}
        <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-slate-400">Rank:</span>
          </div>
          <span className="text-sm font-semibold text-white">Unranked</span>
        </div>
        
        <button 
          onClick={loadStats} 
          className="mt-3 text-xs text-electric-400 hover:text-electric-300 flex items-center gap-1 mx-auto"
        >
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>
    );
  }

  const nextMilestone = stats.next_streak_milestone;
  const pointsToNextMilestone = stats.points_to_next_milestone;
  const currentStreak = stats.current_streak || 0;
  const totalPoints = stats.total_points || 0;
  const longestStreak = stats.longest_streak || 0;
  const rank = stats.rank;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20 flex items-center justify-center">
          <Flame className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-white">Your Progress</h3>
          <p className="text-slate-500 text-xs">Keep up the momentum!</p>
        </div>
      </div>

      {/* Total Points */}
      <div className="bg-white/[0.03] rounded-lg p-3 mb-3 text-center">
        <p className="text-2xl font-bold text-white">{totalPoints}</p>
        <p className="text-xs text-slate-400">Total Points</p>
      </div>

      {/* Streak Info */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-white/[0.03] rounded-lg p-2 text-center">
          <p className="text-xl font-bold text-orange-400">{currentStreak}</p>
          <p className="text-xs text-slate-400">Day Streak</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2 text-center">
          <p className="text-xl font-bold text-purple-400">{longestStreak}</p>
          <p className="text-xs text-slate-400">Best Streak</p>
        </div>
      </div>

      {/* Next Milestone */}
      {nextMilestone && nextMilestone > 0 && (
        <div className="bg-gradient-to-r from-electric-500/10 to-purple-500/10 rounded-lg p-2 mb-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-slate-300">Next Milestone:</span>
            <span className="text-electric-400 font-semibold">{nextMilestone} days</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">+50 points at {nextMilestone} days!</span>
            <Award className="w-3 h-3 text-yellow-400" />
          </div>
        </div>
      )}

      {/* Points to Next Milestone */}
      {pointsToNextMilestone > 0 && pointsToNextMilestone !== 50 && (
        <div className="bg-white/[0.02] rounded-lg p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Next point milestone:</span>
            <span className="text-green-400">{pointsToNextMilestone} points to go</span>
          </div>
        </div>
      )}

      {/* Rank */}
      <div className="mt-3 pt-3 border-t border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span className="text-xs text-slate-400">Rank:</span>
        </div>
        <span className="text-sm font-semibold text-white">
          {rank !== "Unranked" && rank !== "0" ? `#${rank}` : "Unranked"}
        </span>
      </div>
    </div>
  );
}
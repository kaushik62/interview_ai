// client/src/components/StreakCard.jsx
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Flame, Trophy, Calendar, Star } from 'lucide-react';

const StreakCard = () => {
  const [pointsInfo, setPointsInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPointsInfo();
  }, []);

  const fetchPointsInfo = async () => {
    try {
      const res = await api.get('/points/my-stats');
      setPointsInfo(res.data);
    } catch (error) {
      console.error('Error fetching points:', error);
      // Set default values on error
      setPointsInfo({
        total_points: 0,
        current_streak: 0,
        longest_streak: 0,
        next_streak_milestone: 7,
        points_to_next_milestone: 50,
        rank: 'Unranked'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/[0.06] rounded w-3/4"></div>
          <div className="h-8 bg-white/[0.06] rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <Star className="w-5 h-5 text-yellow-400" />
        Your Progress
      </h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-400">{pointsInfo?.total_points || 0}</p>
          <p className="text-xs text-slate-500">Total Points</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="w-5 h-5 text-orange-500" />
            <p className="text-2xl font-bold text-orange-500">{pointsInfo?.current_streak || 0}</p>
          </div>
          <p className="text-xs text-slate-500">Day Streak</p>
        </div>
      </div>
      
      {pointsInfo?.next_streak_milestone && (
        <div className="bg-ink-800 rounded-lg p-3 mb-3">
          <p className="text-slate-300 text-xs mb-1">Next Milestone: {pointsInfo.next_streak_milestone} days</p>
          <div className="h-1.5 bg-ink-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full"
              style={{ width: `${(pointsInfo.current_streak / pointsInfo.next_streak_milestone) * 100}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs mt-1">
            +{pointsInfo.points_to_next_milestone} points at {pointsInfo.next_streak_milestone} days!
          </p>
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>🏆 Rank: {pointsInfo?.rank || 'Unranked'}</span>
        <span>📈 Best: {pointsInfo?.longest_streak || 0} days</span>
      </div>
    </div>
  );
};

export default StreakCard;
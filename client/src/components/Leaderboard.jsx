// client/src/components/Leaderboard.jsx - COMPLETELY FIXED
import { useState, useEffect } from "react";
import api from "../utils/api";
import { Trophy, Medal, Flame, Crown, RefreshCw, TrendingUp, User } from "lucide-react";

const Leaderboard = ({ onRefresh }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [userPoints, setUserPoints] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching leaderboard...");
      
      const res = await api.get("/points/leaderboard");
      console.log("Leaderboard response:", res.data);
      
      // Handle different response formats
      if (res.data && res.data.leaderboard) {
        setLeaderboard(res.data.leaderboard || []);
        setUserRank(res.data.userRank || "Unranked");
      } else if (Array.isArray(res.data)) {
        setLeaderboard(res.data);
        setUserRank("Unranked");
      } else {
        setLeaderboard([]);
        setUserRank("Unranked");
      }
      
      // Also fetch current user's points for display
      try {
        const pointsRes = await api.get("/points/my-stats");
        setUserPoints(pointsRes.data.total_points || 0);
      } catch (pointsErr) {
        console.log("Could not fetch user points:", pointsErr.message);
        setUserPoints(0);
      }
      
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      console.error("Error details:", error.response?.data);
      
      // Don't show error for 404, just show empty state
      if (error.response?.status === 404) {
        setLeaderboard([]);
        setUserRank("Unranked");
        setError(null);
      } else {
        setError(error.response?.data?.error || "Failed to load leaderboard");
        setLeaderboard([]);
        setUserRank("Unranked");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    
    // Listen for points update events
    const handlePointsUpdate = () => {
      console.log("Points updated, refreshing leaderboard...");
      fetchLeaderboard();
    };
    
    window.addEventListener("pointsUpdated", handlePointsUpdate);
    
    return () => {
      window.removeEventListener("pointsUpdated", handlePointsUpdate);
    };
  }, []);

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="text-slate-500 text-sm font-mono">#{rank}</span>;
    }
  };

  const getRankBadge = (rank) => {
    switch(rank) {
      case 1:
        return "bg-yellow-500/20 border-yellow-500/30";
      case 2:
        return "bg-gray-500/20 border-gray-500/30";
      case 3:
        return "bg-amber-600/20 border-amber-600/30";
      default:
        return "bg-slate-500/10 border-slate-500/20";
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-white/[0.06] rounded animate-pulse" />
          <div className="h-5 w-32 bg-white/[0.06] rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/[0.04] rounded-full animate-pulse" />
                <div>
                  <div className="h-4 w-24 bg-white/[0.04] rounded animate-pulse" />
                  <div className="h-3 w-16 bg-white/[0.03] rounded animate-pulse mt-1" />
                </div>
              </div>
              <div className="w-12 h-6 bg-white/[0.04] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show empty state with retry button for errors
  if (error) {
    return (
      <div className="glass-card p-5 text-center">
        <TrendingUp className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-slate-400 text-sm font-medium">Leaderboard</p>
        <p className="text-red-400 text-xs mt-1">{error}</p>
        <button 
          onClick={fetchLeaderboard} 
          className="mt-3 text-xs text-electric-400 hover:text-electric-300 flex items-center gap-1 mx-auto"
        >
          <RefreshCw className="w-3 h-3" /> Try Again
        </button>
      </div>
    );
  }

  // Empty state when no data
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="glass-card p-5 text-center">
        <Trophy className="w-10 h-10 text-slate-600 mx-auto mb-2" />
        <p className="text-slate-400 text-sm font-medium">Leaderboard</p>
        <p className="text-slate-500 text-xs mt-1">
          No players on leaderboard yet
        </p>
        <p className="text-slate-600 text-xs mt-2">
          Complete quizzes to earn points and climb the ranks!
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3 className="font-display font-semibold text-white">Leaderboard</h3>
        </div>
        <button 
          onClick={fetchLeaderboard}
          className="text-slate-500 hover:text-electric-400 transition-colors"
          title="Refresh leaderboard"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* User's Rank Banner */}
      {userRank && userRank !== "Unranked" && userRank !== "0" && (
        <div className="mb-4 p-3 rounded-lg bg-electric-500/10 border border-electric-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Your Rank</p>
              <p className="text-xl font-bold text-white">#{userRank}</p>
            </div>
            {userPoints !== null && (
              <div className="text-right">
                <p className="text-xs text-slate-400">Your Points</p>
                <p className="text-xl font-bold text-yellow-400">{userPoints}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leaderboard List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {leaderboard.slice(0, 10).map((user, idx) => {
          const rank = user.rank || idx + 1;
          return (
            <div
              key={user.user_id || user.user_name || idx}
              className={`flex items-center justify-between p-3 rounded-lg transition-all
                ${rank === 1 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent' : ''}
                ${rank === 2 ? 'bg-gradient-to-r from-gray-500/10 to-transparent' : ''}
                ${rank === 3 ? 'bg-gradient-to-r from-amber-600/10 to-transparent' : ''}
                hover:bg-white/[0.05]`}
            >
              <div className="flex items-center gap-3">
                {/* Rank Icon/Badge */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRankBadge(rank)}`}>
                  {getRankIcon(rank)}
                </div>
                
                {/* User Info */}
                <div>
                  <p className="text-white text-sm font-medium">
                    {user.user_name || "Anonymous"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span>{user.current_streak || 0} day streak</span>
                  </div>
                </div>
              </div>
              
              {/* Points */}
              <div className="text-right">
                <p className="text-lg font-bold text-yellow-400">
                  {user.total_points || 0}
                </p>
                <p className="text-xs text-slate-500">points</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer with total count */}
      {leaderboard.length > 0 && (
        <div className="mt-4 pt-3 border-t border-white/[0.05] text-center">
          <p className="text-xs text-slate-500">
            Top {Math.min(leaderboard.length, 10)} of {leaderboard.length} players
          </p>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
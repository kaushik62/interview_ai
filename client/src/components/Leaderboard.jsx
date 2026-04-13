// client/src/components/Leaderboard.jsx
import { useState, useEffect } from "react";
import api from "../utils/api";
import { Trophy, Medal, Flame } from "lucide-react";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [userRank, setUserRank] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const res = await api.get("/points/leaderboard");
      setLeaderboard(res.data.leaderboard || []);
      setUserRank(res.data.userRank);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      // Set empty data instead of crashing
      setLeaderboard([]);
      setUserRank("Unranked");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="text-slate-500 text-sm">#{rank}</span>;
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/[0.06] rounded w-1/2"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-white/[0.04] rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-bold flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Top Performers
        </h3>
        {userRank && userRank !== "Unranked" && (
          <span className="text-xs text-slate-400">Your Rank: #{userRank}</span>
        )}
      </div>

      <div className="space-y-2">
        {leaderboard.slice(0, 10).map((user, idx) => (
          <div
            key={user.user_id || idx} // Add this key
            className="flex items-center justify-between p-3 rounded-lg bg-ink-800/50"
          >
            <div className="flex items-center gap-3">
              {getRankIcon(user.rank)}
              <div>
                <p className="text-white text-sm font-medium">
                  {user.user_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Flame className="w-3 h-3 text-orange-500" />
                  <span>{user.current_streak} day streak</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-yellow-400 font-bold">{user.total_points}</p>
              <p className="text-xs text-slate-500">points</p>
            </div>
          </div>
        ))}
      </div>

      {leaderboard.length === 0 && (
        <p className="text-center text-slate-500 py-4">
          No players on leaderboard yet
        </p>
      )}
    </div>
  );
};

export default Leaderboard;

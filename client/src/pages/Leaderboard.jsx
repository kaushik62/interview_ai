import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, TrendingUp, Calendar, Flame, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import api from "../utils/api";

export default function Leaderboard() {
  const { token } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [top3, setTop3] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  const limit = 20;

  // Fetch leaderboard
  const fetchLeaderboard = async (page = 1) => {
    try {
      setLoading(true);
      const response = await api.get(`/leaderboard?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setLeaderboard(data.leaderboard);
        setTop3(data.top3);
        setUserStats(data.userStats);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user rank
  const fetchUserRank = async () => {
    try {
      const response = await api.get('/leaderboard/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setUserStats(data);
      }
    } catch (error) {
      console.error('Error fetching user rank:', error);
    }
  };

  // Search users
  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setShowSearch(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get(`/leaderboard/search?name=${searchTerm}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setSearchResults(data.users);
        setShowSearch(true);
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(currentPage);
    fetchUserRank();
  }, [currentPage]);

  // Get rank badge color
  const getRankColor = (rank) => {
    switch(rank) {
      case 1: return 'text-yellow-400';
      case 2: return 'text-gray-400';
      case 3: return 'text-amber-600';
      default: return 'text-slate-500';
    }
  };

  // Get rank icon
  const getRankIcon = (rank) => {
    switch(rank) {
      case 1: return <Trophy className="w-5 h-5 text-yellow-400" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-600" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          Leaderboard
        </h1>
        <p className="text-slate-400">Top performers who are crushing their interview prep</p>
      </div>

      {/* User Stats Card */}
      {userStats && userStats.rank !== "Unranked" && (
        <div className="bg-gradient-to-r from-electric-500/10 to-plasma-500/10 rounded-xl p-6 mb-8 border border-white/[0.06]">
          <div className="flex flex-wrap justify-between items-center gap-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Your Rank</p>
              <p className="text-4xl font-display font-bold text-white">#{userStats.rank}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Points</p>
              <p className="text-2xl font-bold text-electric-400">{userStats.total_points}</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Current Streak</p>
              <p className="text-2xl font-bold text-orange-400 flex items-center gap-2">
                <Flame className="w-5 h-5" />
                {userStats.current_streak} days
              </p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Longest Streak</p>
              <p className="text-2xl font-bold text-white">{userStats.longest_streak} days</p>
            </div>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Medal className="w-5 h-5 text-yellow-400" />
            Top Performers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((user, index) => (
              <div key={index} className={`bg-gradient-to-br ${index === 0 ? 'from-yellow-500/20 to-yellow-600/10' : index === 1 ? 'from-gray-400/20 to-gray-500/10' : 'from-amber-600/20 to-amber-700/10'} rounded-xl p-6 text-center border border-white/[0.06]`}>
                <div className="flex justify-center mb-3">
                  {index === 0 ? (
                    <Trophy className="w-12 h-12 text-yellow-400" />
                  ) : index === 1 ? (
                    <Medal className="w-12 h-12 text-gray-400" />
                  ) : (
                    <Medal className="w-12 h-12 text-amber-600" />
                  )}
                </div>
                <p className="text-3xl font-bold text-white mb-1">#{user.rank}</p>
                <p className="text-white font-semibold mb-2">{user.user_name}</p>
                <p className="text-2xl font-bold text-electric-400">{user.total_points} pts</p>
                <p className="text-slate-400 text-sm mt-2 flex items-center justify-center gap-1">
                  <Flame className="w-3 h-3" />
                  {user.current_streak} day streak
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full px-4 py-2 bg-ink-800 border border-white/[0.06] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-electric-500"
            />
            <Search className="absolute right-3 top-2.5 w-5 h-5 text-slate-500" />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-electric-500 text-white rounded-xl hover:bg-electric-600 transition"
          >
            Search
          </button>
          {showSearch && (
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchTerm('');
                setSearchResults([]);
              }}
              className="px-6 py-2 bg-ink-700 text-slate-300 rounded-xl hover:bg-ink-600 transition"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-ink-900/50 rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-ink-800/50 border-b border-white/[0.06]">
              <tr>
                <th className="px-6 py-4 text-left text-slate-400 font-medium text-sm">Rank</th>
                <th className="px-6 py-4 text-left text-slate-400 font-medium text-sm">User</th>
                <th className="px-6 py-4 text-right text-slate-400 font-medium text-sm">Total Points</th>
                <th className="px-6 py-4 text-right text-slate-400 font-medium text-sm">Current Streak</th>
                <th className="px-6 py-4 text-right text-slate-400 font-medium text-sm">Longest Streak</th>
              </tr>
            </thead>
            <tbody>
              {(showSearch ? searchResults : leaderboard).map((user) => (
                <tr key={user.user_id} className="border-b border-white/[0.06] hover:bg-white/[0.02] transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getRankIcon(user.rank)}
                      <span className={`font-bold ${getRankColor(user.rank)}`}>#{user.rank}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{user.user_name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-electric-400 font-bold">{user.total_points}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-orange-400 flex items-center justify-end gap-1">
                      <Flame className="w-3 h-3" />
                      {user.current_streak}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-white">{user.longest_streak}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!showSearch && totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-white/[0.06]">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-2 px-4 py-2 bg-ink-800 rounded-lg text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ink-700 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-2 px-4 py-2 bg-ink-800 rounded-lg text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ink-700 transition"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-electric-400"></div>
          <p className="text-slate-400 mt-4">Loading leaderboard...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && leaderboard.length === 0 && (
        <div className="text-center py-12 bg-ink-900/50 rounded-xl border border-white/[0.06]">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No users on leaderboard yet</p>
          <p className="text-slate-500 text-sm mt-2">Complete challenges to earn points!</p>
        </div>
      )}
    </div>
  );
}
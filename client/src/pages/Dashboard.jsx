import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import {
  BarChart3,
  CheckCircle,
  TrendingUp,
  Trophy,
  Target,
  Zap,
  ChevronRight,
  Play,
  RefreshCw,
  AlertCircle,
  BookOpen,
  FileText,
  Award,
  Flame,
  Calendar,
} from "lucide-react";
import toast from "react-hot-toast";
import { StatSkeleton, CardSkeleton } from "../components/Skeleton";
import StreakCard from "../components/StreakCard";
import DailyChallengeCard from "../components/DailyChallengeCard";
import Leaderboard from "../components/Leaderboard";

const scoreColor = (s) =>
  s >= 70 ? "text-emerald-400" : s >= 50 ? "text-amber-400" : "text-rose-400";

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pointsEnabled, setPointsEnabled] = useState(true);
  const [pointsStats, setPointsStats] = useState(null);

  // Refs to prevent infinite loops
  const isMounted = useRef(true);
  const refreshTimeout = useRef(null);
  const isLoadingPoints = useRef(false);
  const lastRefreshTime = useRef(0);
  const eventListenerAdded = useRef(false);

  const loadPointsStats = useCallback(async (silent = false) => {
    // Prevent concurrent calls
    if (isLoadingPoints.current) {
      console.log("Points stats already loading, skipping...");
      return null;
    }

    // Rate limit to once per second
    const now = Date.now();
    if (now - lastRefreshTime.current < 1000) {
      console.log("Rate limiting points refresh");
      return null;
    }

    isLoadingPoints.current = true;
    lastRefreshTime.current = now;

    try {
      if (!silent) console.log("🔄 Loading points stats...");
      const pointsRes = await api.get("/points/my-stats");

      if (isMounted.current) {
        if (!silent) console.log("Points stats response:", pointsRes.data);
        setPointsStats(pointsRes.data);
        setPointsEnabled(true);
        return pointsRes.data;
      }
    } catch (pointsErr) {
      console.log("Points system not available:", pointsErr.response?.status);
      if (isMounted.current) {
        if (
          pointsErr.response?.status === 404 ||
          pointsErr.response?.status === 503
        ) {
          setPointsEnabled(false);
        } else {
          setPointsEnabled(true);
          setPointsStats({
            total_points: 0,
            current_streak: 0,
            longest_streak: 0,
            rank: "Unranked",
            points_to_next_milestone: 50,
            next_streak_milestone: 5,
          });
        }
      }
      return null;
    } finally {
      isLoadingPoints.current = false;
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const sessionsRes = await api.get("/mcq/sessions");
      const allSessions = sessionsRes.data.sessions || [];
      setSessions(allSessions);

      const completedSessions = allSessions.filter(
        (s) => s.status === "completed",
      );
      const totalScore = completedSessions.reduce(
        (sum, s) => sum + (s.score || 0),
        0,
      );
      const avgScore =
        completedSessions.length > 0
          ? totalScore / completedSessions.length
          : 0;
      const bestScore = Math.max(
        ...completedSessions.map((s) => s.score || 0),
        0,
      );
      const totalQuestions = completedSessions.reduce(
        (sum, s) => sum + (s.total_questions || 0),
        0,
      );

      setStats({
        total_sessions: allSessions.length,
        completed_sessions: completedSessions.length,
        average_score: avgScore,
        best_score: bestScore,
        total_questions_answered: totalQuestions,
      });

      await loadPointsStats(true); // Silent load on initial
    } catch (err) {
      console.error("Dashboard load error:", err);
      setError(err.response?.data?.error || "Failed to load dashboard");
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [loadPointsStats]);

  const refreshPoints = useCallback(async () => {
    console.log("🔄 Refreshing points stats...");
    const newStats = await loadPointsStats();

    // Dispatch event for child components, but only if points actually changed
    if (newStats && isMounted.current) {
      // Only dispatch if points or streak changed
      const oldTotal = pointsStats?.total_points;
      const newTotal = newStats?.total_points;

      if (oldTotal !== newTotal) {
        console.log("Points changed, dispatching update event");
        window.dispatchEvent(new CustomEvent("points-updated"));
      } else {
        console.log("Points unchanged, skipping event dispatch");
      }
    }

    return newStats;
  }, [loadPointsStats, pointsStats?.total_points]);

  // Debounced refresh to prevent multiple rapid calls
  const debouncedRefreshPoints = useCallback(() => {
    if (refreshTimeout.current) {
      clearTimeout(refreshTimeout.current);
    }
    refreshTimeout.current = setTimeout(() => {
      refreshPoints();
    }, 500);
  }, [refreshPoints]);

  // Handle points update events from other components
  const handlePointsUpdate = useCallback(() => {
    console.log("📡 Points update event received, refreshing...");
    debouncedRefreshPoints();
  }, [debouncedRefreshPoints]);

  useEffect(() => {
    isMounted.current = true;
    load();

    return () => {
      isMounted.current = false;
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
    };
  }, [load]);

  // Add event listener only once
  useEffect(() => {
    if (!eventListenerAdded.current) {
      window.addEventListener("points-updated", handlePointsUpdate);
      eventListenerAdded.current = true;
      console.log("Points update event listener added");
    }

    return () => {
      if (eventListenerAdded.current) {
        window.removeEventListener("points-updated", handlePointsUpdate);
        eventListenerAdded.current = false;
      }
      if (refreshTimeout.current) {
        clearTimeout(refreshTimeout.current);
      }
    };
  }, [handlePointsUpdate]);

  // Remove the automatic interval that was causing continuous refreshing
  // Comment out or remove this useEffect:
  /*
  useEffect(() => {
    const interval = setInterval(() => {
      refreshPoints();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [refreshPoints]);
  */

  const recentSessions = sessions.slice(0, 5);

  const scoreHistory = sessions
    .filter((s) => s.status === "completed" && s.score)
    .slice(-10)
    .map((s) => ({ score: s.score, completed_at: s.completed_at }));

  const handleCardClick = (session) => {
    if (session.status === "completed") {
      navigate(`/interview/${session.id}/result`);
    } else {
      navigate(`/interview/${session.id}`);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-56 bg-white/[0.06] rounded-lg animate-pulse" />
              <div className="h-4 w-40 bg-white/[0.04] rounded animate-pulse" />
            </div>
            <div className="h-10 w-36 bg-white/[0.06] rounded-xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {[...Array(3)].map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] p-8">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-rose-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-display font-semibold mb-1">
              Failed to load dashboard
            </p>
            <p className="text-slate-400 text-sm max-w-sm">{error}</p>
          </div>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Try again
          </button>
        </div>
      </div>
    );

  const statCards = [
    {
      label: "Quizzes Completed",
      value: stats?.completed_sessions ?? 0,
      icon: CheckCircle,
      color: "emerald",
      gradient: "from-emerald-500/20 to-emerald-600/10",
    },
    {
      label: "Average Score",
      value: stats?.average_score > 0 ? Math.round(stats.average_score) : "—",
      suffix: stats?.average_score > 0 ? "%" : "",
      icon: TrendingUp,
      color: "blue",
      gradient: "from-blue-500/20 to-blue-600/10",
    },
    {
      label: "Best Score",
      value: stats?.best_score > 0 ? Math.round(stats.best_score) : "—",
      suffix: stats?.best_score > 0 ? "%" : "",
      icon: Trophy,
      color: "amber",
      gradient: "from-amber-500/20 to-amber-600/10",
    },
    {
      label: "Questions Solved",
      value: stats?.total_questions_answered ?? 0,
      icon: BookOpen,
      color: "purple",
      gradient: "from-purple-500/20 to-purple-600/10",
    },
  ];

  const colorMap = {
    emerald: {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    blue: {
      text: "text-blue-400",
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
    },
    amber: {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    purple: {
      text: "text-purple-400",
      bg: "bg-purple-500/10",
      border: "border-purple-500/20",
    },
  };

  const greeting =
    new Date().getHours() < 12
      ? "morning"
      : new Date().getHours() < 17
        ? "afternoon"
        : "evening";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e]">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl lg:text-4xl text-white mb-1">
              Good {greeting},{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {user?.name?.split(" ")[0]}
              </span>{" "}
              👋
            </h1>
            <p className="text-slate-400 text-sm">
              Track your progress, earn points, and become a top performer!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/resume-upload")}
              title="Upload Resume"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-400
                         hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={refreshPoints}
              title="Refresh"
              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-400
                         hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/interview/new")}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500
                         text-white font-medium text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/25"
            >
              <BookOpen className="w-4 h-4" /> New Quiz
            </button>
          </div>
        </div>

        {/* Points Banner - Dynamic Rank */}
        {pointsEnabled && pointsStats && (
          <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-cyan-500/15 via-purple-500/15 to-pink-500/15 backdrop-blur-sm border border-white/[0.08]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Total Points</p>
                    <p className="text-2xl font-bold text-white">
                      {pointsStats.total_points || 0}
                    </p>
                  </div>
                </div>
              </div>
              {pointsStats.points_to_next_milestone > 0 &&
                pointsStats.points_to_next_milestone !== 50 && (
                  <div className="px-4 py-2 rounded-xl bg-white/[0.05] border border-cyan-500/30">
                    <p className="text-xs text-slate-400">Next milestone in</p>
                    <p className="text-lg font-semibold text-cyan-400">
                      {pointsStats.points_to_next_milestone} points
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}

        {!pointsEnabled && (
          <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-amber-400 text-sm font-medium">
              ✨ Points System Coming Soon!
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Complete quizzes to earn points and track your progress
            </p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map(
            ({ label, value, suffix, icon: Icon, color, gradient }) => {
              const c = colorMap[color];
              return (
                <div
                  key={label}
                  className={`relative overflow-hidden group rounded-2xl bg-gradient-to-br ${gradient} backdrop-blur-sm border border-white/[0.08] p-5 transition-all hover:scale-105 duration-300`}
                >
                  <div className="relative z-10">
                    <div
                      className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`w-5 h-5 ${c.text}`} />
                    </div>
                    <p className="font-display font-bold text-3xl text-white">
                      {value}
                      <span className="text-sm text-slate-400 font-body ml-0.5">
                        {suffix}
                      </span>
                    </p>
                    <p className="text-slate-400 text-xs mt-1">{label}</p>
                  </div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/[0.02] to-transparent rounded-full transform translate-x-10 -translate-y-10" />
                </div>
              );
            },
          )}
        </div>

        {/* Main Grid - Fixed Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Quizzes */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-white text-xl">
                  Recent Quizzes
                </h2>
                <p className="text-slate-500 text-sm">
                  Your latest quiz attempts
                </p>
              </div>
              <button
                onClick={() => navigate("/history")}
                className="text-slate-400 hover:text-cyan-400 text-sm font-body flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {recentSessions.length === 0 ? (
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-12 text-center backdrop-blur-sm">
                <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-cyan-400" />
                </div>
                <p className="text-white font-display font-semibold text-lg mb-1">
                  No quizzes yet
                </p>
                <p className="text-slate-400 text-sm mb-6">
                  Start your first MCQ quiz to test your knowledge
                </p>
                <button
                  onClick={() => navigate("/interview/new")}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium text-sm hover:opacity-90 transition-all"
                >
                  Start Quiz
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleCardClick(s)}
                    className="group rounded-xl bg-white/[0.03] border border-white/[0.08] p-4 flex items-center gap-4 cursor-pointer hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Target className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {s.job_role} {s.topic && `- ${s.topic}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />{" "}
                          {fmtDate(s.created_at)}
                        </p>
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {s.total_questions}{" "}
                          questions
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {s.score != null ? (
                        <div className="text-right">
                          <p
                            className={`font-display font-bold text-2xl ${scoreColor(s.score)}`}
                          >
                            {Math.round(s.score)}
                            <span className="text-sm text-slate-500">%</span>
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium px-2 py-1 rounded-lg text-amber-400 bg-amber-500/10">
                            In progress
                          </span>
                          <Play className="w-4 h-4 text-amber-400" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Topics Section - Moved here for better layout */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 backdrop-blur-sm mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display font-semibold text-white">
                  Quick Quiz Topics
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: "JavaScript",
                    topic: "JavaScript",
                    icon: Zap,
                    gradient: "from-yellow-500/20 to-yellow-600/10",
                    color: "text-yellow-400",
                  },
                  {
                    label: "React",
                    topic: "React, Hooks, State",
                    icon: Target,
                    gradient: "from-blue-500/20 to-blue-600/10",
                    color: "text-blue-400",
                  },
                  {
                    label: "Frontend",
                    topic: "HTML, CSS, JavaScript",
                    icon: BarChart3,
                    gradient: "from-emerald-500/20 to-emerald-600/10",
                    color: "text-emerald-400",
                  },
                  {
                    label: "Python",
                    topic: "Python, Django, Flask",
                    icon: BookOpen,
                    gradient: "from-purple-500/20 to-purple-600/10",
                    color: "text-purple-400",
                  },
                ].map(({ label, topic, icon: Icon, gradient, color }) => (
                  <button
                    key={topic}
                    onClick={() =>
                      navigate(
                        `/interview/new?topic=${encodeURIComponent(topic)}`,
                      )
                    }
                    className={`group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br ${gradient} border border-white/[0.08] hover:border-white/[0.15] transition-all`}
                  >
                    <Icon
                      className={`w-4 h-4 ${color} group-hover:text-white transition-colors`}
                    />
                    <span className="text-slate-300 text-sm group-hover:text-white transition-colors flex-1 text-left">
                      {label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Gamification */}
          <div className="space-y-5">
            <StreakCard onRefresh={refreshPoints} />
            <DailyChallengeCard onPointsUpdate={refreshPoints} />
            <Leaderboard onRefresh={refreshPoints} />

            {/* Score Trend */}
            {scoreHistory.length > 0 && (
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 backdrop-blur-sm">
                <h3 className="font-display font-semibold text-white mb-1">
                  Score Trend
                </h3>
                <p className="text-slate-500 text-xs mb-4">
                  Last {scoreHistory.length} completed quizzes
                </p>
                <div className="flex items-end gap-1.5 h-28">
                  {scoreHistory.map((s, i) => {
                    const pct = Math.max(5, Math.round((s.score / 100) * 96));
                    const fill =
                      s.score >= 70
                        ? "bg-emerald-500"
                        : s.score >= 50
                          ? "bg-amber-400"
                          : "bg-rose-400";
                    return (
                      <div
                        key={i}
                        className="flex-1 flex flex-col justify-end h-full group relative"
                      >
                        <div
                          className={`w-full rounded-t-sm ${fill} opacity-70 group-hover:opacity-100 transition-all duration-300`}
                          style={{ height: `${pct}%` }}
                        />
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 rounded px-2 py-1 text-white text-xs font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {Math.round(s.score)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-3">
                  <span>Oldest</span>
                  <span>Latest</span>
                </div>
              </div>
            )}

            {/* Encouragement Card */}
            <div className="rounded-2xl bg-gradient-to-br from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-white/[0.08] p-5 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center animate-pulse">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-display font-semibold">
                    Keep Practicing!
                  </p>
                  <p className="text-slate-300 text-sm">
                    {stats?.completed_sessions > 0
                      ? `✨ You've completed ${stats.completed_sessions} quizzes so far`
                      : "🚀 Start your first quiz today"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  BarChart3, CheckCircle, Clock, TrendingUp,
  Trophy, Target, Zap, ChevronRight, Play, RefreshCw, AlertCircle, BookOpen, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import { StatSkeleton, CardSkeleton } from '../components/Skeleton';

const scoreColor = (s) =>
  s >= 70 ? 'text-electric-400' : s >= 50 ? 'text-amber-400' : 'text-red-400';

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch MCQ sessions only
      const sessionsRes = await api.get('/mcq/sessions');
      const allSessions = sessionsRes.data.sessions || [];
      setSessions(allSessions);
      
      // Calculate stats from sessions
      const completedSessions = allSessions.filter(s => s.status === 'completed');
      const totalScore = completedSessions.reduce((sum, s) => sum + (s.score || 0), 0);
      const avgScore = completedSessions.length > 0 ? totalScore / completedSessions.length : 0;
      const bestScore = Math.max(...completedSessions.map(s => s.score || 0), 0);
      const totalQuestions = completedSessions.reduce((sum, s) => sum + (s.total_questions || 0), 0);
      
      setStats({
        total_sessions: allSessions.length,
        completed_sessions: completedSessions.length,
        average_score: avgScore,
        best_score: bestScore,
        total_questions_answered: totalQuestions
      });
      
    } catch (err) {
      console.error('Dashboard load error:', err);
      setError(err.response?.data?.error || 'Failed to load dashboard');
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Get recent sessions (last 5)
  const recentSessions = sessions.slice(0, 5);
  
  // Get score history for chart
  const scoreHistory = sessions
    .filter(s => s.status === 'completed' && s.score)
    .slice(-10)
    .map(s => ({ score: s.score, completed_at: s.completed_at }));

  // Handle card click - navigate to result if completed, otherwise to session
  const handleCardClick = (session) => {
    if (session.status === 'completed') {
      navigate(`/interview/${session.id}/result`);
    } else {
      navigate(`/interview/${session.id}`);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-white/[0.06] rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-white/[0.04] rounded animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-white/[0.06] rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <StatSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {[...Array(3)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      </div>
    </div>
  );

  /* ── Error state ── */
  if (error) return (
    <div className="p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-red-400" />
      </div>
      <div className="text-center">
        <p className="text-white font-display font-semibold mb-1">Failed to load dashboard</p>
        <p className="text-slate-500 font-body text-sm max-w-sm">{error}</p>
      </div>
      <button onClick={load} className="btn-electric flex items-center gap-2 text-sm">
        <RefreshCw className="w-4 h-4" /> Try again
      </button>
    </div>
  );

  const statCards = [
    {
      label: 'Quizzes Taken',
      value: stats?.completed_sessions ?? 0,
      icon: CheckCircle,
      color: 'electric',
    },
    {
      label: 'Avg Score',
      value: stats?.average_score > 0 ? Math.round(stats.average_score) : '—',
      suffix: stats?.average_score > 0 ? '%' : '',
      icon: TrendingUp,
      color: 'plasma',
    },
    {
      label: 'Best Score',
      value: stats?.best_score > 0 ? Math.round(stats.best_score) : '—',
      suffix: stats?.best_score > 0 ? '%' : '',
      icon: Trophy,
      color: 'amber',
    },
    {
      label: 'Questions Solved',
      value: stats?.total_questions_answered ?? 0,
      icon: BookOpen,
      color: 'blue',
    },
  ];

  const colorMap = {
    electric: { text: 'text-electric-400', bg: 'bg-electric-500/10', border: 'border-electric-500/20' },
    plasma:   { text: 'text-plasma-400',   bg: 'bg-plasma-500/10',   border: 'border-plasma-500/20' },
    amber:    { text: 'text-amber-400',     bg: 'bg-amber-500/10',    border: 'border-amber-500/20' },
    blue:     { text: 'text-blue-400',      bg: 'bg-blue-500/10',     border: 'border-blue-500/20' },
  };

  const greeting = new Date().getHours() < 12 ? 'morning'
                 : new Date().getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display font-bold text-3xl text-white mb-1">
            Good {greeting},{' '}
            <span className="text-electric-400">{user?.name?.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-slate-400 font-body text-sm">Test your knowledge with MCQ quizzes</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/resume-upload')}
            title="Upload Resume"
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-400
                       hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={load}
            title="Refresh"
            className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-400
                       hover:text-white hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/interview/new')}
            className="btn-electric flex items-center gap-2"
          >
            <BookOpen className="w-4 h-4" /> New Quiz
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, suffix, icon: Icon, color }) => {
          const c = colorMap[color];
          return (
            <div key={label} className="glass-card p-5">
              <div className={`w-9 h-9 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${c.text}`} />
              </div>
              <p className="font-display font-bold text-2xl text-white">
                {value}
                <span className="text-sm text-slate-500 font-body ml-0.5">{suffix}</span>
              </p>
              <p className="text-slate-500 font-body text-xs mt-1">{label}</p>
            </div>
          );
        })}
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Quizzes */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-white text-lg">Recent Quizzes</h2>
            <button
              onClick={() => navigate('/history')}
              className="text-slate-500 hover:text-electric-400 text-sm font-body flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentSessions.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <div className="w-12 h-12 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6 text-electric-400" />
              </div>
              <p className="text-white font-display font-semibold mb-1">No quizzes yet</p>
              <p className="text-slate-500 text-sm font-body mb-4">
                Start your first MCQ quiz to test your knowledge
              </p>
              <button
                onClick={() => navigate('/interview/new')}
                className="btn-electric text-sm px-5 py-2.5"
              >
                Start Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSessions.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleCardClick(s)}
                  className="glass-card p-4 flex items-center gap-4 cursor-pointer
                             hover:border-white/[0.12] transition-all group"
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center shrink-0">
                    <Target className="w-5 h-5 text-electric-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate font-body">
                      {s.job_role} - {s.topic || 'Quiz'}
                    </p>
                    <p className="text-slate-500 text-xs font-body mt-0.5">
                      {fmtDate(s.created_at)} · {s.total_questions} questions
                    </p>
                  </div>

                  {/* Score */}
                  <div className="flex items-center gap-3 shrink-0">
                    {s.score != null ? (
                      <div className="text-right">
                        <p className={`font-display font-bold text-xl ${scoreColor(s.score)}`}>
                          {Math.round(s.score)}
                        </p>
                        <p className="text-slate-600 text-xs font-body">%</p>
                      </div>
                    ) : (
                      <span className="text-xs font-body font-medium px-2 py-1 rounded-lg text-amber-400 bg-amber-500/10">
                        ● In progress
                      </span>
                    )}
                    {s.status === 'in_progress' && (
                      <Play className="w-4 h-4 text-amber-400 group-hover:text-amber-300" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Quick Start Topics */}
          <div className="glass-card p-5">
            <h3 className="font-display font-semibold text-white mb-4">Quick Quiz Topics</h3>
            <div className="space-y-2">
              {[
                { label: 'JavaScript', topic: 'JavaScript', icon: Zap },
                { label: 'React', topic: 'React, Hooks, State', icon: Target },
                { label: 'Frontend', topic: 'HTML, CSS, JavaScript', icon: BarChart3 },
                { label: 'Python', topic: 'Python, Django, Flask', icon: BookOpen },
              ].map(({ label, topic, icon: Icon }) => (
                <button
                  key={topic}
                  onClick={() => navigate(`/interview/new?topic=${encodeURIComponent(topic)}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl
                             bg-white/[0.03] hover:bg-white/[0.06]
                             border border-white/[0.05] hover:border-white/[0.12]
                             transition-all group text-left"
                >
                  <Icon className="w-4 h-4 text-slate-400 group-hover:text-electric-400 transition-colors" />
                  <span className="text-slate-300 text-sm font-body group-hover:text-white transition-colors flex-1">
                    {label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Score trend bars */}
          {scoreHistory.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-display font-semibold text-white mb-1">Score Trend</h3>
              <p className="text-slate-600 font-body text-xs mb-4">Last {scoreHistory.length} completed quizzes</p>
              <div className="flex items-end gap-1.5 h-24">
                {scoreHistory.map((s, i) => {
                  const pct = Math.max(5, Math.round((s.score / 100) * 96));
                  const fill = s.score >= 70 ? 'bg-electric-500'
                             : s.score >= 50 ? 'bg-amber-400' : 'bg-red-400';
                  return (
                    <div key={i} className="flex-1 flex flex-col justify-end h-full group relative">
                      <div
                        className={`w-full rounded-t-sm ${fill} opacity-70 group-hover:opacity-100 transition-opacity`}
                        style={{ height: `${pct}%` }}
                      />
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-ink-800 border border-white/10
                                      rounded px-1.5 py-0.5 text-white text-xs font-mono whitespace-nowrap
                                      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        {Math.round(s.score)}%
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-slate-700 font-body mt-2">
                <span>Oldest</span><span>Latest</span>
              </div>
            </div>
          )}

          {/* Total questions answered */}
          {stats?.total_questions_answered > 0 && (
            <div className="glass-card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-plasma-500/10 border border-plasma-500/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-plasma-400" />
              </div>
              <div>
                <p className="font-display font-bold text-2xl text-white">{stats.total_questions_answered}</p>
                <p className="text-slate-500 font-body text-xs">Questions answered</p>
              </div>
            </div>
          )}

          {/* Encouragement message */}
          <div className="glass-card p-5 bg-gradient-to-r from-electric-500/10 to-purple-500/10">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-electric-400" />
              <div>
                <p className="text-white font-display font-semibold text-sm">Keep Practicing!</p>
                <p className="text-slate-400 text-xs">
                  {stats?.completed_sessions > 0 
                    ? `You've completed ${stats.completed_sessions} quizzes so far`
                    : 'Start your first quiz today'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
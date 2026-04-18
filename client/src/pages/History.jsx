// client/src/pages/History.jsx - Fixed version
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Search, Trash2, Play, Clock, Target, Calendar, 
  BookOpen, Award, CheckCircle, Eye
} from 'lucide-react';

const scoreColor = (s) => {
  if (s == null) return 'text-slate-500';
  if (s >= 70) return 'text-emerald-400';
  if (s >= 50) return 'text-amber-400';
  return 'text-rose-400';
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function History() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await api.get('/mcq/sessions');
      console.log('Fetched sessions:', response.data);
      setSessions(response.data.sessions || []);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast.error('Failed to load quiz history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this quiz session? This action cannot be undone.')) return;
    setDeleting(id);
    try {
      // Fixed endpoint - use correct DELETE endpoint
      await api.delete(`/mcq/sessions/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success('Quiz session deleted successfully');
    } catch (error) {
      console.error('Delete error:', error);
      if (error.response?.status === 404) {
        toast.error('Session not found');
      } else if (error.response?.status === 401) {
        toast.error('Please login again');
        navigate('/login');
      } else {
        toast.error(error.response?.data?.error || 'Failed to delete session');
      }
    } finally {
      setDeleting(null);
    }
  };

  // Handle card click - navigate to result if completed, otherwise to session
  const handleCardClick = (session) => {
    console.log('Card clicked:', session);
    
    if (!session || !session.id) {
      toast.error('Invalid session data');
      return;
    }
    
    // Check if session is completed (has score or status is 'completed')
    const isCompleted = session.status === 'completed' || (session.score !== null && session.score !== undefined);
    
    if (isCompleted) {
      console.log('Navigating to result page:', `/interview/${session.id}/result`);
      navigate(`/interview/${session.id}/result`);
    } else {
      console.log('Navigating to session page:', `/interview/${session.id}`);
      navigate(`/interview/${session.id}`);
    }
  };

  // Direct navigation to result
  const goToResult = (sessionId, e) => {
    e.stopPropagation();
    console.log('Direct navigation to result:', `/interview/${sessionId}/result`);
    navigate(`/interview/${sessionId}/result`);
  };

  // Direct navigation to session
  const goToSession = (sessionId, e) => {
    e.stopPropagation();
    console.log('Direct navigation to session:', `/interview/${sessionId}`);
    navigate(`/interview/${sessionId}`);
  };

  const filtered = sessions.filter(s => {
    const matchSearch = s.job_role?.toLowerCase().includes(search.toLowerCase()) ||
                        s.topic?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // Calculate statistics
  const totalQuizzes = sessions.length;
  const completedQuizzes = sessions.filter(s => s.status === 'completed').length;
  const averageScore = sessions
    .filter(s => s.score != null)
    .reduce((acc, s, _, arr) => acc + (s.score / arr.length), 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl text-white mb-1">Quiz History</h1>
          <p className="text-slate-400 text-sm">
            {totalQuizzes} total quizzes · {completedQuizzes} completed · Avg score: {Math.round(averageScore)}%
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-all"
              placeholder="Search by role or topic…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="px-4 py-2.5 bg-black border border-white/[0.08] rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-all"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">All status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-14 text-center rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div className="w-16 h-16 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-slate-500 font-display font-semibold text-lg mb-2">
              {search || filterStatus !== 'all' ? 'No quizzes match your filters' : 'No quizzes yet'}
            </p>
            <p className="text-slate-400 text-sm mb-6">
              {sessions.length === 0 
                ? 'Start your first MCQ quiz to test your knowledge.' 
                : 'Try adjusting your search or filters.'}
            </p>
            {sessions.length === 0 && (
              <button onClick={() => navigate('/interview/new')} className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all">
                Start Quiz
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const isCompleted = s.status === 'completed' || (s.score !== null && s.score !== undefined);
              return (
                <div
                  key={s.id}
                  onClick={() => handleCardClick(s)}
                  className="group rounded-xl bg-white/[0.03] border border-white/[0.08] p-5 flex items-center gap-5 cursor-pointer hover:border-cyan-500/30 hover:bg-white/[0.05] transition-all"
                >
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                    <Award className="w-6 h-6 text-cyan-400" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-white font-medium text-sm truncate">
                        {s.job_role} {s.topic && `- ${s.topic}`}
                      </p>
                      <span className="text-xs px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 capitalize">
                        MCQ
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500 text-xs flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(s.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {s.total_questions} questions
                      </span>
                      {s.correct_count != null && (
                        <span className="flex items-center gap-1 text-green-400">
                          <CheckCircle className="w-3 h-3" />
                          {s.correct_count} correct
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Score + status + actions */}
                  <div className="flex items-center gap-4 shrink-0">
                    {isCompleted ? (
                      <div className="text-right">
                        <p className={`font-display font-bold text-2xl ${scoreColor(s.score)}`}>
                          {Math.round(s.score)}%
                        </p>
                        <button
                          onClick={(e) => goToResult(s.id, e)}
                          className="mt-1 px-2 py-0.5 rounded text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-all flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> View Results
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-medium px-2 py-1 rounded-lg text-amber-400 bg-amber-500/10">
                          In progress
                        </span>
                        <button
                          onClick={(e) => goToSession(s.id, e)}
                          className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs hover:bg-amber-500/30 transition-all flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" /> Continue
                        </button>
                      </div>
                    )}

                    <button
                      onClick={(e) => handleDelete(s.id, e)}
                      disabled={deleting === s.id}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      {deleting === s.id
                        ? <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin block" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
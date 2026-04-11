import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  Search, Trash2, Play, Clock, Target, Calendar, 
  BookOpen, Award, CheckCircle
} from 'lucide-react';

const scoreColor = (s) => {
  if (s == null) return 'text-slate-500';
  if (s >= 70) return 'text-electric-400';
  if (s >= 50) return 'text-amber-400';
  return 'text-red-400';
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
    if (!confirm('Delete this quiz session?')) return;
    setDeleting(id);
    try {
      await api.delete(`/mcq/session/${id}`);
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success('Quiz session deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete session');
    } finally {
      setDeleting(null);
    }
  };

  // Handle card click - navigate to result if completed, otherwise to session
  const handleCardClick = (session) => {
    if (session.status === 'completed') {
      navigate(`/interview/${session.id}/result`);
    } else {
      navigate(`/interview/${session.id}`);
    }
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
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-white mb-1">Quiz History</h1>
        <p className="text-slate-400 font-body text-sm">
          {totalQuizzes} total quizzes · {completedQuizzes} completed · Avg score: {Math.round(averageScore)}%
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            className="input-field pl-10 py-2.5"
            placeholder="Search by role or topic…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input-field py-2.5 w-auto min-w-[130px] bg-ink-700/60"
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
          <div className="w-8 h-8 border-2 border-electric-500/20 border-t-electric-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-14 text-center">
          <div className="w-16 h-16 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-electric-400" />
          </div>
          <p className="text-slate-500 font-display font-semibold text-lg mb-2">
            {search || filterStatus !== 'all' ? 'No quizzes match your filters' : 'No quizzes yet'}
          </p>
          <p className="text-slate-600 font-body text-sm mb-6">
            {sessions.length === 0 
              ? 'Start your first MCQ quiz to test your knowledge.' 
              : 'Try adjusting your search or filters.'}
          </p>
          {sessions.length === 0 && (
            <button onClick={() => navigate('/interview/new')} className="btn-electric text-sm px-6 py-2.5">
              Start Quiz
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => handleCardClick(s)}
              className="glass-card p-5 flex items-center gap-5 cursor-pointer hover:border-white/[0.12] transition-all group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 text-electric-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-white font-medium text-sm font-body truncate">
                    {s.job_role} - {s.topic || 'General Knowledge'}
                  </p>
                  <span className="text-xs border px-1.5 py-0.5 rounded-md font-body bg-electric-500/10 text-electric-400 border-electric-500/20 capitalize">
                    MCQ
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-500 text-xs font-body flex-wrap">
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

              {/* Score + status */}
              <div className="flex items-center gap-4 shrink-0">
                {s.score != null ? (
                  <div className="text-right">
                    <p className={`font-display font-bold text-2xl ${scoreColor(s.score)}`}>
                      {Math.round(s.score)}
                    </p>
                    <p className="text-slate-600 text-xs">%</p>
                  </div>
                ) : (
                  <span className="text-xs font-medium capitalize px-2 py-1 rounded-lg text-amber-400 bg-amber-500/10">
                    ▶ In progress
                  </span>
                )}

                {/* Resume icon for in_progress */}
                {s.status === 'in_progress' && (
                  <Play className="w-4 h-4 text-amber-400" />
                )}

                <button
                  onClick={(e) => handleDelete(s.id, e)}
                  disabled={deleting === s.id}
                  className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                >
                  {deleting === s.id
                    ? <span className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin block" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRateLimit } from '../utils/useRateLimit';
import { Brain, Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Rate limit hook - persists across page refresh
  const { 
    isRateLimited, 
    remainingTime, 
    formatTime, 
    handleError,
    resetRateLimit 
  } = useRateLimit({ 
    defaultDuration: 900, // 15 minutes
    storageKey: 'login_rate_limit'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await login(form.email, form.password);
      toast.success('Welcome back!');
      resetRateLimit(); // Clear rate limit on successful login
      navigate('/dashboard');
    } catch (err) {
      // Let the hook handle rate limit errors (429)
      const isRateLimitedError = handleError(err);
      
      // If not rate limit error, show normal error
      if (!isRateLimitedError) {
        toast.error(err.response?.data?.error || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-electric-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 rounded-xl bg-electric-500/15 border border-electric-500/25 flex items-center justify-center">
              <Brain className="w-5 h-5 text-electric-400" />
            </div>
            <span className="font-display font-bold text-xl text-white">
              Interview<span className="text-electric-400">AI</span>
            </span>
          </Link>
          <h1 className="font-display font-bold text-3xl text-white mb-2">Welcome back</h1>
          <p className="text-slate-400 font-body text-sm">Sign in to continue your practice</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Rate limit warning message */}
            {isRateLimited && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm text-center">
                  Too many failed attempts. Please wait <span className="font-mono font-bold">{formatTime(remainingTime)}</span> before trying again.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 font-body">Email</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                disabled={isRateLimited}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 font-body">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  className="input-field pr-12"
                  placeholder="Your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  disabled={isRateLimited}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || isRateLimited}
              className="btn-electric w-full flex items-center justify-center gap-2 py-3.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-ink-950/30 border-t-ink-950 rounded-full animate-spin" />
              ) : isRateLimited ? (
                `Try again in ${formatTime(remainingTime)}`
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Sign in
                </>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 font-body text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-electric-400 hover:text-electric-300 font-medium transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
import { useNavigate } from 'react-router-dom';
import { Brain, Zap, Target, BarChart3, ChevronRight, Star, CheckCircle } from 'lucide-react';

const features = [
  { icon: Brain, title: 'Gemini-Powered AI', desc: 'Real-time intelligent feedback from Google\'s most capable AI model.' },
  { icon: Zap, title: 'Instant Evaluation', desc: 'Get scored answers with detailed strengths & improvement areas immediately.' },
  { icon: Target, title: 'Role-Specific Questions', desc: 'Tailored questions for your exact job role, experience level, and interview type.' },
  { icon: BarChart3, title: 'Progress Tracking', desc: 'Track your improvement across sessions with detailed analytics and charts.' },
];

const roles = ['Frontend Engineer', 'Backend Developer', 'Data Scientist', 'Product Manager', 'DevOps Engineer', 'ML Engineer'];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-ink-950 overflow-hidden">
      {/* Grid bg */}
      <div className="fixed inset-0 bg-grid-pattern bg-grid opacity-40 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-electric-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-electric-500/15 border border-electric-500/25 flex items-center justify-center">
            <Brain className="w-5 h-5 text-electric-400" />
          </div>
          <span className="font-display font-bold text-xl text-white">
            Interview<span className="text-electric-400">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/login')} className="btn-ghost text-sm px-5 py-2.5">
            Sign in
          </button>
          <button onClick={() => navigate('/register')} className="btn-electric text-sm px-5 py-2.5">
            Get started free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-electric-500/10 border border-electric-500/20 rounded-full px-4 py-1.5 mb-8">
          <Star className="w-3.5 h-3.5 text-electric-400" />
          <span className="text-electric-400 font-body text-xs font-medium">Powered by Google Gemini AI</span>
        </div>

        <h1 className="font-display font-extrabold text-5xl md:text-7xl text-white leading-[1.05] mb-6">
          Ace your next<br />
          <span className="gradient-text">tech interview</span>
        </h1>

        <p className="text-slate-400 font-body text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Practice with an AI coach that gives real-time feedback, scores your answers,
          and helps you improve — tailored to your role and experience level.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={() => navigate('/register')} className="btn-electric flex items-center gap-2 text-base px-8 py-3.5">
            Start practicing free <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => navigate('/login')} className="btn-ghost text-base px-8 py-3.5">
            Sign in to continue
          </button>
        </div>

        {/* Floating role chips */}
        <div className="flex flex-wrap justify-center gap-2 mt-12">
          {roles.map(r => (
            <span key={r} className="bg-ink-800/80 border border-white/[0.07] rounded-full px-3 py-1 text-slate-400 text-xs font-body">
              {r}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass-card p-6 group hover:border-electric-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center mb-4 group-hover:bg-electric-500/15 transition-colors">
                <Icon className="w-5 h-5 text-electric-400" />
              </div>
              <h3 className="font-display font-semibold text-white text-lg mb-2">{title}</h3>
              <p className="text-slate-400 font-body text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-8 py-16 text-center">
        <div className="glass-card p-10 border-electric-500/15">
          <h2 className="font-display font-bold text-3xl text-white mb-3">Ready to level up?</h2>
          <p className="text-slate-400 font-body mb-8">Join thousands of engineers preparing smarter with AI coaching.</p>
          <button onClick={() => navigate('/register')} className="btn-electric px-10 py-3.5 text-base">
            Create free account
          </button>
        </div>
      </section>
    </div>
  );
}

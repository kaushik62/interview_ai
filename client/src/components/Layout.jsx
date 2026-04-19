import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Mic, History, LogOut, Brain, ChevronRight, Trophy
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/interview/new', icon: Mic, label: 'New Interview' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="h-screen overflow-hidden bg-ink-950 flex">
      {/* Sidebar - Full height, no scroll */}
      <aside
        className={`flex flex-col border-r border-white/[0.06] bg-ink-900/80 backdrop-blur-sm
                   transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} shrink-0 h-full overflow-y-auto`}
      >
        {/* Logo - Sticky at top */}
        <div className={`sticky top-0 bg-ink-900/80 backdrop-blur-sm z-10 flex items-center gap-3 px-4 py-5 border-b border-white/[0.06] ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg bg-electric-500/20 border border-electric-500/30 flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4 text-electric-400" />
          </div>
          {!collapsed && (
            <span className="font-display font-bold text-white tracking-tight text-lg">
              Interview<span className="text-electric-400">AI</span>
            </span>
          )}
        </div>

        {/* Nav - Scrollable if needed */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                 ${isActive
                   ? 'bg-electric-500/10 text-electric-400 border border-electric-500/20'
                   : 'text-slate-400 hover:text-white hover:bg-white/5'
                 } ${collapsed ? 'justify-center' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-electric-400' : ''}`} />
                  {!collapsed && <span className="font-body text-sm font-medium">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User / Collapse - Sticky at bottom */}
        <div className="sticky bottom-0 bg-ink-900/80 backdrop-blur-sm border-t border-white/[0.06] p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-electric-500 to-plasma-500 flex items-center justify-center shrink-0">
                <span className="text-ink-950 font-display font-bold text-xs">
                  {user?.name?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user?.name}</p>
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400
                       hover:text-danger hover:bg-danger/10 transition-all duration-200
                       ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span className="font-body text-sm">Sign out</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600
                       hover:text-slate-400 transition-all duration-200
                       ${collapsed ? 'justify-center' : 'justify-end'}`}
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-0' : 'rotate-180'}`} />
          </button>
        </div>
      </aside>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto h-full">
        <Outlet />
      </main>
    </div>
  );
}
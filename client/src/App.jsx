import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NewInterview from './pages/NewInterview';
import InterviewSession from './pages/InterviewSession';
import SessionResult from './pages/SessionResult';
import History from './pages/History';
import Layout from './components/Layout';
import DailyChallenge from './pages/DailyChallenge';
import Leaderboard from './pages/Leaderboard';

const Protected = ({ children }) => {
  const { user, loading, token } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  // Check both user object and token for authentication
  if (!user || !token) {
    console.log('User not authenticated, redirecting to landing page');
    return <Navigate to="/" replace />;
  }
  
  return children;
};

const Guest = ({ children }) => {
  const { user, loading, token } = useAuth();
  
  if (loading) {
    return <PageLoader />;
  }
  
  // If user is logged in, redirect to dashboard
  if (user && token) {
    console.log('User already logged in, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const PageLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
      <p className="text-slate-500 font-body text-sm">Loading InterviewAI…</p>
    </div>
  </div>
);

export default function App() {
  return (
    <Routes>
      {/* Public Routes - Only accessible when NOT logged in */}
      <Route path="/" element={<Guest><Landing /></Guest>} />
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      
      {/* Result Route - Protected, outside Layout for cleaner display */}
      <Route 
        path="/interview/:id/result" 
        element={
          <Protected>
            <SessionResult />
          </Protected>
        } 
      />
      
      {/* Protected Routes - Require authentication with Layout */}
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interview/new" element={<NewInterview />} />
        <Route path="/interview/:id" element={<InterviewSession />} />
        <Route path="/history" element={<History />} />
        <Route path="/daily-challenge" element={<DailyChallenge />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Route>
      
      {/* 404 - Redirect to landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
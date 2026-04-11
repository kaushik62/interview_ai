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
import ResumeUpload from './components/ResumeUpload';

const Protected = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? children : <Navigate to="/login" replace />;
};

const Guest = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return !user ? children : <Navigate to="/dashboard" replace />;
};

const PageLoader = () => (
  <div className="min-h-screen bg-ink-950 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-electric-500/20 border-t-electric-500 animate-spin" />
      <p className="text-slate-500 font-body text-sm">Loading InterviewAI…</p>
    </div>
  </div>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Guest><Landing /></Guest>} />
      <Route path="/login" element={<Guest><Login /></Guest>} />
      <Route path="/register" element={<Guest><Register /></Guest>} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/interview/new" element={<NewInterview />} />
        <Route path="/interview/:id" element={<InterviewSession />} />
        <Route path="/interview/:id/result" element={<SessionResult />} />
        <Route path="/history" element={<History />} />
        <Route path="/resume-upload" element={<Protected><ResumeUpload /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

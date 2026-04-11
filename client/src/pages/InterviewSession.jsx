// client/src/pages/InterviewSession.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const InterviewSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mcqAnswers, setMcqAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if we have a valid session ID
    if (!id || id === 'undefined') {
      console.error('Invalid session ID:', id);
      setError('Invalid session ID');
      setLoading(false);
      return;
    }

    // Check if user is authenticated
    if (!isAuthenticated()) {
      console.error('Not authenticated');
      setError('Authentication required. Please login again.');
      setLoading(false);
      navigate('/login');
      return;
    }

    fetchSession();
  }, [id, token, navigate, isAuthenticated]);

  const fetchSession = async () => {
    try {
      console.log('Fetching session with ID:', id);
      
      // Using api utility - no hardcoded URL
      const response = await api.get(`/mcq/session/${id}`);
      
      console.log('Session data received:', response.data);
      
      setQuestions(response.data.questions || []);
      setSessionData(response.data.session);
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching session:', error);
      
      if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      
      setError(error.response?.data?.error || 'Failed to load session');
      setLoading(false);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    }
  };

  const submitAnswer = async (selectedIndex) => {
    const newAnswers = [...mcqAnswers, selectedIndex];
    setMcqAnswers(newAnswers);
    
    if (currentIndex + 1 >= questions.length) {
      // Quiz finished - submit all answers
      setSubmitting(true);
      try {
        // Using api utility - no hardcoded URL
        const response = await api.post(`/mcq/submit/${id}`, { answers: newAnswers });
        
        navigate(`/interview/${id}/result`, { state: { results: response.data } });
      } catch (error) {
        console.error('Error submitting answers:', error);
        
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }
        
        alert(error.response?.data?.error || 'Failed to submit answers. Please try again.');
        setSubmitting(false);
      }
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-white font-display font-semibold mb-2">Error Loading Quiz</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-electric text-sm px-5 py-2.5"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-electric-500/20 border-t-electric-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No questions found for this quiz.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-electric text-sm px-5 py-2.5"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-ink-950 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white transition-colors mb-4"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}% Complete</span>
          </div>
          <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-electric-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-ink-900 rounded-xl border border-ink-800 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-electric-500/10 text-electric-400 text-xs rounded-full">
              Multiple Choice
            </span>
            <span className="px-2 py-1 bg-ink-800 text-slate-400 text-xs rounded-full">
              {sessionData?.job_role || 'Quiz'}
            </span>
          </div>
          
          <h2 className="text-xl font-bold text-white mb-6">
            {currentQuestion.question}
          </h2>
          
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => submitAnswer(idx)}
                disabled={submitting}
                className="w-full text-left p-4 bg-ink-800 hover:bg-ink-700 rounded-lg border border-ink-700 hover:border-electric-500 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="font-mono text-electric-400 font-bold mr-3">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span className="text-slate-200">{option}</span>
              </button>
            ))}
          </div>
        </div>

        {submitting && (
          <div className="text-center text-slate-400">
            <div className="inline-flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-electric-500/20 border-t-electric-500 animate-spin" />
              Submitting your answers...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewSession;
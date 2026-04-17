// client/src/pages/InterviewSession.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const InterviewSession = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || id === 'undefined') {
      console.error('Invalid session ID:', id);
      setError('Invalid session ID');
      setLoading(false);
      return;
    }

    if (!isAuthenticated()) {
      console.error('Not authenticated');
      setError('Authentication required. Please login again.');
      setLoading(false);
      navigate('/login');
      return;
    }

    fetchSession();
  }, [id, navigate, isAuthenticated]);

  const fetchSession = async () => {
    try {
      console.log('Fetching session with ID:', id);
      
      const response = await api.get(`/mcq/sessions/${id}`);
      
      console.log('Session data received:', response.data);
      
      setQuestions(response.data.questions || []);
      setSessionData(response.data.session);
      
      // Initialize answers
      const initialAnswers = {};
      response.data.questions.forEach((_, index) => {
        initialAnswers[index] = {
          answerIndex: null,
          answerText: null
        };
      });
      setAnswers(initialAnswers);
      
      setLoading(false);
      
    } catch (error) {
      console.error('Error fetching session:', error);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      
      setError(error.response?.data?.error || 'Failed to load session');
      setLoading(false);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    }
  };

  const handleAnswerSelect = (selectedIndex) => {
    const currentQuestion = questions[currentIndex];
    const selectedText = currentQuestion?.options[selectedIndex];
    
    setAnswers(prev => ({
      ...prev,
      [currentIndex]: {
        answerIndex: selectedIndex,
        answerText: selectedText
      }
    }));
  };

  const handleNext = () => {
    // Auto-skip: Just move to next question without any validation
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    const unansweredCount = Object.values(answers).filter(a => a?.answerIndex === null).length;
    
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered question(s). Unanswered questions will be marked incorrect. Are you sure you want to submit?`
      );
      if (!confirmSubmit) {
        return;
      }
    }

    setSubmitting(true);
    
    try {
      // Convert answers object to array of answer indices (null for unanswered)
      const answersArray = Object.keys(answers)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .map(key => answers[key]?.answerIndex !== undefined && answers[key]?.answerIndex !== null 
          ? answers[key].answerIndex 
          : null);
      
      console.log('Submitting answers:', answersArray);
      
      const response = await api.post(`/mcq/sessions/${id}/submit`, { 
        answers: answersArray 
      });
      
      console.log('Submit response:', response.data);
      
      toast.success(`Quiz completed! You scored ${response.data.score}%`);
      
      // Pass both results and questions with answers to result page
      navigate(`/interview/${id}/result`, { 
        state: { 
          results: response.data,
          questions: questions,
          userAnswers: answers
        } 
      });
      
    } catch (error) {
      console.error('Error submitting quiz:', error);
      
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
        return;
      }
      
      toast.error(error.response?.data?.error || 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-white font-display font-semibold mb-2">Error Loading Quiz</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No questions found for this quiz.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const isFirstQuestion = currentIndex === 0;
  const answeredCount = Object.values(answers).filter(a => a?.answerIndex !== null).length;
  const isCurrentAnswered = answers[currentIndex]?.answerIndex !== null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white transition-colors mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Progress Bar */}
        <div className="glass-card p-4 rounded-xl mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{answeredCount} of {questions.length} answered</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="glass-card p-6 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-xs rounded-full">
                Multiple Choice
              </span>
              <span className="px-2 py-1 bg-white/[0.06] text-slate-400 text-xs rounded-full">
                {sessionData?.job_role || 'Quiz'}
              </span>
            </div>
            {!isCurrentAnswered && (
              <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-full">
                Not answered yet
              </span>
            )}
          </div>
          
          <h2 className="text-xl font-bold text-white mb-6">
            {currentQuestion?.question}
          </h2>
          
          <div className="space-y-3">
            {currentQuestion?.options?.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all border
                  ${answers[currentIndex]?.answerIndex === idx 
                    ? 'border-cyan-500 bg-cyan-500/10' 
                    : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
              >
                <input
                  type="radio"
                  name="question"
                  value={idx}
                  checked={answers[currentIndex]?.answerIndex === idx}
                  onChange={() => handleAnswerSelect(idx)}
                  disabled={submitting}
                  className="w-4 h-4 text-cyan-500"
                />
                <span className="text-slate-300">{option}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={handlePrevious}
            disabled={isFirstQuestion}
            className={`px-6 py-2 rounded-lg font-medium transition-all
              ${isFirstQuestion 
                ? 'bg-white/[0.03] text-slate-600 cursor-not-allowed' 
                : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
              }`}
          >
            Previous
          </button>
          
          {!isLastQuestion ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-medium hover:opacity-90 transition-all"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          )}
        </div>

        {/* Question Navigator */}
        <div className="mt-6">
          <p className="text-xs text-slate-500 mb-2 text-center">Jump to question:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {questions.map((_, idx) => {
              const isAnswered = answers[idx]?.answerIndex !== null;
              
              return (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all
                    ${currentIndex === idx 
                      ? 'bg-cyan-500 text-white' 
                      : isAnswered
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/[0.06] text-slate-400 hover:bg-white/[0.1]'
                    }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Unanswered Warning */}
        {answeredCount < questions.length && (
          <div className="mt-4 p-3 bg-yellow-500/10 rounded-lg text-center border border-yellow-500/20">
            <p className="text-xs text-yellow-400">
              ⚠️ {questions.length - answeredCount} question(s) not answered yet. You can review them before submitting.
            </p>
          </div>
        )}

        {/* Points Info Bar */}
        <div className="mt-4 p-3 bg-white/[0.03] rounded-lg text-center border border-white/[0.08]">
          <p className="text-xs text-slate-500">
            Complete this quiz to earn points and increase your streak! 🔥
          </p>
        </div>
      </div>
    </div>
  );
};

export default InterviewSession;
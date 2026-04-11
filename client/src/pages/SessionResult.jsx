// client/src/pages/SessionResult.jsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { Trophy, CheckCircle, XCircle, ArrowLeft, RotateCcw, Home } from 'lucide-react';

const SessionResult = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      console.log('SessionResult - ID from URL:', id);
      console.log('Location state:', location.state);
      
      // Check if results were passed via state (from quiz completion)
      if (location.state?.results) {
        console.log('Using results from state');
        setResults(location.state.results);
        setLoading(false);
        return;
      }

      // Check if we have a session ID
      if (!id) {
        console.error('No session ID provided');
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      // Otherwise fetch from API
      try {
        console.log('Fetching session from API:', id);
        const response = await api.get(`/mcq/session/${id}`);
        console.log('API Response:', response.data);
        
        const session = response.data.session;
        const questions = response.data.questions || [];

        if (!session) {
          setError('Session not found');
          setLoading(false);
          return;
        }

        if (session.status !== 'completed') {
          setError('This quiz is not completed yet. Please complete the quiz first.');
          setLoading(false);
          return;
        }

        if (questions.length === 0) {
          setError('No questions found for this session');
          setLoading(false);
          return;
        }

        // Calculate results from questions data
        let correctCount = 0;
        const resultsList = questions.map((q, idx) => {
          const isCorrect = q.user_answer === q.correct_answer;
          if (isCorrect) correctCount++;
          
          let options = [];
          try {
            options = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
          } catch (e) {
            options = q.options || ['Option A', 'Option B', 'Option C', 'Option D'];
          }

          return {
            question: q.question,
            userAnswer: q.user_answer !== null && q.user_answer !== undefined 
              ? options[q.user_answer] 
              : 'Not answered',
            correctAnswer: options[q.correct_answer],
            isCorrect: isCorrect,
            explanation: q.explanation || 'No explanation provided.'
          };
        });

        const percentage = Math.round((correctCount / questions.length) * 100);
        
        setResults({
          score: percentage,
          correctCount: correctCount,
          totalQuestions: questions.length,
          results: resultsList,
          message: percentage >= 70 ? "Great job! 🎉" : percentage >= 50 ? "Good effort! 👍" : "Keep practicing! 💪"
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching results:', err);
        console.error('Error response:', err.response);
        setError(err.response?.data?.error || 'Failed to load results');
        setLoading(false);
      }
    };

    fetchResults();
  }, [id, location.state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-electric-500/20 border-t-electric-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-400 mb-2 font-semibold">Error</p>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-ink-800 hover:bg-ink-700 text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/history')}
              className="px-4 py-2 bg-electric-500 hover:bg-electric-600 text-white rounded-lg transition-colors"
            >
              View History
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No results found</p>
          <button onClick={() => navigate('/dashboard')} className="btn-electric text-sm px-5 py-2.5">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>

        <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-8 text-center mb-8">
          <Trophy className="w-16 h-16 text-electric-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Results</h1>
          <div className="text-6xl font-bold text-white mb-2">{results.score}%</div>
          <p className="text-slate-300 mb-4">
            {results.correctCount} / {results.totalQuestions} Correct
          </p>
          <p className="text-electric-400">{results.message}</p>
        </div>

        <h2 className="text-xl font-bold text-white mb-4">Detailed Review</h2>
        <div className="space-y-4">
          {results.results.map((result, index) => (
            <div key={index} className="bg-ink-900 rounded-xl border border-ink-800 p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-electric-400 font-bold">Q{index + 1}</span>
                  <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
                    result.isCorrect 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {result.isCorrect ? (
                      <><CheckCircle className="w-3 h-3" /> Correct</>
                    ) : (
                      <><XCircle className="w-3 h-3" /> Incorrect</>
                    )}
                  </span>
                </div>
              </div>
              <p className="text-white mb-3">{result.question}</p>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-slate-400">Your answer:</span>{' '}
                  <span className={result.isCorrect ? 'text-green-400' : 'text-red-400'}>
                    {result.userAnswer}
                  </span>
                </p>
                {!result.isCorrect && (
                  <p>
                    <span className="text-slate-400">Correct answer:</span>{' '}
                    <span className="text-green-400">{result.correctAnswer}</span>
                  </p>
                )}
                <p>
                  <span className="text-slate-400">Explanation:</span>{' '}
                  <span className="text-slate-300">{result.explanation}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => navigate('/interview/new')}
            className="flex-1 py-3 bg-electric-500 hover:bg-electric-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Take Another Quiz
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-3 bg-ink-800 hover:bg-ink-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionResult;
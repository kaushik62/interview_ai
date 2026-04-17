// client/src/pages/SessionResult.jsx
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../utils/api';
import { Trophy, CheckCircle, XCircle, ArrowLeft, RotateCcw, Home, BookOpen, Lightbulb } from 'lucide-react';

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
      
      // Check if results were passed via state with questions and answers
      if (location.state?.results && location.state?.questions) {
        console.log('Using results from state with questions');
        
        const { results: resultsData, questions, userAnswers } = location.state;
        
        // Format results with proper answer texts
        const formattedResults = {
          score: resultsData.score,
          correctCount: resultsData.correctCount,
          totalQuestions: resultsData.totalQuestions,
          pointsEarned: resultsData.pointsEarned,
          results: questions.map((question, idx) => {
            const resultItem = resultsData.results?.[idx] || {};
            const userAnswer = userAnswers?.[idx];
            
            return {
              question: question.question,
              userAnswerText: userAnswer?.answerText || resultItem.userAnswerText || 'Not answered',
              userAnswerIndex: userAnswer?.answerIndex,
              correctAnswerText: question.options[question.correct_answer],
              correctAnswerIndex: question.correct_answer,
              isCorrect: resultItem.isCorrect || (userAnswer?.answerIndex === question.correct_answer),
              explanation: question.explanation || 'No explanation provided.',
              options: question.options
            };
          })
        };
        
        setResults(formattedResults);
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
        const response = await api.get(`/mcq/sessions/${id}/result`);
        console.log('API Response:', response.data);
        
        const session = response.data.session;
        const resultsData = response.data.results || [];

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

        if (resultsData.length === 0) {
          setError('No results found for this session');
          setLoading(false);
          return;
        }

        setResults({
          score: response.data.score || session.score || 0,
          correctCount: response.data.correctCount || session.correct_count || 0,
          totalQuestions: session.total_questions || resultsData.length,
          pointsEarned: response.data.pointsEarned || 0,
          results: resultsData,
          message: getScoreMessage(response.data.score || session.score || 0)
        });
        
        setLoading(false);
        
      } catch (err) {
        console.error('Error fetching results:', err);
        setError(err.response?.data?.error || 'Failed to load results');
        setLoading(false);
      }
    };

    fetchResults();
  }, [id, location.state, navigate]);

  const getScoreMessage = (score) => {
    if (score >= 80) return "Excellent! 🎉 You're a star!";
    if (score >= 70) return "Great job! 🎯 Keep it up!";
    if (score >= 60) return "Good effort! 👍 Almost there!";
    if (score >= 50) return "Nice try! 💪 Practice makes perfect!";
    return "Keep practicing! 📚 Review the explanations and try again.";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-400 mb-2 font-semibold">Error</p>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => navigate('/interview/new')}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 hover:opacity-90 text-white rounded-lg transition-all"
            >
              New Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">No results found</p>
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

  const isPassing = results.score >= 70;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
        </div>

        {/* Score Card */}
        <div className={`rounded-xl p-8 text-center mb-8 ${
          isPassing 
            ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20' 
            : 'bg-gradient-to-r from-orange-500/20 to-red-500/20'
        }`}>
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${isPassing ? 'text-cyan-400' : 'text-orange-400'}`} />
          <h1 className="text-3xl font-bold text-white mb-2">Quiz Results</h1>
          <div className="text-6xl font-bold text-white mb-2">{results.score}%</div>
          <p className="text-slate-300 mb-4">
            {results.correctCount} / {results.totalQuestions} Correct
          </p>
          
          {/* Points Earned */}
          {results.pointsEarned > 0 && (
            <div className="mt-4 p-3 bg-green-500/20 rounded-lg inline-block">
              <p className="text-green-400">+{results.pointsEarned} points earned! 🎉</p>
            </div>
          )}
          
          <p className={`mt-4 ${isPassing ? 'text-cyan-400' : 'text-orange-400'}`}>
            {results.message}
          </p>
        </div>

        {/* Detailed Review */}
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          Detailed Review
        </h2>
        
        <div className="space-y-4">
          {results.results.map((result, index) => (
            <div key={index} className="glass-card rounded-xl overflow-hidden">
              {/* Question Header */}
              <div className={`p-4 border-b ${
                result.isCorrect 
                  ? 'bg-green-500/10 border-green-500/20' 
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-cyan-400 font-bold text-lg">Q{index + 1}</span>
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
                <p className="text-white font-medium mt-2">{result.question}</p>
              </div>
              
              {/* Answer Details */}
              <div className="p-4 space-y-3">
                {/* Your Answer */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-slate-400">A</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Your Answer:</p>
                    <p className={`font-medium ${
                      result.isCorrect ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {result.userAnswerText || 'Not answered'}
                    </p>
                  </div>
                </div>
                
                {/* Correct Answer - Always show for clarity */}
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-1">Correct Answer:</p>
                    <p className="font-medium text-green-400">
                      {result.correctAnswerText}
                    </p>
                  </div>
                </div>
                
                {/* Explanation */}
                {result.explanation && (
                  <div className="flex items-start gap-3 mt-3 pt-3 border-t border-white/[0.08]">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-3 h-3 text-cyan-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500 mb-1">Explanation:</p>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {result.explanation}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <button
            onClick={() => navigate('/interview/new')}
            className="flex-1 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold transition-all hover:opacity-90 flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Take Another Quiz
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex-1 py-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionResult;
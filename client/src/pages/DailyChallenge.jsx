// client/src/pages/DailyChallenge.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Calendar, Award, ArrowLeft, AlertCircle } from 'lucide-react';

const DailyChallenge = () => {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChallenge();
  }, []);

  const fetchChallenge = async () => {
    try {
      const res = await api.get('/points/daily-challenge');
      setChallenge(res.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      setError(error.response?.data?.error || 'Failed to load daily challenge');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (selectedIndex) => {
    const newAnswers = [...answers, selectedIndex];
    setAnswers(newAnswers);

    if (currentIndex + 1 >= challenge.questions.length) {
      setSubmitting(true);
      try {
        const res = await api.post('/points/daily-challenge/submit', { answers: newAnswers });
        setResult(res.data);
      } catch (error) {
        console.error('Error submitting:', error);
        setError(error.response?.data?.error || 'Failed to submit challenge');
      } finally {
        setSubmitting(false);
      }
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-electric-500/20 border-t-electric-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Unable to Load Challenge</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-electric-500 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-ink-950 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-slate-400 hover:text-white mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>

          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-8 text-center mb-8">
            <Award className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">Challenge Complete!</h1>
            <div className="text-6xl font-bold text-yellow-400 mb-4">{result.score}%</div>
            <p className="text-slate-300 mb-2">
              {result.correctCount} / {result.totalQuestions} Correct
            </p>
            <p className="text-green-400 mb-2">+{result.pointsEarned} points earned! 🎉</p>
            {result.streakBonus > 0 && (
              <p className="text-orange-400 text-sm">+{result.streakBonus} streak bonus! 🔥</p>
            )}
            <p className="text-purple-400 mt-4">{result.message}</p>
          </div>

          <h3 className="text-white font-bold text-lg mb-4">Detailed Review</h3>
          <div className="space-y-4">
            {result.results?.map((r, idx) => (
              <div key={idx} className="bg-ink-900 rounded-xl border border-ink-800 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    r.isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {r.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                  </span>
                </div>
                <p className="text-white text-sm mb-2">{r.question}</p>
                <p className="text-slate-400 text-xs">Your answer: {r.userAnswer}</p>
                {!r.isCorrect && (
                  <p className="text-green-400 text-xs mt-1">Correct: {r.correctAnswer}</p>
                )}
                <p className="text-slate-500 text-xs mt-2">{r.explanation}</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full mt-8 py-3 bg-electric-500 hover:bg-electric-600 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!challenge || !challenge.questions) {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center">
        <p className="text-slate-400">No challenge available</p>
      </div>
    );
  }

  const currentQuestion = challenge.questions[currentIndex];

  return (
    <div className="min-h-screen bg-ink-950 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-slate-400 hover:text-white mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-400" />
              <span className="text-purple-400">Daily Challenge</span>
            </div>
            <span className="text-white">+25 points</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-slate-400 mb-2">
            <span>Question {currentIndex + 1} of {challenge.totalQuestions}</span>
            <span>{Math.round(((currentIndex + 1) / challenge.totalQuestions) * 100)}%</span>
          </div>
          <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / challenge.totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-ink-900 rounded-xl border border-ink-800 p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-6">{currentQuestion.question}</h2>
          
          <div className="space-y-3">
            {currentQuestion.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => submitAnswer(idx)}
                disabled={submitting}
                className="w-full text-left p-4 bg-ink-800 hover:bg-ink-700 rounded-lg border border-ink-700 hover:border-purple-500 transition-all"
              >
                <span className="font-mono text-purple-400 font-bold mr-3">
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
              Submitting...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyChallenge;
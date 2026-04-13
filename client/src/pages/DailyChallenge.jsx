// client/src/pages/DailyChallenge.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Calendar, Award, ArrowLeft, Loader } from 'lucide-react';

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
    setLoading(true);
    try {
      const res = await api.get('/points/daily-challenge');
      setChallenge(res.data);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      setError('Failed to load challenge');
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
        setError('Failed to submit answers');
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
        <Loader className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ink-950 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-400 mb-4">{error}</p>
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
            <p className="text-purple-400 mt-4">{result.message}</p>
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
                className="w-full text-left p-4 bg-ink-800 hover:bg-ink-700 rounded-lg border border-ink-700 hover:border-purple-500 transition-all disabled:opacity-50"
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
              <Loader className="w-4 h-4 animate-spin" />
              Submitting...
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyChallenge;
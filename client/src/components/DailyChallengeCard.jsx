// components/DailyChallengeCard.jsx - FIXED VERSION
import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { Calendar, Zap, Trophy, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DailyChallengeCard({ onPointsUpdate }) {
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const loadChallenge = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Loading daily challenge...');
      const response = await api.get('/points/daily-challenge');
      console.log('Daily challenge response:', response.data);
      
      if (isMounted.current) {
        setChallenge(response.data);
        
        // Reset states for new challenge
        if (!response.data.hasCompleted) {
          setAnswers({});
          setSubmitted(false);
          setResult(null);
        } else {
          setSubmitted(true);
        }
      }
    } catch (err) {
      console.error('Failed to load daily challenge:', err);
      if (isMounted.current) {
        setError(err.response?.data?.error || 'Failed to load challenge');
        if (err.response?.status !== 503) {
          toast.error('Failed to load daily challenge');
        }
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    isMounted.current = true;
    loadChallenge();
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleAnswerSelect = (questionIndex, answerIndex) => {
    if (submitted) return;
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: answerIndex
    }));
  };

  const handleSubmit = async () => {
    const totalQuestions = challenge?.questions?.length || 0;
    const answeredCount = Object.keys(answers).length;
    
    if (answeredCount < totalQuestions) {
      toast.error(`Please answer all ${totalQuestions} questions before submitting`);
      return;
    }

    try {
      setSubmitting(true);
      
      // Convert answers object to array format (0-indexed)
      const answersArray = [];
      for (let i = 0; i < totalQuestions; i++) {
        // Questions are 0-indexed in the array, but answers stored with keys 0,1,2...
        answersArray.push(answers[i] !== undefined ? answers[i] : null);
      }
      
      console.log('Submitting answers array:', answersArray);
      
      const response = await api.post('/points/daily-challenge/submit', {
        answers: answersArray
      });
      
      console.log('Submit response:', response.data);
      
      if (isMounted.current) {
        setResult(response.data);
        setSubmitted(true);
        
        // Show success message with points
        toast.success(response.data.message || `You earned ${response.data.pointsEarned} points!`);
        
        // Notify parent component to refresh points
        if (onPointsUpdate) {
          await onPointsUpdate();
        }
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('points-updated'));
        
        // Reload challenge to update completion status after 2 seconds
        setTimeout(() => {
          if (isMounted.current) {
            loadChallenge();
          }
        }, 2000);
      }
      
    } catch (err) {
      console.error('Failed to submit challenge:', err);
      const errorMsg = err.response?.data?.error || 'Failed to submit challenge';
      
      if (isMounted.current) {
        toast.error(errorMsg);
        
        if (err.response?.data?.alreadyCompleted) {
          setSubmitted(true);
          loadChallenge(); // Reload to show completed status
        }
      }
    } finally {
      if (isMounted.current) {
        setSubmitting(false);
      }
    }
  };

  const handleRetry = () => {
    loadChallenge();
  };

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-white/[0.06] rounded animate-pulse" />
          <div className="h-4 w-20 bg-white/[0.04] rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-5 text-center">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <p className="text-slate-400 text-sm font-medium">Daily Challenge</p>
        <p className="text-slate-500 text-xs mt-1">{error}</p>
        <button 
          onClick={handleRetry}
          className="mt-3 text-xs text-electric-400 hover:text-electric-300 flex items-center gap-1 mx-auto"
        >
          <RefreshCw className="w-3 h-3" /> Try Again →
        </button>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="glass-card p-5 text-center">
        <Calendar className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">No challenge available</p>
        <p className="text-slate-500 text-xs mt-1">Check back tomorrow!</p>
      </div>
    );
  }

  // Show results if submitted
  if (submitted && result) {
    const isPerfect = result.correctCount === result.totalQuestions;
    const isGood = result.score >= 70;
    
    return (
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <Trophy className={`w-4 h-4 ${isPerfect ? 'text-yellow-400' : isGood ? 'text-electric-400' : 'text-slate-400'}`} />
            Challenge Complete!
          </h3>
          <span className="text-xs text-slate-500">{challenge.challengeDate || challenge.challengeId?.split('-')[1]}</span>
        </div>

        {/* Score Display */}
        <div className="text-center mb-4">
          <div className="text-4xl font-bold text-white mb-1">
            {result.score}%
          </div>
          <p className="text-sm text-slate-400">
            {result.correctCount} / {result.totalQuestions} Correct
          </p>
        </div>

        {/* Points Earned */}
        <div className={`rounded-lg p-3 mb-4 text-center ${
          result.pointsEarned > 0 ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20' : 'bg-slate-500/10'
        }`}>
          <p className="text-2xl font-bold text-green-400">
            +{result.pointsEarned} points earned! 🎉
          </p>
          {result.streakBonus > 0 && (
            <p className="text-xs text-orange-400 mt-1">
              +{result.streakBonus} streak bonus! 🔥
            </p>
          )}
          <p className="text-sm text-white mt-2">
            Total Points: {result.totalPoints}
          </p>
        </div>

        {/* Question Results Summary */}
        <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
          {result.results?.map((res, idx) => {
            const question = challenge.questions[idx];
            return (
              <div key={idx} className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]">
                <div className="flex items-start gap-2">
                  {res.isCorrect ? (
                    <CheckCircle className="w-3 h-3 text-green-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-xs text-slate-300">{question?.question?.substring(0, 100) || res.question?.substring(0, 100)}...</p>
                    {!res.isCorrect && res.correctAnswerText && (
                      <p className="text-xs text-slate-500 mt-1">
                        Correct: {res.correctAnswerText}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleRetry}
          className="w-full py-2 rounded-lg bg-white/[0.06] border border-white/[0.08]
                     text-slate-300 text-sm hover:bg-white/[0.1] transition-all"
        >
          Check Tomorrow's Challenge →
        </button>
      </div>
    );
  }

  // Show active challenge
  if (challenge.hasCompleted) {
    return (
      <div className="glass-card p-5 text-center">
        <div className="w-12 h-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-3">
          <CheckCircle className="w-6 h-6 text-green-400" />
        </div>
        <p className="text-white font-display font-semibold mb-1">Challenge Completed!</p>
        <p className="text-slate-400 text-sm">Come back tomorrow for a new challenge</p>
        <button
          onClick={handleRetry}
          className="mt-3 text-xs text-electric-400 hover:text-electric-300"
        >
          Refresh →
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-white flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          Daily Challenge
        </h3>
        <span className="text-xs text-slate-500">
          {challenge.challengeDate || challenge.challengeId?.split('-')[1]}
        </span>
      </div>

      <p className="text-slate-400 text-sm mb-4">
        Answer all questions to earn points and maintain your streak!
      </p>

      <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
        {challenge.questions?.map((q, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05]">
            <p className="text-sm text-white mb-2">
              {idx + 1}. {q.question}
            </p>
            <div className="space-y-1.5">
              {q.options.map((option, optIdx) => (
                <label
                  key={optIdx}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all
                    ${answers[idx] === optIdx 
                      ? 'bg-electric-500/20 border border-electric-500/30' 
                      : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]'
                    }`}
                >
                  <input
                    type="radio"
                    name={`q${idx}`}
                    value={optIdx}
                    checked={answers[idx] === optIdx}
                    onChange={() => handleAnswerSelect(idx, optIdx)}
                    disabled={submitting}
                    className="w-3 h-3 text-electric-500"
                  />
                  <span className="text-sm text-slate-300">{option}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-2.5 rounded-lg bg-gradient-to-r from-electric-500 to-purple-500
                   text-white font-medium text-sm hover:opacity-90 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? 'Submitting...' : 'Submit Challenge'}
      </button>
      
      <p className="text-xs text-slate-500 text-center mt-3">
        Complete daily challenges to earn points and bonuses! 🎯
      </p>
    </div>
  );
}
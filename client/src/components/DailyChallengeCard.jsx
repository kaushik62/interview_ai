// client/src/components/DailyChallengeCard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Calendar, Award, CheckCircle, ArrowRight, Loader } from 'lucide-react';

const DailyChallengeCard = () => {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchDailyChallenge();
  }, [retryCount]);

  const fetchDailyChallenge = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await api.get('/points/daily-challenge');
      setChallenge(res.data);
      setHasCompleted(res.data.hasCompleted || false);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      setError(error.response?.data?.error || 'Failed to load challenge');
      
      // Auto retry after 2 seconds if failed
      if (retryCount < 2) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = () => {
    navigate('/daily-challenge');
  };

  if (loading) {
    return (
      <div className="glass-card p-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <Loader className="w-5 h-5 text-purple-400 animate-spin" />
          <p className="text-slate-400 text-sm">Loading challenge...</p>
        </div>
      </div>
    );
  }

  if (error && retryCount >= 2) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-red-400 text-sm">Unable to load challenge</p>
        <button 
          onClick={() => setRetryCount(0)}
          className="mt-2 text-xs text-purple-400 hover:text-purple-300"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (hasCompleted) {
    return (
      <div className="glass-card p-6 text-center border-green-500/20">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <h3 className="text-white font-bold mb-1">Daily Challenge Complete! ✅</h3>
        <p className="text-slate-400 text-sm">Come back tomorrow for a new challenge</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-400" />
          <span className="text-purple-400 text-xs font-medium">Daily Challenge</span>
        </div>
        <Award className="w-5 h-5 text-yellow-400" />
      </div>
      
      <h3 className="text-white font-bold text-lg mb-2">Today's Challenge</h3>
      <p className="text-slate-300 text-sm mb-3">
        Complete {challenge?.totalQuestions || 5} questions to earn 25 points!
      </p>
      
      <button
        onClick={startChallenge}
        className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
      >
        Start Challenge <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default DailyChallengeCard;
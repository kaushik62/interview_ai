// client/src/components/DailyChallengeCard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Calendar, Award, CheckCircle, ArrowRight } from 'lucide-react';

const DailyChallengeCard = () => {
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDailyChallenge();
  }, []);

  const fetchDailyChallenge = async () => {
    try {
      const res = await api.get('/points/daily-challenge');
      setChallenge(res.data);
      setHasCompleted(res.data.hasCompleted || false);
    } catch (error) {
      console.error('Error fetching challenge:', error);
      setChallenge(null);
    } finally {
      setLoading(false);
    }
  };

  const startChallenge = () => {
    navigate('/daily-challenge');
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-white/[0.06] rounded w-3/4"></div>
          <div className="h-8 bg-white/[0.06] rounded w-1/2"></div>
        </div>
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
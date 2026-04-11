import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MCQInterview = () => {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuth();
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    jobRole: 'Frontend Engineer',
    topic: 'JavaScript, React',
    questionCount: 5
  });

  // Start MCQ Quiz
  const startQuiz = async () => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/mcq/session', {
        jobRole: formData.jobRole,
        topic: formData.topic,
        questionCount: formData.questionCount
      });
      
      setSessionId(response.data.sessionId);
      setQuestions(response.data.questions);
    } catch (err) {
      console.error('Error starting quiz:', err);
      alert(err.response?.data?.error || 'Failed to start quiz');
    } finally {
      setLoading(false);
    }
  };

  // Submit answer
  const submitAnswer = async (selectedIndex) => {
    const newAnswers = [...answers, selectedIndex];
    setAnswers(newAnswers);

    if (currentQ + 1 >= questions.length) {
      // Quiz finished - submit all answers
      setLoading(true);
      try {
        const response = await api.post(`/mcq/submit/${sessionId}`, { 
          answers: newAnswers 
        });
        setResult(response.data);
      } catch (err) {
        console.error('Error submitting answers:', err);
        alert(err.response?.data?.error || 'Failed to submit answers');
      } finally {
        setLoading(false);
      }
    } else {
      setCurrentQ(currentQ + 1);
    }
  };

  // Reset quiz and start over
  const resetQuiz = () => {
    setSessionId(null);
    setQuestions([]);
    setCurrentQ(0);
    setAnswers([]);
    setResult(null);
    setFormData({
      jobRole: 'Frontend Engineer',
      topic: 'JavaScript, React',
      questionCount: 5
    });
  };

  // Show result page
  if (result) {
    return (
      <div className="min-h-screen bg-ink-950 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-gradient-to-r from-electric-500/20 to-purple-500/20 rounded-xl p-8 text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">Quiz Results</h2>
            <div className="text-6xl font-bold text-white mb-2">{result.score}%</div>
            <p className="text-slate-300">
              Correct: {result.correctCount} / {result.totalQuestions}
            </p>
            <p className="text-electric-400 mt-2">{result.message}</p>
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Detailed Review</h3>
            {result.results?.map((r, idx) => (
              <div key={idx} className="bg-ink-900 rounded-xl border border-ink-800 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-electric-400 font-medium">Q{idx + 1}</span>
                  <span className={r.isCorrect ? 'text-green-400' : 'text-red-400'}>
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

          <div className="flex gap-4 mt-8">
            <button
              onClick={resetQuiz}
              className="flex-1 py-3 bg-electric-500 hover:bg-electric-600 text-white font-semibold rounded-lg transition-colors"
            >
              Take Another Quiz
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex-1 py-3 bg-ink-800 hover:bg-ink-700 text-white font-semibold rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show questions
  if (questions.length > 0) {
    const q = questions[currentQ];
    return (
      <div className="min-h-screen bg-ink-950 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm text-slate-400 mb-2">
              <span>Question {currentQ + 1} of {questions.length}</span>
              <span>{Math.round(((currentQ + 1) / questions.length) * 100)}% Complete</span>
            </div>
            <div className="h-2 bg-ink-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-electric-500 transition-all duration-300"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-ink-900 rounded-xl border border-ink-800 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-2 py-1 bg-electric-500/10 text-electric-400 text-xs rounded-full">
                Multiple Choice
              </span>
            </div>
            
            <h2 className="text-xl font-bold text-white mb-6">
              {q.question}
            </h2>
            
            <div className="space-y-3">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => submitAnswer(idx)}
                  disabled={loading}
                  className="w-full text-left p-4 bg-ink-800 hover:bg-ink-700 rounded-lg border border-ink-700 hover:border-electric-500 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="font-mono text-electric-400 font-bold mr-3">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="text-slate-200">{opt}</span>
                </button>
              ))}
            </div>
          </div>

          {loading && (
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
  }

  // Start screen with form
  return (
    <div className="min-h-screen bg-ink-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">MCQ Quiz</h1>
        <p className="text-slate-400 text-center mb-8">Test your knowledge with multiple choice questions</p>

        <div className="bg-ink-900 rounded-xl border border-ink-800 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-slate-300 mb-2">Job Role</label>
              <input
                type="text"
                value={formData.jobRole}
                onChange={(e) => setFormData({...formData, jobRole: e.target.value})}
                className="w-full px-4 py-2 bg-ink-800 border border-ink-700 rounded-lg text-white focus:outline-none focus:border-electric-500"
                placeholder="e.g., Frontend Engineer"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2">Topics</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormData({...formData, topic: e.target.value})}
                className="w-full px-4 py-2 bg-ink-800 border border-ink-700 rounded-lg text-white focus:outline-none focus:border-electric-500"
                placeholder="e.g., JavaScript, React, CSS"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-2">Number of Questions</label>
              <select
                value={formData.questionCount}
                onChange={(e) => setFormData({...formData, questionCount: parseInt(e.target.value)})}
                className="w-full px-4 py-2 bg-ink-800 border border-ink-700 rounded-lg text-white focus:outline-none focus:border-electric-500"
              >
                <option value={3}>3 Questions</option>
                <option value={5}>5 Questions</option>
                <option value={10}>10 Questions</option>
              </select>
            </div>

            <button
              onClick={startQuiz}
              disabled={loading || !formData.jobRole}
              className="w-full py-3 bg-electric-500 hover:bg-electric-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? 'Loading...' : 'Start Quiz'}
            </button>
          </div>
        </div>

        {/* Quick Examples */}
        <div className="mt-6 p-4 bg-ink-900/50 rounded-xl border border-ink-800">
          <p className="text-slate-400 text-sm mb-2">Quick Examples:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFormData({...formData, jobRole: 'Frontend Engineer', topic: 'React, JavaScript, HTML, CSS'})}
              className="px-3 py-1 text-xs bg-ink-800 text-slate-300 rounded-full hover:bg-electric-500/20 hover:text-electric-400 transition-colors"
            >
              Frontend
            </button>
            <button
              onClick={() => setFormData({...formData, jobRole: 'Backend Engineer', topic: 'Node.js, Python, SQL, APIs'})}
              className="px-3 py-1 text-xs bg-ink-800 text-slate-300 rounded-full hover:bg-electric-500/20 hover:text-electric-400 transition-colors"
            >
              Backend
            </button>
            <button
              onClick={() => setFormData({...formData, jobRole: 'Data Scientist', topic: 'Python, Pandas, SQL, Statistics'})}
              className="px-3 py-1 text-xs bg-ink-800 text-slate-300 rounded-full hover:bg-electric-500/20 hover:text-electric-400 transition-colors"
            >
              Data Science
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCQInterview;
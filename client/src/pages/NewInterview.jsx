// client/src/pages/NewInterview.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const NewInterview = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    jobRole: '',
    topic: '',
    questionCount: 5
  });

  // Predefined Job Roles
  const jobRoles = [
    { title: 'Frontend Developer', icon: '🎨', role: 'Frontend Developer', topic: 'React, JavaScript, HTML, CSS, Tailwind', color: 'from-cyan-500/20 to-blue-500/20', borderColor: 'border-cyan-500/30', textColor: 'text-cyan-400' },
    { title: 'Backend Developer', icon: '⚙️', role: 'Backend Developer', topic: 'Node.js, Python, Java, SQL, APIs', color: 'from-green-500/20 to-emerald-500/20', borderColor: 'border-green-500/30', textColor: 'text-green-400' },
    { title: 'Full Stack Developer', icon: '🚀', role: 'Full Stack Developer', topic: 'React, Node.js, MongoDB, Express, SQL', color: 'from-purple-500/20 to-pink-500/20', borderColor: 'border-purple-500/30', textColor: 'text-purple-400' },
    { title: 'Database Engineer', icon: '🗄️', role: 'Database Engineer', topic: 'SQL, NoSQL, PostgreSQL, MongoDB, Redis', color: 'from-orange-500/20 to-amber-500/20', borderColor: 'border-orange-500/30', textColor: 'text-orange-400' },
    { title: 'DevOps Engineer', icon: '🔧', role: 'DevOps Engineer', topic: 'Docker, Kubernetes, AWS, CI/CD, Linux', color: 'from-red-500/20 to-rose-500/20', borderColor: 'border-red-500/30', textColor: 'text-red-400' },
    { title: 'Machine Learning Engineer', icon: '🤖', role: 'Machine Learning Engineer', topic: 'Python, TensorFlow, PyTorch, Scikit-learn, Pandas', color: 'from-indigo-500/20 to-purple-500/20', borderColor: 'border-indigo-500/30', textColor: 'text-indigo-400' },
    { title: 'Data Scientist', icon: '📊', role: 'Data Scientist', topic: 'Python, SQL, Statistics, Pandas, NumPy, Matplotlib', color: 'from-blue-500/20 to-cyan-500/20', borderColor: 'border-blue-500/30', textColor: 'text-blue-400' },
    { title: 'Data Analyst', icon: '📈', role: 'Data Analyst', topic: 'SQL, Excel, Tableau, Python, Power BI', color: 'from-teal-500/20 to-green-500/20', borderColor: 'border-teal-500/30', textColor: 'text-teal-400' },
    { title: 'Mobile Developer', icon: '📱', role: 'Mobile Developer', topic: 'React Native, Flutter, Swift, Kotlin', color: 'from-yellow-500/20 to-orange-500/20', borderColor: 'border-yellow-500/30', textColor: 'text-yellow-400' },
    { title: 'Cloud Engineer', icon: '☁️', role: 'Cloud Engineer', topic: 'AWS, Azure, GCP, Terraform, Docker', color: 'from-sky-500/20 to-blue-500/20', borderColor: 'border-sky-500/30', textColor: 'text-sky-400' },
    { title: 'Security Engineer', icon: '🔒', role: 'Security Engineer', topic: 'Cybersecurity, Network Security, Penetration Testing', color: 'from-red-500/20 to-pink-500/20', borderColor: 'border-red-500/30', textColor: 'text-red-400' },
    { title: 'QA Engineer', icon: '✅', role: 'QA Engineer', topic: 'Testing, Selenium, Jest, Cypress, Automation', color: 'from-lime-500/20 to-green-500/20', borderColor: 'border-lime-500/30', textColor: 'text-lime-400' },
  ];

  // Predefined Topics with better colors
  const topics = [
    { name: 'JavaScript', icon: '🟡', color: 'from-yellow-500/20 to-amber-500/20', borderColor: 'border-yellow-500/30', textColor: 'text-yellow-400' },
    { name: 'React', icon: '⚛️', color: 'from-blue-500/20 to-cyan-500/20', borderColor: 'border-blue-500/30', textColor: 'text-blue-400' },
    { name: 'Python', icon: '🐍', color: 'from-green-500/20 to-emerald-500/20', borderColor: 'border-green-500/30', textColor: 'text-green-400' },
    { name: 'Node.js', icon: '🟢', color: 'from-green-500/20 to-lime-500/20', borderColor: 'border-green-500/30', textColor: 'text-green-400' },
    { name: 'SQL', icon: '🗄️', color: 'from-orange-500/20 to-amber-500/20', borderColor: 'border-orange-500/30', textColor: 'text-orange-400' },
    { name: 'MongoDB', icon: '🍃', color: 'from-green-500/20 to-teal-500/20', borderColor: 'border-green-500/30', textColor: 'text-green-400' },
    { name: 'AWS', icon: '☁️', color: 'from-yellow-500/20 to-orange-500/20', borderColor: 'border-yellow-500/30', textColor: 'text-yellow-400' },
    { name: 'Docker', icon: '🐳', color: 'from-blue-500/20 to-cyan-500/20', borderColor: 'border-blue-500/30', textColor: 'text-blue-400' },
    { name: 'Kubernetes', icon: '⎈', color: 'from-blue-500/20 to-indigo-500/20', borderColor: 'border-blue-500/30', textColor: 'text-blue-400' },
    { name: 'TypeScript', icon: '📘', color: 'from-blue-500/20 to-sky-500/20', borderColor: 'border-blue-500/30', textColor: 'text-blue-400' },
    { name: 'HTML/CSS', icon: '🎨', color: 'from-red-500/20 to-orange-500/20', borderColor: 'border-red-500/30', textColor: 'text-red-400' },
    { name: 'Git', icon: '📚', color: 'from-orange-500/20 to-red-500/20', borderColor: 'border-orange-500/30', textColor: 'text-orange-400' },
    { name: 'REST APIs', icon: '🔗', color: 'from-purple-500/20 to-pink-500/20', borderColor: 'border-purple-500/30', textColor: 'text-purple-400' },
    { name: 'GraphQL', icon: '📡', color: 'from-pink-500/20 to-rose-500/20', borderColor: 'border-pink-500/30', textColor: 'text-pink-400' },
    { name: 'Data Structures', icon: '🏗️', color: 'from-indigo-500/20 to-purple-500/20', borderColor: 'border-indigo-500/30', textColor: 'text-indigo-400' },
    { name: 'Algorithms', icon: '⚡', color: 'from-indigo-500/20 to-blue-500/20', borderColor: 'border-indigo-500/30', textColor: 'text-indigo-400' },
    { name: 'System Design', icon: '🏛️', color: 'from-purple-500/20 to-fuchsia-500/20', borderColor: 'border-purple-500/30', textColor: 'text-purple-400' },
    { name: 'Machine Learning', icon: '🤖', color: 'from-cyan-500/20 to-blue-500/20', borderColor: 'border-cyan-500/30', textColor: 'text-cyan-400' },
  ];

  const handleRoleSelect = (role, topic) => {
    setFormData({
      ...formData,
      jobRole: role,
      topic: topic
    });
  };

  const handleTopicAdd = (topicName) => {
    const currentTopics = formData.topic ? formData.topic.split(', ').map(t => t.trim()) : [];
    if (!currentTopics.includes(topicName)) {
      const newTopics = [...currentTopics, topicName];
      setFormData({
        ...formData,
        topic: newTopics.join(', ')
      });
    }
  };

  const handleTopicRemove = (topicToRemove) => {
    const currentTopics = formData.topic ? formData.topic.split(', ').map(t => t.trim()) : [];
    const newTopics = currentTopics.filter(t => t !== topicToRemove);
    setFormData({
      ...formData,
      topic: newTopics.join(', ')
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.jobRole) {
      toast.error('Please select a job role');
      return;
    }

    setLoading(true);
    
    try {
      // First generate questions
      toast.loading('Generating questions...', { id: 'generate' });
      
      const generateResponse = await api.post('/mcq/generate', {
        jobRole: formData.jobRole,
        topic: formData.topic,
        count: formData.questionCount
      });
      
      const generatedQuestions = generateResponse.data.questions;
      toast.success(`Generated ${generatedQuestions.length} questions!`, { id: 'generate' });
      
      // Then create session
      toast.loading('Creating quiz session...', { id: 'session' });
      
      const sessionResponse = await api.post('/mcq/sessions', {
        jobRole: formData.jobRole,
        topic: formData.topic || 'general',
        questions: generatedQuestions
      });
      
      toast.success('Quiz created! Redirecting...', { id: 'session' });
      
      // Navigate to quiz page
      navigate(`/interview/${sessionResponse.data.sessionId}`);
      
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error(error.response?.data?.error || 'Failed to create quiz', { id: 'generate' });
      toast.dismiss('session');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a2e] to-[#16213e] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Start New MCQ Quiz</h1>
        <p className="text-slate-400 mb-8">Choose a role and topics to test your knowledge</p>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Job Role Selection */}
          <div className="glass-card p-6 rounded-xl">
            <label className="block text-slate-300 mb-3 font-medium">Select Job Role</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {jobRoles.map((job) => (
                <button
                  key={job.role}
                  type="button"
                  onClick={() => handleRoleSelect(job.role, job.topic)}
                  className={`p-3 rounded-xl border-2 transition-all text-left bg-gradient-to-br ${job.color} ${
                    formData.jobRole === job.role
                      ? `${job.borderColor} shadow-lg scale-105`
                      : 'border-white/[0.08] hover:scale-102'
                  }`}
                >
                  <div className="text-2xl mb-1">{job.icon}</div>
                  <div className={`text-sm font-medium ${formData.jobRole === job.role ? job.textColor : 'text-white'}`}>
                    {job.title}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Job Role Input */}
          <div className="glass-card p-6 rounded-xl">
            <label className="block text-slate-300 mb-2">Or Enter Custom Job Role</label>
            <input
              type="text"
              value={formData.jobRole}
              onChange={(e) => setFormData({...formData, jobRole: e.target.value})}
              placeholder="e.g., Full Stack Developer, DevOps Engineer"
              className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Topics Selection */}
          <div className="glass-card p-6 rounded-xl">
            <label className="block text-slate-300 mb-3 font-medium">Select Topics</label>
            <div className="flex flex-wrap gap-2 mb-4 max-h-40 overflow-y-auto">
              {topics.map((topic) => (
                <button
                  key={topic.name}
                  type="button"
                  onClick={() => handleTopicAdd(topic.name)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all bg-gradient-to-br ${topic.color} ${topic.borderColor} ${topic.textColor} hover:scale-105`}
                >
                  <span className="mr-1">{topic.icon}</span>
                  {topic.name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Topics Display */}
          {formData.topic && (
            <div className="glass-card p-6 rounded-xl">
              <label className="block text-slate-300 mb-2">Selected Topics</label>
              <div className="flex flex-wrap gap-2 p-3 bg-white/[0.04] rounded-lg border border-white/[0.08]">
                {formData.topic.split(', ').map((topic) => (
                  <span
                    key={topic}
                    className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm flex items-center gap-1"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => handleTopicRemove(topic)}
                      className="ml-1 hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Custom Topic Input */}
          <div className="glass-card p-6 rounded-xl">
            <label className="block text-slate-300 mb-2">Or Add Custom Topic</label>
            <input
              type="text"
              placeholder="e.g., Microservices, Redis, Kafka"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.target.value.trim()) {
                    handleTopicAdd(e.target.value.trim());
                    e.target.value = '';
                  }
                }
              }}
              className="w-full px-4 py-3 bg-white/[0.06] border border-white/[0.08] rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <p className="text-xs text-slate-500 mt-1">Press Enter to add topic</p>
          </div>

          {/* Question Count */}
          <div className="glass-card p-6 rounded-xl">
            <label className="block text-slate-300 mb-2">Number of Questions</label>
            <select
              value={formData.questionCount}
              onChange={(e) => setFormData({...formData, questionCount: parseInt(e.target.value)})}
              className="w-full px-4 py-3 bg-white border border-white/[0.08] rounded-lg text-black focus:outline-none focus:border-cyan-500"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
              <option value={20}>20 Questions</option>
            </select>
          </div>

          {/* Start Quiz Button - Changed from Generate Questions */}
          <button
            type="submit"
            disabled={loading || !formData.jobRole}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 hover:scale-102"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Quiz...
              </div>
            ) : (
              '🎯 Start Quiz'
            )}
          </button>
        </form>

        {/* Quick Start Examples */}
        <div className="mt-8 p-4 bg-white/[0.03] rounded-xl border border-white/[0.08]">
          <p className="text-slate-400 text-sm mb-3">💡 Quick Examples:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRoleSelect('Frontend Developer', 'React, JavaScript, HTML, CSS')}
              className="px-3 py-1 text-xs bg-white/[0.06] text-slate-300 rounded-full hover:bg-cyan-500/20 hover:text-cyan-400 transition-all"
            >
              Frontend Quiz
            </button>
            <button
              onClick={() => handleRoleSelect('Backend Developer', 'Node.js, Python, SQL, APIs')}
              className="px-3 py-1 text-xs bg-white/[0.06] text-slate-300 rounded-full hover:bg-cyan-500/20 hover:text-cyan-400 transition-all"
            >
              Backend Quiz
            </button>
            <button
              onClick={() => handleRoleSelect('Data Scientist', 'Python, Pandas, SQL, Statistics')}
              className="px-3 py-1 text-xs bg-white/[0.06] text-slate-300 rounded-full hover:bg-cyan-500/20 hover:text-cyan-400 transition-all"
            >
              Data Science Quiz
            </button>
            <button
              onClick={() => handleRoleSelect('DevOps Engineer', 'Docker, Kubernetes, AWS, CI/CD')}
              className="px-3 py-1 text-xs bg-white/[0.06] text-slate-300 rounded-full hover:bg-cyan-500/20 hover:text-cyan-400 transition-all"
            >
              DevOps Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewInterview;
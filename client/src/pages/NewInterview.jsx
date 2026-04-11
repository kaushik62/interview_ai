// client/src/pages/NewInterview.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

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
    { title: 'Frontend Developer', icon: '🎨', role: 'Frontend Developer', topic: 'React, JavaScript, HTML, CSS, Tailwind' },
    { title: 'Backend Developer', icon: '⚙️', role: 'Backend Developer', topic: 'Node.js, Python, Java, SQL, APIs' },
    { title: 'Full Stack Developer', icon: '🚀', role: 'Full Stack Developer', topic: 'React, Node.js, MongoDB, Express, SQL' },
    { title: 'Database Engineer', icon: '🗄️', role: 'Database Engineer', topic: 'SQL, NoSQL, PostgreSQL, MongoDB, Redis' },
    { title: 'DevOps Engineer', icon: '🔧', role: 'DevOps Engineer', topic: 'Docker, Kubernetes, AWS, CI/CD, Linux' },
    { title: 'Machine Learning Engineer', icon: '🤖', role: 'Machine Learning Engineer', topic: 'Python, TensorFlow, PyTorch, Scikit-learn, Pandas' },
    { title: 'Data Scientist', icon: '📊', role: 'Data Scientist', topic: 'Python, SQL, Statistics, Pandas, NumPy, Matplotlib' },
    { title: 'Data Analyst', icon: '📈', role: 'Data Analyst', topic: 'SQL, Excel, Tableau, Python, Power BI' },
    { title: 'Mobile Developer', icon: '📱', role: 'Mobile Developer', topic: 'React Native, Flutter, Swift, Kotlin' },
    { title: 'Cloud Engineer', icon: '☁️', role: 'Cloud Engineer', topic: 'AWS, Azure, GCP, Terraform, Docker' },
    { title: 'Security Engineer', icon: '🔒', role: 'Security Engineer', topic: 'Cybersecurity, Network Security, Penetration Testing' },
    { title: 'QA Engineer', icon: '✅', role: 'QA Engineer', topic: 'Testing, Selenium, Jest, Cypress, Automation' },
  ];

  // Predefined Topics
  const topics = [
    { name: 'JavaScript', icon: '🟡', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
    { name: 'React', icon: '⚛️', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    { name: 'Python', icon: '🐍', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
    { name: 'Node.js', icon: '🟢', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
    { name: 'SQL', icon: '🗄️', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
    { name: 'MongoDB', icon: '🍃', color: 'bg-green-500/10 border-green-500/20 text-green-400' },
    { name: 'AWS', icon: '☁️', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
    { name: 'Docker', icon: '🐳', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    { name: 'Kubernetes', icon: '⎈', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    { name: 'TypeScript', icon: '📘', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    { name: 'HTML/CSS', icon: '🎨', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
    { name: 'Git', icon: '📚', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
    { name: 'REST APIs', icon: '🔗', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
    { name: 'GraphQL', icon: '📡', color: 'bg-pink-500/10 border-pink-500/20 text-pink-400' },
    { name: 'Data Structures', icon: '🏗️', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
    { name: 'Algorithms', icon: '⚡', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
    { name: 'System Design', icon: '🏛️', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
    { name: 'Machine Learning', icon: '🤖', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
    { name: 'Deep Learning', icon: '🧠', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
    { name: 'NLP', icon: '💬', color: 'bg-teal-500/10 border-teal-500/20 text-teal-400' },
    { name: 'Computer Vision', icon: '👁️', color: 'bg-teal-500/10 border-teal-500/20 text-teal-400' },
    { name: 'Pandas', icon: '🐼', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    { name: 'TensorFlow', icon: '🔷', color: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
    { name: 'PyTorch', icon: '🔥', color: 'bg-red-500/10 border-red-500/20 text-red-400' },
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
    setLoading(true);
    
    try {
      const response = await api.post('/mcq/session', {
        jobRole: formData.jobRole,
        topic: formData.topic || 'General Knowledge',
        questionCount: formData.questionCount
      });
      
      console.log('Session created:', response.data);
      navigate(`/interview/${response.data.sessionId}`);
      
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert(error.response?.data?.error || 'Failed to create quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated()) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-ink-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Start New MCQ Quiz</h1>
        <p className="text-slate-400 mb-8">Choose a role and topics to test your knowledge</p>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Job Role Selection */}
          <div>
            <label className="block text-slate-300 mb-3 font-medium">Select Job Role</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {jobRoles.map((job) => (
                <button
                  key={job.role}
                  type="button"
                  onClick={() => handleRoleSelect(job.role, job.topic)}
                  className={`p-3 rounded-xl border-2 transition-all text-left ${
                    formData.jobRole === job.role
                      ? 'border-electric-500 bg-electric-500/10'
                      : 'border-ink-700 bg-ink-900 hover:border-ink-600'
                  }`}
                >
                  <div className="text-2xl mb-1">{job.icon}</div>
                  <div className="text-white text-sm font-medium">{job.title}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Job Role Input */}
          <div>
            <label className="block text-slate-300 mb-2">Or Enter Custom Job Role</label>
            <input
              type="text"
              value={formData.jobRole}
              onChange={(e) => setFormData({...formData, jobRole: e.target.value})}
              placeholder="e.g., Full Stack Developer, DevOps Engineer"
              className="w-full px-4 py-3 bg-ink-900 border border-ink-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-electric-500"
            />
          </div>

          {/* Topics Selection */}
          <div>
            <label className="block text-slate-300 mb-3 font-medium">Select Topics</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {topics.map((topic) => (
                <button
                  key={topic.name}
                  type="button"
                  onClick={() => handleTopicAdd(topic.name)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-all ${topic.color}`}
                >
                  <span className="mr-1">{topic.icon}</span>
                  {topic.name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Topics Display */}
          {formData.topic && (
            <div>
              <label className="block text-slate-300 mb-2">Selected Topics</label>
              <div className="flex flex-wrap gap-2 p-3 bg-ink-900 rounded-lg border border-ink-700">
                {formData.topic.split(', ').map((topic) => (
                  <span
                    key={topic}
                    className="px-2 py-1 bg-electric-500/20 text-electric-400 rounded-lg text-sm flex items-center gap-1"
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
          <div>
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
              className="w-full px-4 py-3 bg-ink-900 border border-ink-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-electric-500"
            />
            <p className="text-xs text-slate-500 mt-1">Press Enter to add topic</p>
          </div>

          {/* Question Count */}
          <div>
            <label className="block text-slate-300 mb-2">Number of Questions</label>
            <select
              value={formData.questionCount}
              onChange={(e) => setFormData({...formData, questionCount: parseInt(e.target.value)})}
              className="w-full px-4 py-3 bg-ink-900 border border-ink-700 rounded-lg text-white focus:outline-none focus:border-electric-500"
            >
              <option value={3}>3 Questions</option>
              <option value={5}>5 Questions</option>
              <option value={10}>10 Questions</option>
              <option value={15}>15 Questions</option>
            </select>
          </div>

          {/* Start Button */}
          <button
            type="submit"
            disabled={loading || !formData.jobRole}
            className="w-full py-3 bg-electric-500 hover:bg-electric-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Quiz...' : '🎯 Start Quiz'}
          </button>
        </form>

        {/* Quick Start Examples */}
        <div className="mt-8 p-4 bg-ink-900/50 rounded-xl border border-ink-800">
          <p className="text-slate-400 text-sm mb-3">💡 Quick Examples:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleRoleSelect('Frontend Developer', 'React, JavaScript, HTML, CSS')}
              className="px-3 py-1 text-xs bg-ink-800 text-slate-300 rounded-full hover:bg-electric-500/20 hover:text-electric-400 transition-colors"
            >
              Frontend Quiz
            </button>
            <button
              onClick={() => handleRoleSelect('Backend Developer', 'Node.js, Python, SQL, APIs')}
              className="px-3 py-1 text-xs bg-ink-800 text-slate-300 rounded-full hover:bg-electric-500/20 hover:text-electric-400 transition-colors"
            >
              Backend Quiz
            </button>
            <button
              onClick={() => handleRoleSelect('Data Scientist', 'Python, Pandas, SQL, Statistics')}
              className="px-3 py-1 text-xs bg-ink-800 text-slate-300 rounded-full hover:bg-electric-500/20 hover:text-electric-400 transition-colors"
            >
              Data Science Quiz
            </button>
            <button
              onClick={() => handleRoleSelect('DevOps Engineer', 'Docker, Kubernetes, AWS, CI/CD')}
              className="px-3 py-1 text-xs bg-ink-800 text-slate-300 rounded-full hover:bg-electric-500/20 hover:text-electric-400 transition-colors"
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
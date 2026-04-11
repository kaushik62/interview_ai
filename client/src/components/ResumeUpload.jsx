// client/src/components/ResumeUpload.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Upload, FileText, CheckCircle, XCircle, Loader } from 'lucide-react';

const ResumeUpload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload PDF, DOCX, or TXT file');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await api.post('/resume/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setAnalysis(response.data.analysis);
      setQuestions(response.data.questions);
      console.log('Resume analyzed:', response.data);
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.response?.data?.error || 'Failed to upload resume');
    } finally {
      setUploading(false);
    }
  };

  const startQuiz = async () => {
    try {
      const response = await api.post('/resume/generate-quiz', { questionCount: 10 });
      navigate(`/interview/${response.data.sessionId}`);
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError(err.response?.data?.error || 'Failed to start quiz');
    }
  };

  return (
    <div className="min-h-screen bg-ink-950 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Upload Your Resume</h1>
        <p className="text-slate-400 mb-8">
          We'll analyze your resume and generate personalized MCQs based on your skills and experience
        </p>

        {/* Upload Section */}
        <div className="glass-card p-8 mb-8">
          <div className="border-2 border-dashed border-ink-700 rounded-xl p-8 text-center">
            <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-300 mb-2">Upload your resume (PDF, DOCX, or TXT)</p>
            <p className="text-slate-500 text-sm mb-4">Max file size: 5MB</p>
            
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="resume-upload"
            />
            <label
              htmlFor="resume-upload"
              className="inline-flex items-center gap-2 px-6 py-3 bg-electric-500 hover:bg-electric-600 text-white rounded-lg cursor-pointer transition-colors"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </label>
            
            {file && (
              <p className="text-green-400 text-sm mt-3">
                Selected: {file.name}
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full mt-4 py-3 bg-electric-500 hover:bg-electric-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Analyzing Resume...</>
            ) : (
              'Upload & Analyze'
            )}
          </button>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Resume Analysis</h2>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-electric-400 font-semibold mb-2">Primary Role</h3>
                  <p className="text-white">{analysis.primary_role}</p>
                </div>
                
                <div>
                  <h3 className="text-electric-400 font-semibold mb-2">Experience Level</h3>
                  <p className="text-white capitalize">{analysis.experience_level}</p>
                </div>
                
                <div>
                  <h3 className="text-electric-400 font-semibold mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.skills?.map((skill, i) => (
                      <span key={i} className="px-2 py-1 bg-electric-500/20 text-electric-400 rounded-lg text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-electric-400 font-semibold mb-2">Technologies</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.technologies?.map((tech, i) => (
                      <span key={i} className="px-2 py-1 bg-ink-800 text-slate-300 rounded-lg text-sm">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                
                {analysis.projects?.length > 0 && (
                  <div>
                    <h3 className="text-electric-400 font-semibold mb-2">Projects</h3>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      {analysis.projects.slice(0, 5).map((project, i) => (
                        <li key={i}>{project}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Sample Questions Preview */}
            {questions && questions.length > 0 && (
              <div className="glass-card p-6">
                <h2 className="text-xl font-bold text-white mb-4">Sample Questions</h2>
                <div className="space-y-4">
                  {questions.slice(0, 3).map((q, i) => (
                    <div key={i} className="bg-ink-900 rounded-lg p-4">
                      <p className="text-white font-medium mb-2">{q.question}</p>
                      <div className="space-y-1">
                        {q.options.map((opt, idx) => (
                          <p key={idx} className="text-slate-400 text-sm">
                            {String.fromCharCode(65 + idx)}. {opt}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={startQuiz}
                  className="w-full mt-6 py-3 bg-electric-500 hover:bg-electric-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Start Personalized Quiz ({questions.length} Questions)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeUpload;
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, RefreshCw } from 'lucide-react';
import { useResume } from '../../hooks/useResume';
import { getATSScore } from '../../services/aiService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ScoreGauge from '../../components/common/ScoreGauge';
import ProgressBar from '../../components/common/ProgressBar';

export default function ATSOptimizerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resumes } = useResume();
  const resume = resumes.find(r => r.id === id);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  if (!resume) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-gray-500 mb-4">Select a resume to scan.</p>
        <Button onClick={() => navigate('/app/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const scan = async () => {
    setLoading(true);
    try {
      const data = await getATSScore(resume);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const colorForScore = (s) => s >= 70 ? 'green' : s >= 50 ? 'yellow' : 'red';

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ATS Optimizer</h1>
          <p className="text-gray-500">Scan your resume for ATS compatibility issues.</p>
        </div>
        <Button onClick={scan} loading={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />Run ATS Scan
        </Button>
      </div>

      {!result && !loading && (
        <Card>
          <div className="text-center py-16 text-gray-400">
            <Shield className="h-16 w-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Click "Run ATS Scan" to check compatibility</p>
            <p className="text-sm mt-1">We'll analyze formatting, keywords, and structure.</p>
          </div>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <div className="flex items-center justify-center gap-8">
              <ScoreGauge score={result.overall} size="lg" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Overall ATS Score</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {result.overall >= 80 ? 'Excellent! Your resume is well-optimized.' :
                   result.overall >= 60 ? 'Good, but there\'s room for improvement.' :
                   'Needs work. Follow the suggestions below.'}
                </p>
              </div>
            </div>
          </Card>

          {/* Category Breakdown */}
          <Card title="Score Breakdown">
            <div className="space-y-4">
              {result.categories?.map((cat, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{cat.name}</span>
                    <span className="text-gray-500">{cat.score}%</span>
                  </div>
                  <ProgressBar value={cat.score} max={100} color={colorForScore(cat.score)} />
                </div>
              ))}
            </div>
          </Card>

          {/* Missing Keywords */}
          {result.missingKeywords?.length > 0 && (
            <Card title="Missing Keywords">
              <p className="text-sm text-gray-500 mb-3">Consider adding these keywords to improve your match rate.</p>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.map((k, i) => (
                  <span key={i} className="bg-yellow-50 text-yellow-800 text-xs px-2.5 py-1 rounded-full border border-yellow-200">{k}</span>
                ))}
              </div>
            </Card>
          )}

          {/* Formatting Issues */}
          {result.formattingIssues?.length > 0 && (
            <Card title="Formatting Issues">
              <ul className="space-y-2">
                {result.formattingIssues.map((issue, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <span className="inline-block w-2 h-2 bg-red-400 rounded-full mt-1.5 mr-2 shrink-0" />
                    <span className="text-gray-700">{issue}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Suggestions */}
          {result.suggestions?.length > 0 && (
            <Card title="Improvement Suggestions">
              <ul className="space-y-2">
                {result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start text-sm">
                    <span className="inline-block w-2 h-2 bg-brand-400 rounded-full mt-1.5 mr-2 shrink-0" />
                    <span className="text-gray-700">{s}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate(`/app/optimize/${resume.id}`)}>AI Optimize</Button>
            <Button variant="secondary" onClick={() => navigate(`/app/builder/${resume.id}`)}>Edit Resume</Button>
            <Button onClick={() => navigate(`/app/export/${resume.id}`)}>Export Resume</Button>
          </div>
        </div>
      )}
    </div>
  );
}

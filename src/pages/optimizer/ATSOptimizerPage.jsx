import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { useResume } from '../../hooks/useResume';
import { analyzeJobDescription } from '../../services/aiService';
import { checkVoiceConsistency } from '../../utils/voiceConsistency';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ScoreGauge from '../../components/common/ScoreGauge';

export default function ATSOptimizerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resumes } = useResume();
  const resume = resumes.find(r => r.id === id);
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [voiceFlags, setVoiceFlags] = useState([]);

  if (!resume) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-gray-500 mb-4">Select a resume to scan.</p>
        <Button onClick={() => navigate('/app/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const scan = async () => {
    setError('');
    setResult(null);
    setVoiceFlags([]);
    setLoading(true);
    try {
      const [data, flags] = await Promise.all([
        analyzeJobDescription(jdText, resume),
        Promise.resolve(checkVoiceConsistency(resume)),
      ]);
      setResult(data);
      setVoiceFlags(flags);
    } catch (err) {
      setError(err.message || 'Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ATS Score</h1>
          <p className="text-gray-500">Scan your resume against a job description.</p>
        </div>
      </div>

      {/* JD input */}
      <Card className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Job Description <span className="text-gray-400 font-normal">(required for accurate scoring)</span>
        </label>
        <textarea
          value={jdText}
          onChange={e => setJdText(e.target.value)}
          rows={5}
          className="input-field resize-none mb-3"
          placeholder="Paste the job description here to get an accurate ATS match score..."
        />
        <Button onClick={scan} loading={loading} disabled={!jdText.trim()}>
          <RefreshCw className="h-4 w-4 mr-2" />Run ATS Scan
        </Button>
      </Card>

      {error && (
        <Card className="mb-6">
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {!result && !loading && !error && (
        <Card>
          <div className="text-center py-16 text-gray-400">
            <Shield className="h-16 w-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Paste a job description and click Run ATS Scan</p>
            <p className="text-sm mt-1">We'll compare your resume against the actual job requirements.</p>
          </div>
        </Card>
      )}

      {result && (
        <div className="space-y-6">
          {/* Overall Score */}
          <Card>
            <div className="flex items-center justify-center gap-8">
              <ScoreGauge score={result.overallScore} size="lg" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ATS Match Score</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {result.overallScore >= 80
                    ? 'Strong match. Your resume aligns well with this job.'
                    : result.overallScore >= 60
                    ? 'Moderate match. A few gaps to address.'
                    : 'Low match. Consider tailoring your resume for this role.'}
                </p>
              </div>
            </div>
          </Card>

          {/* Matched Skills */}
          {result.matchedSkills?.length > 0 && (
            <Card title="Matched Keywords">
              <div className="flex flex-wrap gap-2">
                {result.matchedSkills.map((s, i) => (
                  <span key={i} className="bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full border border-green-100">
                    {s}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Missing Keywords */}
          {result.missingKeywords?.length > 0 && (
            <Card title="Missing Keywords">
              <p className="text-sm text-gray-500 mb-3">
                These keywords appear in the job description but not in your resume.
              </p>
              <div className="flex flex-wrap gap-2">
                {result.missingKeywords.map((k, i) => (
                  <span key={i} className="bg-yellow-50 text-yellow-800 text-xs px-2.5 py-1 rounded-full border border-yellow-200">
                    {k}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Voice Consistency */}
          {voiceFlags.length > 0 && (
            <Card title="Voice Consistency">
              <p className="text-sm text-gray-500 mb-3">
                These phrases may sound generic or AI-generated to human reviewers.
              </p>
              <ul className="space-y-2">
                {voiceFlags.map((flag, i) => (
                  <li key={i} className="flex items-start text-sm gap-2">
                    <span className="inline-block w-2 h-2 bg-orange-400 rounded-full mt-1.5 shrink-0" />
                    <div>
                      <span className="text-gray-700 font-medium">"{flag.phrase}"</span>
                      {flag.suggestion && (
                        <span className="text-gray-500"> — {flag.suggestion}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Suggestions */}
          {result.suggestions?.length > 0 && (
            <Card title="Suggestions">
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
            <Button variant="secondary" onClick={() => navigate('/app/jd-analyzer')}>
              Tailor Resume
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/app/builder/${resume.id}`)}>
              Edit Resume
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

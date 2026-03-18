import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { useResume } from '../../hooks/useResume';
import { analyzeJobDescription } from '../../services/aiService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import ProgressBar from '../../components/common/ProgressBar';

export default function JDAnalyzerPage() {
  const { resumes } = useResume();
  const [selectedResume, setSelectedResume] = useState('');
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const analyze = async () => {
    if (!jdText.trim()) return;
    setLoading(true);
    try {
      const resume = resumes.find(r => r.id === selectedResume);
      const data = await analyzeJobDescription(jdText, resume || {});
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Job Description Analyzer</h1>
      <p className="text-gray-500 mb-6">Paste a job description to see how your resume matches.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Resume</label>
            <select value={selectedResume} onChange={e => setSelectedResume(e.target.value)} className="input-field bg-white">
              <option value="">-- Select a resume --</option>
              {resumes.map(r => <option key={r.id} value={r.id}>{r.name || 'Untitled'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea value={jdText} onChange={e => setJdText(e.target.value)} rows={12} className="input-field" placeholder="Paste the full job description here..." />
          </div>
          <Button onClick={analyze} loading={loading} disabled={!jdText.trim()} className="w-full">
            <Search className="h-4 w-4 mr-2" />Analyze Match
          </Button>
        </div>

        {/* Results */}
        <div>
          {!result && !loading && (
            <div className="card p-8 text-center text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Paste a job description and click Analyze to see results.</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <Card title="Match Score">
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-brand-600">{result.overallScore}%</div>
                  <p className="text-sm text-gray-500">Overall Match</p>
                </div>
                <ProgressBar value={result.overallScore} max={100} color={result.overallScore >= 70 ? 'green' : result.overallScore >= 50 ? 'yellow' : 'red'} />
              </Card>

              <Card title="Matched Skills">
                <div className="flex flex-wrap gap-2">
                  {result.matchedSkills?.map((s, i) => (
                    <span key={i} className="inline-flex items-center bg-green-50 text-green-700 text-xs px-2 py-1 rounded-full">
                      <CheckCircle2 className="h-3 w-3 mr-1" />{s}
                    </span>
                  ))}
                  {(!result.matchedSkills || result.matchedSkills.length === 0) && (
                    <p className="text-sm text-gray-400">No matched skills found.</p>
                  )}
                </div>
              </Card>

              <Card title="Missing Keywords">
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords?.map((k, i) => (
                    <span key={i} className="inline-flex items-center bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full">
                      <XCircle className="h-3 w-3 mr-1" />{k}
                    </span>
                  ))}
                </div>
              </Card>

              <Card title="Suggestions">
                <ul className="space-y-2">
                  {result.suggestions?.map((s, i) => (
                    <li key={i} className="flex items-start text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2 mt-0.5 shrink-0" />
                      <span className="text-gray-700">{s}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

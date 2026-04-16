import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';

const SCORE_BANDS = [
  { min: 90, label: 'Excellent', color: 'text-green-600', bg: 'bg-green-100' },
  { min: 75, label: 'Good', color: 'text-blue-600', bg: 'bg-blue-100' },
  { min: 60, label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  { min: 0,  label: 'Needs Work', color: 'text-red-600', bg: 'bg-red-100' },
];

function scoreBand(score) {
  return SCORE_BANDS.find(b => score >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1];
}

function ScoreBar({ label, value }) {
  if (value == null) return null;
  const pct = Math.min(Math.max(value, 0), 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-brand-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-700 w-8 text-right">{Math.round(value)}</span>
    </div>
  );
}

export default function ReviewOptimizeStep({ data, onChange, allData }) {
  const v = data || { professionalSummary: { summaryText: '', isAiGenerated: false }, summary: {} };
  const ps = v.professionalSummary || { summaryText: '', isAiGenerated: false };

  const [atsLoading, setAtsLoading] = useState(false);
  const [atsScore, setAtsScore] = useState(null);
  const [atsError, setAtsError] = useState(null);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState(null);

  const updateSummary = (field, val) => {
    onChange({ ...v, professionalSummary: { ...ps, [field]: val } });
  };

  const runATS = async () => {
    setAtsLoading(true);
    setAtsError(null);
    try {
      const res = await fetch('/api/ats-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: allData,
          jobDescription: allData?.careerObjective?.jobDescriptionText || '',
        }),
      });
      if (!res.ok) throw new Error('ATS scoring failed');
      const result = await res.json();
      setAtsScore(result);
    } catch {
      setAtsError('Could not run ATS analysis. Please try again.');
    } finally {
      setAtsLoading(false);
    }
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: allData }),
      });
      if (!res.ok) throw new Error('Summary generation failed');
      const { summary } = await res.json();
      updateSummary('summaryText', summary);
      updateSummary('isAiGenerated', true);
    } catch {
      setSummaryError('Could not generate summary. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const band = atsScore ? scoreBand(atsScore.overall) : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Review & Optimize</h2>
        <p className="text-sm text-gray-500 mt-1">Check your ATS score and generate a professional summary.</p>
      </div>

      {/* ── ATS Score Section ── */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">ATS Score Analysis</h3>
            <p className="text-xs text-gray-500 mt-0.5">How well your resume matches the job description</p>
          </div>
          <button
            type="button"
            onClick={runATS}
            disabled={atsLoading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {atsLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <RefreshCw className="h-4 w-4" />}
            {atsLoading ? 'Analyzing...' : atsScore ? 'Re-analyze' : 'Run ATS Analysis'}
          </button>
        </div>

        {atsError && <p className="text-sm text-red-500 mb-3">{atsError}</p>}

        {atsScore ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${band.color}`}>{Math.round(atsScore.overall)}</div>
              <div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${band.bg} ${band.color}`}>
                  {band.label}
                </span>
                <p className="text-xs text-gray-500 mt-1">Overall ATS Score</p>
              </div>
            </div>
            <div className="space-y-2">
              <ScoreBar label="Keyword Match" value={atsScore.keyword} />
              <ScoreBar label="Format" value={atsScore.format} />
              <ScoreBar label="Impact" value={atsScore.impact} />
              <ScoreBar label="Completeness" value={atsScore.completeness} />
            </div>
            {atsScore.missingKeywords?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Missing Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {atsScore.missingKeywords.map(kw => (
                    <span key={kw} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full">{kw}</span>
                  ))}
                </div>
              </div>
            )}
            {atsScore.suggestions?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Suggestions</p>
                <ul className="space-y-1">
                  {atsScore.suggestions.map((s, i) => (
                    <li key={i} className="text-sm text-gray-600 flex gap-2">
                      <span className="text-brand-500 mt-0.5">•</span>{s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            {atsLoading ? 'Running analysis...' : 'Run ATS analysis to see how your resume scores against the job description.'}
          </p>
        )}
      </div>

      {/* ── Professional Summary Section ── */}
      <div className="border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Professional Summary</h3>
            <p className="text-xs text-gray-500 mt-0.5">3–4 sentence overview at the top of your resume</p>
          </div>
          <button
            type="button"
            onClick={generateSummary}
            disabled={summaryLoading}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {summaryLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Sparkles className="h-4 w-4" />}
            {summaryLoading ? 'Generating...' : ps.isAiGenerated ? 'Regenerate' : 'Generate with AI'}
          </button>
        </div>

        {summaryError && <p className="text-sm text-red-500 mb-3">{summaryError}</p>}

        <textarea
          value={ps.summaryText || ''}
          onChange={e => updateSummary('summaryText', e.target.value)}
          rows={5}
          className="input-field w-full"
          placeholder="Write your professional summary, or click 'Generate with AI' to create one automatically..."
        />
        {ps.isAiGenerated && (
          <p className="text-xs text-brand-600 mt-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />AI-generated — feel free to edit
          </p>
        )}
      </div>
    </div>
  );
}

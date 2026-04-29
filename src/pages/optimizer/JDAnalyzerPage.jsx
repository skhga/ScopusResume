import React, { useState } from 'react';
import { useResume } from '../../hooks/useResume';
import { parseJobDescription, compareResumeToJD, tailorResume } from '../../services/aiService';
import resumeVersionService from '../../services/resumeVersionService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import StepIndicator from '../../components/common/StepIndicator';
import DiffView from '../../components/resume/DiffView';
import JDParserPanel from '../../components/optimizer/JDParserPanel';
import MatchComparisonPanel from '../../components/optimizer/MatchComparisonPanel';
import { Search, BarChart3, Wand2, AlertCircle } from 'lucide-react';

const TABS = [
  { label: 'Parse', description: 'Analyze JD' },
  { label: 'Compare', description: 'Match resume' },
  { label: 'Optimize', description: 'Tailor resume' },
];

export default function JDAnalyzerPage() {
  const { resumes, updateResume } = useResume();
  const [selectedId, setSelectedId] = useState('');
  const [jdText, setJdText] = useState('');
  const [tab, setTab] = useState(0);
  const [maxTab, setMaxTab] = useState(0);

  // Tab-specific state
  const [parseResult, setParseResult] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [diffs, setDiffs] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const selectedResume = resumes.find(r => r.id === selectedId) || null;
  const hasInput = jdText.trim().length > 0 && selectedId;

  const advanceTab = (newTab) => {
    setMaxTab(m => Math.max(m, newTab));
    setTab(newTab);
  };

  // --- Parse ---
  const handleParse = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await parseJobDescription(jdText);
      setParseResult(result);
      advanceTab(0); // stay on parse tab, show results
    } catch (err) {
      setError(err.message || 'Parsing failed');
    } finally {
      setLoading(false);
    }
  };

  // --- Compare ---
  const handleCompare = async () => {
    if (!selectedResume) return;
    setError('');
    setLoading(true);
    try {
      const result = await compareResumeToJD(selectedResume, jdText);
      setCompareResult(result);
      advanceTab(1);
    } catch (err) {
      setError(err.message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  // --- Optimize (Tailor) ---
  const handleTailor = async () => {
    if (!selectedResume) return;
    setError('');
    setDiffs(null);
    setSaved(false);
    setLoading(true);
    try {
      const result = await tailorResume(selectedResume, jdText);
      setDiffs(result);
      advanceTab(2);
    } catch (err) {
      setError(err.message || 'Tailoring failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (diff) => {
    if (!selectedResume) return;
    const existing = selectedResume.tailoredDiffs || [];
    updateResume(selectedResume.id, {
      ...selectedResume,
      tailoredDiffs: [...existing.filter(d => d.section !== diff.section), diff],
    });
  };

  const handleApplyAll = async () => {
    if (!selectedResume || !diffs) return;
    try {
      await resumeVersionService.saveVersion(selectedResume.id, selectedResume, jdText, diffs);
    } catch (err) {
      console.warn('[JDAnalyzerPage] Failed to save version snapshot:', err);
    }
    updateResume(selectedResume.id, { ...selectedResume, tailoredDiffs: diffs });
    setSaved(true);
  };

  return (
    <div className="page-container max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">JD Analyzer</h1>
      <p className="text-gray-500 mb-6">Paste a job description, parse it, compare to your resume, and optimize.</p>

      {/* Shared inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Resume</label>
          <select
            value={selectedId}
            onChange={e => {
              setSelectedId(e.target.value);
              setParseResult(null);
              setCompareResult(null);
              setDiffs(null);
              setError('');
            }}
            className="input-field bg-white"
          >
            <option value="">-- Select a resume --</option>
            {resumes.map(r => (
              <option key={r.id} value={r.id}>{r.name || 'Untitled'}</option>
            ))}
          </select>
          {resumes.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              No resumes yet. <a href="/app/builder" className="text-brand-600 hover:underline">Create one first.</a>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
          <textarea
            value={jdText}
            onChange={e => {
              setJdText(e.target.value);
              setParseResult(null);
              setCompareResult(null);
              setDiffs(null);
              setError('');
            }}
            rows={5}
            className="input-field resize-none"
            placeholder="Paste the full job description here..."
          />
          {jdText.length > 5000 && (
            <p className="text-xs text-yellow-600 mt-1">Long JD — only the first 5,000 characters will be sent.</p>
          )}
        </div>
      </div>

      {/* Step Indicator + Action Buttons */}
      <div className="mb-4">
        <StepIndicator currentStep={tab} steps={TABS} maxStep={maxTab} onStepClick={advanceTab} />
      </div>

      <div className="flex gap-3 mb-6">
        <Button onClick={handleParse} loading={loading} disabled={!jdText.trim()} variant="secondary" size="sm">
          <Search className="h-4 w-4 mr-1.5" /> Parse JD
        </Button>
        <Button onClick={handleCompare} loading={loading} disabled={!hasInput} variant="secondary" size="sm">
          <BarChart3 className="h-4 w-4 mr-1.5" /> Compare
        </Button>
        <Button onClick={handleTailor} loading={loading} disabled={!hasInput} size="sm">
          <Wand2 className="h-4 w-4 mr-1.5" /> Optimize
        </Button>
      </div>

      {/* Error */}
      {error && (
        <Card className="mb-6">
          <div className="flex items-start gap-3 text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm">Something went wrong</p>
              <p className="text-sm text-red-500 mt-0.5">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tab Content */}
      {tab === 0 && (
        <div>
          {!parseResult && !loading && (
            <div className="card p-12 text-center text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Paste a job description and click Parse JD to extract structured information.</p>
            </div>
          )}
          {parseResult && <JDParserPanel result={parseResult} />}
        </div>
      )}

      {tab === 1 && (
        <div>
          {!compareResult && !loading && (
            <div className="card p-12 text-center text-gray-400">
              <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a resume and click Compare to see how you match this job.</p>
            </div>
          )}
          {compareResult && <MatchComparisonPanel result={compareResult} />}
        </div>
      )}

      {tab === 2 && (
        <div>
          {!diffs && !loading && (
            <div className="card p-12 text-center text-gray-400">
              <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Click Optimize to get tailored suggestions for this job description.</p>
            </div>
          )}
          {diffs && (
            <div className="space-y-4">
              {saved && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
                  All changes applied. Edit the resume to see the updated version.
                </div>
              )}
              {diffs.length === 0 ? (
                <Card>
                  <p className="text-sm text-gray-500 text-center py-4">
                    Your resume is already well-matched for this job. No changes suggested.
                  </p>
                </Card>
              ) : (
                <DiffView diffs={diffs} onApply={handleApply} onApplyAll={handleApplyAll} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

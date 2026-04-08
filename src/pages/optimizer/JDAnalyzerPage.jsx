import React, { useState } from 'react';
import { Wand2, AlertCircle } from 'lucide-react';
import { useResume } from '../../hooks/useResume';
import { tailorResume } from '../../services/aiService';
import resumeVersionService from '../../services/resumeVersionService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import DiffView from '../../components/resume/DiffView';

export default function JDAnalyzerPage() {
  const { resumes, updateResume } = useResume();
  const [selectedId, setSelectedId] = useState('');
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [diffs, setDiffs] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const selectedResume = resumes.find(r => r.id === selectedId) || null;
  const canAnalyze = jdText.trim().length > 0 && selectedId;

  const handleTailor = async () => {
    setError('');
    setDiffs(null);
    setSaved(false);
    setLoading(true);
    try {
      const result = await tailorResume(selectedResume, jdText);
      setDiffs(result);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Apply a single diff to the resume in memory.
   * The tailored version replaces the relevant text in the resume sections.
   * Since resume data is structured (not plain text), we save the full diff
   * set as a tailored_diffs field so the user can see history.
   */
  const handleApply = (diff) => {
    if (!selectedResume) return;
    // Store the applied diff on the resume for now — granular field-level apply
    // will be wired once Supabase schema is finalized in Sprint 2.
    const existing = selectedResume.tailoredDiffs || [];
    updateResume(selectedResume.id, {
      ...selectedResume,
      tailoredDiffs: [...existing.filter(d => d.section !== diff.section), diff],
    });
  };

  const handleApplyAll = async () => {
    if (!selectedResume || !diffs) return;

    // Save a version snapshot BEFORE applying (non-fatal if it fails)
    try {
      await resumeVersionService.saveVersion(
        selectedResume.id,
        selectedResume,
        jdText,
        diffs
      );
    } catch (err) {
      console.warn('[JDAnalyzerPage] Failed to save version snapshot:', err);
    }

    updateResume(selectedResume.id, {
      ...selectedResume,
      tailoredDiffs: diffs,
    });
    setSaved(true);
  };

  return (
    <div className="page-container max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">AI Tailor</h1>
      <p className="text-gray-500 mb-6">
        Paste a job description to see a diff of what to change in your resume.
      </p>

      {/* Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Resume</label>
            <select
              value={selectedId}
              onChange={e => { setSelectedId(e.target.value); setDiffs(null); setError(''); }}
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
              onChange={e => { setJdText(e.target.value); setDiffs(null); setError(''); }}
              rows={12}
              className="input-field resize-none"
              placeholder="Paste the full job description here..."
            />
            {jdText.length > 5000 && (
              <p className="text-xs text-yellow-600 mt-1">
                Long JD — only the first 5,000 characters will be sent.
              </p>
            )}
          </div>

          <Button
            onClick={handleTailor}
            loading={loading}
            disabled={!canAnalyze}
            className="w-full"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {loading ? 'Tailoring...' : 'Tailor Resume'}
          </Button>

          {!canAnalyze && !loading && (
            <p className="text-xs text-gray-400 text-center">
              {!selectedId ? 'Select a resume above' : 'Paste a job description to continue'}
            </p>
          )}
        </div>

        {/* Results panel */}
        <div>
          {!diffs && !loading && !error && (
            <div className="card p-8 text-center text-gray-400 h-full flex flex-col items-center justify-center">
              <Wand2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Select a resume, paste a job description, and click Tailor Resume.
              </p>
              <p className="text-xs mt-2 text-gray-300">
                You'll see a side-by-side diff of what to change.
              </p>
            </div>
          )}

          {error && (
            <Card>
              <div className="flex items-start gap-3 text-red-600">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Something went wrong</p>
                  <p className="text-sm text-red-500 mt-0.5">{error}</p>
                </div>
              </div>
            </Card>
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
                <DiffView
                  diffs={diffs}
                  onApply={handleApply}
                  onApplyAll={handleApplyAll}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

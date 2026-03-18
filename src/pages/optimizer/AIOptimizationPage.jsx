import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Wand2, ArrowRight, Check } from 'lucide-react';
import { useResume } from '../../hooks/useResume';
import { optimizeBullets, generateSummary } from '../../services/aiService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function AIOptimizationPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { resumes, updateResume } = useResume();
  const resume = resumes.find(r => r.id === id);
  const [loading, setLoading] = useState(false);
  const [optimized, setOptimized] = useState(null);
  const [applied, setApplied] = useState({});

  if (!resume) {
    return (
      <div className="page-container text-center py-20">
        <p className="text-gray-500 mb-4">Select a resume to optimize.</p>
        <Button onClick={() => navigate('/app/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const runOptimization = async () => {
    setLoading(true);
    try {
      const bullets = resume.workExperience?.flatMap(w => w.bulletPoints || []) || [];
      const [optimizedBullets, summary] = await Promise.all([
        optimizeBullets(bullets),
        generateSummary(resume),
      ]);
      setOptimized({ bullets: optimizedBullets, summary });
    } finally {
      setLoading(false);
    }
  };

  const applySummary = async () => {
    await updateResume(resume.id, {
      ...resume,
      summary: { ...resume.summary, summaryText: optimized.summary },
    });
    setApplied(prev => ({ ...prev, summary: true }));
  };

  const applyBullets = async () => {
    const updated = resume.workExperience.map((w, i) => {
      const newBullets = optimized.bullets.slice(
        resume.workExperience.slice(0, i).reduce((acc, we) => acc + (we.bulletPoints?.length || 0), 0),
        resume.workExperience.slice(0, i + 1).reduce((acc, we) => acc + (we.bulletPoints?.length || 0), 0)
      );
      return { ...w, bulletPoints: newBullets.length > 0 ? newBullets : w.bulletPoints };
    });
    await updateResume(resume.id, { ...resume, workExperience: updated });
    setApplied(prev => ({ ...prev, bullets: true }));
  };

  return (
    <div className="page-container max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Optimization</h1>
          <p className="text-gray-500">Let AI enhance your resume content.</p>
        </div>
        <Button onClick={runOptimization} loading={loading}>
          <Wand2 className="h-4 w-4 mr-2" />Optimize Now
        </Button>
      </div>

      {!optimized && !loading && (
        <Card>
          <div className="text-center py-12 text-gray-400">
            <Wand2 className="h-16 w-16 mx-auto mb-4 opacity-40" />
            <p className="text-lg">Click "Optimize Now" to generate AI-enhanced content</p>
            <p className="text-sm mt-1">We'll rewrite bullet points and generate a professional summary.</p>
          </div>
        </Card>
      )}

      {optimized && (
        <div className="space-y-6">
          {/* Summary comparison */}
          <Card title="Professional Summary" headerAction={
            <Button size="sm" variant={applied.summary ? 'ghost' : 'primary'} onClick={applySummary} disabled={applied.summary}>
              {applied.summary ? <><Check className="h-4 w-4 mr-1" />Applied</> : 'Apply'}
            </Button>
          }>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Original</h4>
                <p className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                  {resume.summary?.summaryText || <span className="italic text-gray-400">No summary yet</span>}
                </p>
              </div>
              <div>
                <h4 className="text-xs font-medium text-green-600 uppercase mb-2 flex items-center">
                  <Wand2 className="h-3 w-3 mr-1" />AI Enhanced
                </h4>
                <p className="text-sm text-gray-700 bg-green-50 rounded p-3">{optimized.summary}</p>
              </div>
            </div>
          </Card>

          {/* Bullet points comparison */}
          <Card title="Bullet Points" headerAction={
            <Button size="sm" variant={applied.bullets ? 'ghost' : 'primary'} onClick={applyBullets} disabled={applied.bullets}>
              {applied.bullets ? <><Check className="h-4 w-4 mr-1" />Applied</> : 'Apply All'}
            </Button>
          }>
            {resume.workExperience?.map((w, i) => (
              <div key={i} className="mb-4 last:mb-0">
                <h4 className="font-medium text-gray-900 text-sm mb-2">{w.jobTitle} at {w.companyName}</h4>
                {w.bulletPoints?.map((b, j) => {
                  const idx = resume.workExperience.slice(0, i).reduce((acc, we) => acc + (we.bulletPoints?.length || 0), 0) + j;
                  const opt = optimized.bullets[idx];
                  return (
                    <div key={j} className="flex items-start gap-3 mb-2 text-sm">
                      <div className="flex-1 bg-gray-50 rounded p-2 text-gray-600">{b || '(empty)'}</div>
                      <ArrowRight className="h-4 w-4 text-gray-300 mt-2 shrink-0" />
                      <div className="flex-1 bg-green-50 rounded p-2 text-gray-700">{opt || b}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

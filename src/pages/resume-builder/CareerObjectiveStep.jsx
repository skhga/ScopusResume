import React from 'react';
import { SENIORITY_LEVELS } from '../../utils/constants';

export default function CareerObjectiveStep({ data, onChange }) {
  const v = data || {};
  const u = (field, val) => onChange({ ...v, [field]: val });

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-gray-900">Career Objective</h2><p className="text-sm text-gray-500 mt-1">Tell us about the role you're targeting. This drives the AI optimization.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Job Title <span className="text-red-500">*</span></label><input value={v.targetJobTitle || ''} onChange={e => u('targetJobTitle', e.target.value)} className="input-field" placeholder="e.g. Software Engineer" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Target Industry</label><input value={v.targetIndustry || ''} onChange={e => u('targetIndustry', e.target.value)} className="input-field" placeholder="e.g. Technology" /></div>
      </div>
      <div className="max-w-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">Seniority Level</label>
        <select value={v.seniorityLevel || ''} onChange={e => u('seniorityLevel', e.target.value)} className="input-field bg-white">
          <option value="">Select level</option>
          {SENIORITY_LEVELS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
        <textarea value={v.jobDescriptionText || ''} onChange={e => u('jobDescriptionText', e.target.value)} rows={6} className="input-field" placeholder="Paste the job description here for AI-powered optimization..." />
        <p className="text-xs text-gray-400 mt-1">The AI will use this to tailor your resume keywords and content.</p>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">Job Posting URL (optional)</label><input type="url" value={v.jobDescriptionUrl || ''} onChange={e => u('jobDescriptionUrl', e.target.value)} className="input-field max-w-lg" placeholder="https://..." /></div>
    </div>
  );
}

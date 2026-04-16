import React from 'react';
import { SENIORITY_LEVELS, INDUSTRIES } from '../../utils/constants';

const JD_MAX = 5000;

export default function CareerObjectiveStep({ data, onChange }) {
  const v = data || {};
  const u = (field, val) => onChange({ ...v, [field]: val });
  const jdLen = (v.jobDescriptionText || '').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Career Objective</h2>
        <p className="text-sm text-gray-500 mt-1">Tell us about the role you're targeting. This drives the AI optimization.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Target Job Title <span className="text-red-500">*</span>
          </label>
          <input
            value={v.targetJobTitle || ''}
            onChange={e => u('targetJobTitle', e.target.value)}
            className="input-field"
            placeholder="e.g. Software Engineer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Industry</label>
          <select
            value={v.targetIndustry || ''}
            onChange={e => u('targetIndustry', e.target.value)}
            className="input-field bg-white"
          >
            <option value="">Select industry</option>
            {INDUSTRIES.map(ind => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Seniority Level</label>
        <div className="flex flex-wrap gap-3">
          {SENIORITY_LEVELS.map(s => (
            <label key={s.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="seniorityLevel"
                value={s.value}
                checked={v.seniorityLevel === s.value}
                onChange={() => u('seniorityLevel', s.value)}
                className="text-brand-600 border-gray-300"
              />
              <span className="text-sm text-gray-700">{s.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-medium text-gray-700">Job Description</label>
          <span className={`text-xs ${jdLen > JD_MAX ? 'text-red-500' : 'text-gray-400'}`}>
            {jdLen}/{JD_MAX}
          </span>
        </div>
        <textarea
          value={v.jobDescriptionText || ''}
          onChange={e => u('jobDescriptionText', e.target.value)}
          rows={6}
          maxLength={JD_MAX}
          className="input-field"
          placeholder="Paste the job description here for AI-powered optimization..."
        />
        <p className="text-xs text-gray-400 mt-1">The AI will use this to tailor your resume keywords and content.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Job Posting URL (optional)</label>
        <input
          type="url"
          value={v.jobDescriptionUrl || ''}
          onChange={e => u('jobDescriptionUrl', e.target.value)}
          className="input-field max-w-lg"
          placeholder="https://..."
        />
      </div>
    </div>
  );
}

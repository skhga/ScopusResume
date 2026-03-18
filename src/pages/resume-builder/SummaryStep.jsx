import React from 'react';
import { Sparkles } from 'lucide-react';
import { RESUME_FORMATS } from '../../utils/constants';
import Button from '../../components/common/Button';

export default function SummaryStep({ data, onChange, allData }) {
  const v = data || {};
  const u = (field, val) => onChange({ ...v, [field]: val });

  const counts = {
    education: allData?.education?.length || 0,
    experience: allData?.workExperience?.length || 0,
    skills: (allData?.skills?.technicalSkills?.length || 0) + (allData?.skills?.programmingLanguages?.length || 0),
    projects: allData?.projects?.length || 0,
    certifications: allData?.certifications?.length || 0,
  };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-gray-900">Review & Summary</h2><p className="text-sm text-gray-500 mt-1">Review your resume and configure final options.</p></div>

      {/* Summary */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">Professional Summary</label>
          <Button variant="ghost" size="sm" onClick={() => u('summaryText', 'Results-driven professional with a proven track record of delivering high-impact solutions. Skilled in full-stack development and cross-functional collaboration.')}><Sparkles className="h-4 w-4 mr-1" />Generate with AI</Button>
        </div>
        <textarea value={v.summaryText || ''} onChange={e => u('summaryText', e.target.value)} rows={4} className="input-field" placeholder="Write a brief professional summary..." />
      </div>

      {/* Format */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Resume Format</label>
        <div className="flex gap-3">
          {RESUME_FORMATS.map(f => (
            <label key={f.value} className={`flex-1 p-3 border rounded-lg cursor-pointer text-center text-sm transition ${v.resumeFormatType === f.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="format" value={f.value} checked={v.resumeFormatType === f.value} onChange={e => u('resumeFormatType', e.target.value)} className="sr-only" />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      {/* Length */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Resume Length</label>
        <div className="flex gap-3">
          {[{ v: 'one_page', l: 'One Page' }, { v: 'two_page', l: 'Two Pages' }].map(o => (
            <label key={o.v} className={`flex-1 p-3 border rounded-lg cursor-pointer text-center text-sm transition ${v.resumeLength === o.v ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-gray-300'}`}>
              <input type="radio" name="length" value={o.v} checked={v.resumeLength === o.v} onChange={e => u('resumeLength', e.target.value)} className="sr-only" />
              {o.l}
            </label>
          ))}
        </div>
      </div>

      {/* AI Options */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">AI Options</label>
        {[
          { field: 'aiRewriteBullets', label: 'AI Rewrite Bullet Points' },
          { field: 'aiKeywordInject', label: 'AI Keyword Injection' },
          { field: 'atsOptimize', label: 'ATS Optimization' },
        ].map(o => (
          <label key={o.field} className="flex items-center"><input type="checkbox" checked={v[o.field] !== false} onChange={e => u(o.field, e.target.checked)} className="rounded border-gray-300 text-brand-600 mr-2" /><span className="text-sm text-gray-700">{o.label}</span></label>
        ))}
      </div>

      {/* Data Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Resume Data Summary</h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="text-center">
              <div className={`text-lg font-bold ${v > 0 ? 'text-brand-600' : 'text-gray-300'}`}>{v}</div>
              <div className="text-xs text-gray-500 capitalize">{k}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

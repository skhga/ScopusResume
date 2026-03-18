import React from 'react';
import { Plus, Trash2, Sparkles } from 'lucide-react';
import { MONTHS } from '../../utils/constants';
import { emptyWorkExperience } from '../../constants/resumeFields';
import RepeatableSection from '../../components/forms/RepeatableSection';

export default function WorkExperienceStep({ data, onChange }) {
  const items = data || [];
  const add = () => onChange([...items, { ...emptyWorkExperience }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => { const n = [...items]; n[i] = { ...n[i], [field]: val }; onChange(n); };
  const updateBullet = (i, j, val) => { const n = [...items]; const b = [...n[i].bulletPoints]; b[j] = val; n[i] = { ...n[i], bulletPoints: b }; onChange(n); };
  const addBullet = (i) => { const n = [...items]; n[i] = { ...n[i], bulletPoints: [...n[i].bulletPoints, ''] }; onChange(n); };
  const removeBullet = (i, j) => { const n = [...items]; n[i] = { ...n[i], bulletPoints: n[i].bulletPoints.filter((_, idx) => idx !== j) }; onChange(n); };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-gray-900">Work Experience</h2><p className="text-sm text-gray-500 mt-1">Describe what you did in plain language - the AI will optimize it.</p></div>
      <RepeatableSection items={items} onAdd={add} onRemove={remove} addButtonText="Add Experience" maxItems={10}
        renderItem={(item, i) => (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label><input value={item.companyName} onChange={e => update(i, 'companyName', e.target.value)} className="input-field" placeholder="Google" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label><input value={item.jobTitle} onChange={e => update(i, 'jobTitle', e.target.value)} className="input-field" placeholder="Software Engineer" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label><input value={item.location} onChange={e => update(i, 'location', e.target.value)} className="input-field" placeholder="San Francisco, CA" /></div>
              <div className="flex items-end pb-2"><label className="flex items-center text-sm"><input type="checkbox" checked={item.isRemote || false} onChange={e => update(i, 'isRemote', e.target.checked)} className="rounded border-gray-300 text-brand-600 mr-2" />Remote position</label></div>
            </div>
            <div className="flex items-center gap-2 mb-2"><input type="checkbox" checked={item.isCurrentRole || false} onChange={e => update(i, 'isCurrentRole', e.target.checked)} className="rounded border-gray-300 text-brand-600" /><span className="text-sm text-gray-700">I currently work here</span></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Month</label><select value={item.startMonth} onChange={e => update(i, 'startMonth', e.target.value)} className="input-field bg-white"><option value="">Month</option>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Start Year</label><input value={item.startYear} onChange={e => update(i, 'startYear', e.target.value)} className="input-field" placeholder="2022" /></div>
              {!item.isCurrentRole && <><div><label className="block text-sm font-medium text-gray-700 mb-1">End Month</label><select value={item.endMonth} onChange={e => update(i, 'endMonth', e.target.value)} className="input-field bg-white"><option value="">Month</option>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div><div><label className="block text-sm font-medium text-gray-700 mb-1">End Year</label><input value={item.endYear} onChange={e => update(i, 'endYear', e.target.value)} className="input-field" placeholder="2024" /></div></>}
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">What you did (plain language)</label><textarea value={item.jobDescriptionRaw} onChange={e => update(i, 'jobDescriptionRaw', e.target.value)} rows={3} className="input-field" placeholder="Describe your responsibilities and achievements..." /></div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bullet Points</label>
              {item.bulletPoints?.map((b, j) => (
                <div key={j} className="flex items-center gap-2 mb-2">
                  <span className="text-gray-400 text-sm">{j + 1}.</span>
                  <input value={b} onChange={e => updateBullet(i, j, e.target.value)} className="input-field flex-1" placeholder="Describe an achievement..." />
                  <button type="button" title="Generate with AI" className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg"><Sparkles className="h-4 w-4" /></button>
                  {item.bulletPoints.length > 1 && <button type="button" onClick={() => removeBullet(i, j)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>}
                </div>
              ))}
              <button type="button" onClick={() => addBullet(i)} className="text-sm text-brand-600 hover:underline flex items-center mt-1"><Plus className="h-3 w-3 mr-1" />Add bullet point</button>
            </div>
          </div>
        )}
      />
    </div>
  );
}

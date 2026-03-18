import React from 'react';
import { DEGREE_TYPES, MONTHS } from '../../utils/constants';
import { emptyEducation } from '../../constants/resumeFields';
import RepeatableSection from '../../components/forms/RepeatableSection';

export default function EducationStep({ data, onChange }) {
  const items = data || [];
  const add = () => onChange([...items, { ...emptyEducation }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => { const n = [...items]; n[i] = { ...n[i], [field]: val }; onChange(n); };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-gray-900">Education</h2><p className="text-sm text-gray-500 mt-1">Add your academic background.</p></div>
      <RepeatableSection items={items} onAdd={add} onRemove={remove} addButtonText="Add Education" maxItems={5}
        renderItem={(item, i) => (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Institution Name *</label><input value={item.institutionName} onChange={e => update(i, 'institutionName', e.target.value)} className="input-field" placeholder="Harvard University" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Degree Type</label><select value={item.degreeType} onChange={e => update(i, 'degreeType', e.target.value)} className="input-field bg-white"><option value="">Select</option>{DEGREE_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label><input value={item.fieldOfStudy} onChange={e => update(i, 'fieldOfStudy', e.target.value)} className="input-field" placeholder="Computer Science" /></div>
            <div className="flex items-center gap-2 mb-2"><input type="checkbox" checked={item.currentlyEnrolled || false} onChange={e => update(i, 'currentlyEnrolled', e.target.checked)} className="rounded border-gray-300 text-brand-600" /><span className="text-sm text-gray-700">Currently enrolled</span></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Grad Month</label><select value={item.graduationMonth} onChange={e => update(i, 'graduationMonth', e.target.value)} className="input-field bg-white"><option value="">Month</option>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Grad Year</label><input value={item.graduationYear} onChange={e => update(i, 'graduationYear', e.target.value)} className="input-field" placeholder="2025" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">GPA</label><input value={item.gpa} onChange={e => update(i, 'gpa', e.target.value)} className="input-field" placeholder="3.8" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Honors</label><input value={item.honorsAwards} onChange={e => update(i, 'honorsAwards', e.target.value)} className="input-field" placeholder="Dean's List" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Relevant Coursework</label><textarea value={item.relevantCoursework} onChange={e => update(i, 'relevantCoursework', e.target.value)} rows={2} className="input-field" placeholder="Data Structures, Algorithms..." /></div>
          </div>
        )}
      />
    </div>
  );
}

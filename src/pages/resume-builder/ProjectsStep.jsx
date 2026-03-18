import React, { useState } from 'react';
import { X } from 'lucide-react';
import { emptyProject } from '../../constants/resumeFields';
import RepeatableSection from '../../components/forms/RepeatableSection';

function MiniTagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('');
  const add = () => { if (input.trim()) { onChange([...tags, input.trim()]); setInput(''); } };
  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-1">{tags.map((t, i) => <span key={i} className="inline-flex items-center bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded">{t}<button type="button" onClick={() => onChange(tags.filter((_, j) => j !== i))} className="ml-1"><X className="h-3 w-3" /></button></span>)}</div>
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} className="input-field text-sm" placeholder={placeholder} />
    </div>
  );
}

export default function ProjectsStep({ data, onChange }) {
  const items = data || [];
  const add = () => onChange([...items, { ...emptyProject }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => { const n = [...items]; n[i] = { ...n[i], [field]: val }; onChange(n); };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-gray-900">Projects</h2><p className="text-sm text-gray-500 mt-1">Highlight key projects, especially if you're a fresh graduate.</p></div>
      <RepeatableSection items={items} onAdd={add} onRemove={remove} addButtonText="Add Project" maxItems={8}
        renderItem={(item, i) => (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label><input value={item.projectTitle} onChange={e => update(i, 'projectTitle', e.target.value)} className="input-field" placeholder="E-commerce Platform" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Institution / Company</label><input value={item.associatedInstitution} onChange={e => update(i, 'associatedInstitution', e.target.value)} className="input-field" placeholder="University of..." /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Description</label><textarea value={item.projectDescription} onChange={e => update(i, 'projectDescription', e.target.value)} rows={3} className="input-field" placeholder="Describe the project and your role..." /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Technologies Used</label><MiniTagInput tags={item.technologiesUsed || []} onChange={val => update(i, 'technologiesUsed', val)} placeholder="e.g. React, Python" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Methodologies</label><MiniTagInput tags={item.methodologiesUsed || []} onChange={val => update(i, 'methodologiesUsed', val)} placeholder="e.g. Agile, TDD" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label><textarea value={item.projectOutcome} onChange={e => update(i, 'projectOutcome', e.target.value)} rows={2} className="input-field" placeholder="What was the result or impact?" /></div>
          </div>
        )}
      />
    </div>
  );
}

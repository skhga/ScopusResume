import React from 'react';
import { emptyCertification } from '../../constants/resumeFields';
import RepeatableSection from '../../components/forms/RepeatableSection';

export default function CertificationsStep({ data, onChange }) {
  const items = data || [];
  const add = () => onChange([...items, { ...emptyCertification }]);
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i, field, val) => { const n = [...items]; n[i] = { ...n[i], [field]: val }; onChange(n); };

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-gray-900">Certifications & Licenses</h2><p className="text-sm text-gray-500 mt-1">Add any professional certifications you hold.</p></div>
      <RepeatableSection items={items} onAdd={add} onRemove={remove} addButtonText="Add Certification" maxItems={10}
        renderItem={(item, i) => (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Certification Name</label><input value={item.certificationName} onChange={e => update(i, 'certificationName', e.target.value)} className="input-field" placeholder="AWS Solutions Architect" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Issuing Body</label><input value={item.issuingBody} onChange={e => update(i, 'issuingBody', e.target.value)} className="input-field" placeholder="Amazon Web Services" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Date Obtained</label><input type="month" value={item.dateObtained} onChange={e => update(i, 'dateObtained', e.target.value)} className="input-field" /></div>
          </div>
        )}
      />
    </div>
  );
}

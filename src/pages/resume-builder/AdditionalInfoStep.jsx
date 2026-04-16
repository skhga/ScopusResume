import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { emptyVolunteerExperience, emptyPublication, emptyAward } from '../../constants/resumeFields';
import RepeatableSection from '../../components/forms/RepeatableSection';

function Section({ title, description, isOpen, onToggle, children }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 text-left"
      >
        <div>
          <span className="font-medium text-gray-900">{title}</span>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
        {isOpen ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
      </button>
      {isOpen && <div className="px-5 py-4 border-t border-gray-100">{children}</div>}
    </div>
  );
}

export default function AdditionalInfoStep({ data, onChange }) {
  const v = data || { volunteerExperience: [], publications: [], awards: [] };
  const [open, setOpen] = useState({ volunteer: false, publications: false, awards: false });
  const toggle = (key) => setOpen(prev => ({ ...prev, [key]: !prev[key] }));

  const u = (field, val) => onChange({ ...v, [field]: val });

  // Volunteer helpers
  const addVolunteer = () => u('volunteerExperience', [...v.volunteerExperience, { ...emptyVolunteerExperience }]);
  const removeVolunteer = (i) => u('volunteerExperience', v.volunteerExperience.filter((_, idx) => idx !== i));
  const updateVolunteer = (i, field, val) => {
    const n = [...v.volunteerExperience]; n[i] = { ...n[i], [field]: val }; u('volunteerExperience', n);
  };

  // Publication helpers
  const addPublication = () => u('publications', [...v.publications, { ...emptyPublication }]);
  const removePublication = (i) => u('publications', v.publications.filter((_, idx) => idx !== i));
  const updatePublication = (i, field, val) => {
    const n = [...v.publications]; n[i] = { ...n[i], [field]: val }; u('publications', n);
  };

  // Award helpers
  const addAward = () => u('awards', [...v.awards, { ...emptyAward }]);
  const removeAward = (i) => u('awards', v.awards.filter((_, idx) => idx !== i));
  const updateAward = (i, field, val) => {
    const n = [...v.awards]; n[i] = { ...n[i], [field]: val }; u('awards', n);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Additional Information</h2>
        <p className="text-sm text-gray-500 mt-1">Optional extras that strengthen your resume.</p>
      </div>

      <Section
        title="Volunteer Experience"
        description={v.volunteerExperience.length > 0 ? `${v.volunteerExperience.length} added` : 'Optional'}
        isOpen={open.volunteer}
        onToggle={() => toggle('volunteer')}
      >
        <RepeatableSection
          items={v.volunteerExperience}
          onAdd={addVolunteer}
          onRemove={removeVolunteer}
          addButtonText="Add Volunteer Experience"
          maxItems={5}
          renderItem={(item, i) => (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Organization *</label>
                  <input value={item.organizationName} onChange={e => updateVolunteer(i, 'organizationName', e.target.value)} className="input-field" placeholder="Red Cross" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <input value={item.role} onChange={e => updateVolunteer(i, 'role', e.target.value)} className="input-field" placeholder="Volunteer Coordinator" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="month" value={item.startDate} onChange={e => updateVolunteer(i, 'startDate', e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="month" value={item.endDate} onChange={e => updateVolunteer(i, 'endDate', e.target.value)} className="input-field" placeholder="Leave blank if ongoing" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={item.description} onChange={e => updateVolunteer(i, 'description', e.target.value)} rows={2} className="input-field" placeholder="What did you do?" />
              </div>
            </div>
          )}
        />
      </Section>

      <Section
        title="Publications"
        description={v.publications.length > 0 ? `${v.publications.length} added` : 'Optional'}
        isOpen={open.publications}
        onToggle={() => toggle('publications')}
      >
        <RepeatableSection
          items={v.publications}
          onAdd={addPublication}
          onRemove={removePublication}
          addButtonText="Add Publication"
          maxItems={10}
          renderItem={(item, i) => (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={item.publicationTitle} onChange={e => updatePublication(i, 'publicationTitle', e.target.value)} className="input-field" placeholder="Paper title" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Journal / Conference</label>
                  <input value={item.publicationName} onChange={e => updatePublication(i, 'publicationName', e.target.value)} className="input-field" placeholder="Nature, ICML..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <input value={item.year} onChange={e => updatePublication(i, 'year', e.target.value)} className="input-field" placeholder="2024" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DOI / URL (optional)</label>
                <input type="url" value={item.doiUrl} onChange={e => updatePublication(i, 'doiUrl', e.target.value)} className="input-field" placeholder="https://doi.org/..." />
              </div>
            </div>
          )}
        />
      </Section>

      <Section
        title="Awards & Honors"
        description={v.awards.length > 0 ? `${v.awards.length} added` : 'Optional'}
        isOpen={open.awards}
        onToggle={() => toggle('awards')}
      >
        <RepeatableSection
          items={v.awards}
          onAdd={addAward}
          onRemove={removeAward}
          addButtonText="Add Award"
          maxItems={10}
          renderItem={(item, i) => (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Award Name *</label>
                  <input value={item.awardName} onChange={e => updateAward(i, 'awardName', e.target.value)} className="input-field" placeholder="Dean's Award" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Awarding Body</label>
                  <input value={item.awardingBody} onChange={e => updateAward(i, 'awardingBody', e.target.value)} className="input-field" placeholder="University of..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Received</label>
                  <input type="month" value={item.dateReceived} onChange={e => updateAward(i, 'dateReceived', e.target.value)} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea value={item.description} onChange={e => updateAward(i, 'description', e.target.value)} rows={2} className="input-field" placeholder="Brief description..." />
              </div>
            </div>
          )}
        />
      </Section>
    </div>
  );
}

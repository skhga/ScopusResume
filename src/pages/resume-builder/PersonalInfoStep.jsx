import React from 'react';
import { COUNTRIES } from '../../utils/constants';

export default function PersonalInfoStep({ data, onChange }) {
  const v = data || {};
  const u = (field, val) => onChange({ ...v, [field]: val });
  const inp = (label, field, placeholder, type = 'text', required) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} value={v[field] || ''} onChange={e => u(field, e.target.value)} placeholder={placeholder} className="input-field" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold text-gray-900">Personal Information</h2><p className="text-sm text-gray-500 mt-1">This information appears at the top of your resume.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {inp('Full Name', 'fullName', 'John Doe', 'text', true)}
        {inp('Professional Email', 'email', 'john@example.com', 'email', true)}
        {inp('Phone Number', 'phone', '+1 (555) 000-0000', 'tel', true)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inp('City', 'city', 'San Francisco')}
        {inp('State / Province', 'state', 'California')}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {inp('LinkedIn URL', 'linkedinUrl', 'https://linkedin.com/in/johndoe', 'url')}
        {inp('Portfolio URL', 'portfolioUrl', 'https://johndoe.dev', 'url')}
      </div>
      <div className="max-w-sm">
        <label className="block text-sm font-medium text-gray-700 mb-1">Target Country/Region</label>
        <select value={v.targetCountry || ''} onChange={e => u('targetCountry', e.target.value)} className="input-field bg-white">
          <option value="">Select a country</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <p className="text-xs text-gray-400 mt-1">Formatting will be tailored for this market.</p>
      </div>
    </div>
  );
}

import React from 'react';

export default function ReviewOptimizeStep({ data, onChange, allData }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Review & Optimize</h2>
        <p className="text-sm text-gray-500 mt-1">ATS scoring and professional summary generation.</p>
      </div>
      <p className="text-gray-400 text-sm italic">Coming soon — ATS score analysis and AI summary generation.</p>
    </div>
  );
}

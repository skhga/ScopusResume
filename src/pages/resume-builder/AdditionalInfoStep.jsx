import React from 'react';

export default function AdditionalInfoStep({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Additional Information</h2>
        <p className="text-sm text-gray-500 mt-1">Volunteer experience, publications, and awards.</p>
      </div>
      <p className="text-gray-400 text-sm italic">Coming soon — this step will include volunteer experience, publications, and awards.</p>
    </div>
  );
}

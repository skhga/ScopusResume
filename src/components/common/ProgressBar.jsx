import React from 'react';

export default function ProgressBar({ value = 0, label, color = 'brand' }) {
  const colors = { brand: 'bg-brand-600', green: 'bg-green-500', red: 'bg-red-500', yellow: 'bg-yellow-500' };
  return (
    <div className="w-full">
      {label && <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">{label}</span><span className="font-medium">{value}%</span></div>}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-500 ${colors[color] || colors.brand}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

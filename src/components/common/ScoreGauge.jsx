import React from 'react';

export default function ScoreGauge({ score = 0, label = 'ATS Score', size = 'md' }) {
  const sizes = { sm: 80, md: 120, lg: 160 };
  const s = sizes[size]; const r = (s - 12) / 2; const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: s, height: s }}>
        <svg width={s} height={s} className="-rotate-90">
          <circle cx={s/2} cy={s/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle cx={s/2} cy={s/2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-700" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-500">/100</span>
        </div>
      </div>
      {label && <p className="mt-2 text-sm font-medium text-gray-600">{label}</p>}
    </div>
  );
}

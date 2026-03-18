import React from 'react';
import ScoreGauge from '../common/ScoreGauge';
import ProgressBar from '../common/ProgressBar';

export default function ATSScorePanel({ score = 0, breakdown = [] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">ATS Score</h3>
      <div className="flex justify-center mb-6 relative">
        <ScoreGauge score={score} size="lg" />
      </div>
      <div className="space-y-4">
        {breakdown.map((item, i) => (
          <div key={i}>
            <ProgressBar value={item.score || item.maxScore ? Math.round((item.score / (item.maxScore || 100)) * 100) : 0} label={item.category} color={item.score >= 70 ? 'green' : item.score >= 40 ? 'yellow' : 'red'} />
            {item.suggestions?.map((s, j) => <p key={j} className="text-xs text-gray-500 mt-1 ml-1">- {s}</p>)}
          </div>
        ))}
      </div>
    </div>
  );
}

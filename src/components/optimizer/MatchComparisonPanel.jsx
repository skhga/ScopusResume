import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Lightbulb, TrendingUp, Briefcase, GraduationCap, Target } from 'lucide-react';
import Card from '../common/Card';
import ScoreGauge from '../common/ScoreGauge';

function ScoreCard({ label, score, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
      <Icon className="h-5 w-5 text-brand-600" />
      <div className="flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{score}%</p>
      </div>
      <ScoreGauge score={score} size="sm" />
    </div>
  );
}

export default function MatchComparisonPanel({ result }) {
  if (!result) return null;

  return (
    <div className="space-y-5">
      {/* Overall Score */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Overall Match</p>
            <p className="text-xs text-gray-500">How well your resume matches this job</p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-bold text-brand-600">{result.overallMatch}%</span>
          </div>
        </div>
      </Card>

      {/* Score Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ScoreCard label="Skills" score={result.skillMatch || 0} icon={Target} />
        <ScoreCard label="Experience" score={result.experienceMatch || 0} icon={Briefcase} />
        <ScoreCard label="Education" score={result.educationMatch || 0} icon={GraduationCap} />
      </div>

      {/* Matched Skills */}
      {result.matchedSkills?.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h3 className="text-sm font-semibold text-gray-800">Matched Skills</h3>
            <span className="text-xs text-gray-400">({result.matchedSkills.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.matchedSkills.map((s, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                {s}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Missing Keywords */}
      {result.missingKeywords?.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-semibold text-gray-800">Missing Keywords</h3>
            <span className="text-xs text-gray-400">({result.missingKeywords.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(result.missingKeywords)].map((s, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                {s}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Gap Analysis */}
      {result.gapAnalysis?.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-semibold text-gray-800">Gap Analysis</h3>
          </div>
          <div className="space-y-2">
            {result.gapAnalysis.map((gap, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  gap.severity === 'high' ? 'border-red-200 bg-red-50' :
                  gap.severity === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                  'border-green-200 bg-green-50'
                }`}
              >
                <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                  gap.severity === 'high' ? 'bg-red-200 text-red-700' :
                  gap.severity === 'medium' ? 'bg-yellow-200 text-yellow-700' :
                  'bg-green-200 text-green-700'
                }`}>
                  {gap.severity}
                </span>
                <div>
                  <p className="text-xs font-medium text-gray-800">{gap.area}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{gap.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Suggestions */}
      {result.suggestions?.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            <h3 className="text-sm font-semibold text-gray-800">Suggestions</h3>
          </div>
          <ul className="space-y-1.5">
            {result.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-brand-500 mt-1 shrink-0" />
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

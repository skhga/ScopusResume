import React from 'react';
import { Building2, Star, Zap, Heart, TrendingUp, Tag } from 'lucide-react';
import Card from '../common/Card';

const severityColors = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

export default function JDParserPanel({ result }) {
  if (!result) return null;

  return (
    <div className="space-y-5">
      {/* Role Title */}
      {result.roleTitle && (
        <Card>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5 text-brand-600" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Role</p>
              <p className="text-lg font-bold text-gray-900">{result.roleTitle}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Seniority + Culture */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {result.senioritySignals?.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-gray-800">Seniority Signals</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.senioritySignals.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700">
                  {s}
                </span>
              ))}
            </div>
          </Card>
        )}

        {result.cultureHints?.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-brand-600" />
              <h3 className="text-sm font-semibold text-gray-800">Culture Hints</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.cultureHints.map((h, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700">
                  {h}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Skills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {result.requiredSkills?.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-yellow-500" />
              <h3 className="text-sm font-semibold text-gray-800">Required Skills</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.requiredSkills.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                  {s}
                </span>
              ))}
            </div>
          </Card>
        )}

        {result.preferredSkills?.length > 0 && (
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-800">Preferred Skills</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {result.preferredSkills.map((s, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {s}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Keyword Frequency */}
      {result.keywords?.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Tag className="h-4 w-4 text-brand-600" />
            <h3 className="text-sm font-semibold text-gray-800">Keyword Frequency</h3>
          </div>
          <div className="space-y-2">
            {result.keywords.map((kw, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 w-24 truncate">{kw.word}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${Math.min(100, (kw.count / Math.max(...result.keywords.map(k => k.count))) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-5 text-right">{kw.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

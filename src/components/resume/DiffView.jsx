import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

/**
 * DiffView — shows a list of tailored resume changes side-by-side.
 *
 * Props:
 *   diffs: [{section, original, tailored, reason}]
 *   onApply: (diff) => void  — called when user clicks "Apply" on a single diff
 *   onApplyAll: () => void   — called when user applies all
 */
export default function DiffView({ diffs = [], onApply, onApplyAll }) {
  const [applied, setApplied] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set(diffs.map((_, i) => i)));

  if (!diffs.length) return null;

  const handleApply = (diff, index) => {
    setApplied(prev => new Set([...prev, index]));
    onApply?.(diff, index);
  };

  const handleApplyAll = () => {
    setApplied(new Set(diffs.map((_, i) => i)));
    onApplyAll?.();
  };

  const toggle = (index) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const allApplied = applied.size === diffs.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-500">
          {diffs.length} change{diffs.length !== 1 ? 's' : ''} suggested
          {applied.size > 0 && ` · ${applied.size} applied`}
        </p>
        {!allApplied && onApplyAll && (
          <button
            onClick={handleApplyAll}
            className="text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Apply all
          </button>
        )}
      </div>

      {diffs.map((diff, index) => {
        const isApplied = applied.has(index);
        const isExpanded = expanded.has(index);

        return (
          <div
            key={index}
            className={`border rounded-xl overflow-hidden transition-colors ${
              isApplied ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-white'
            }`}
          >
            {/* Header */}
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-2 min-w-0">
                {isApplied && <Check className="h-4 w-4 text-green-600 shrink-0" />}
                <span className="text-sm font-semibold text-gray-800 truncate">{diff.section}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                {!isApplied && onApply && (
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); handleApply(diff, index); }}
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50"
                  >
                    Apply
                  </span>
                )}
                {isExpanded
                  ? <ChevronUp className="h-4 w-4 text-gray-400" />
                  : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </div>
            </button>

            {/* Body */}
            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mt-3 italic">{diff.reason}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Original */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase mb-1.5">Original</p>
                    <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {diff.original || <span className="italic text-gray-400">No original text</span>}
                    </div>
                  </div>

                  {/* Tailored */}
                  <div>
                    <p className="text-xs font-medium text-green-600 uppercase mb-1.5">Tailored</p>
                    <div className={`rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      isApplied
                        ? 'bg-green-100 text-green-800'
                        : 'bg-green-50 text-gray-700 border border-green-100'
                    }`}>
                      {diff.tailored}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

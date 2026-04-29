import React from 'react';
import { Check } from 'lucide-react';

export default function StepIndicator({ steps = [], currentStep = 0, maxStep = 0, onStepClick }) {
  return (
    <nav className="w-full overflow-x-auto">
      <ol className="flex items-center min-w-max">
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          const reachable = i <= maxStep;
          return (
            <li key={i} className={`flex items-center ${i < steps.length - 1 ? 'flex-1' : ''}`}>
              <button
                type="button"
                onClick={() => onStepClick && reachable && onStepClick(i)}
                className={`flex flex-col items-center ${onStepClick && reachable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium border-2 transition-colors ${done ? 'bg-brand-600 border-brand-600 text-white' : active ? 'border-brand-600 text-brand-600 bg-white' : 'border-gray-300 text-gray-400 bg-white'}`}>
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`mt-1 text-xs font-medium whitespace-nowrap ${active ? 'text-brand-600' : done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</span>
              </button>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-brand-600' : 'bg-gray-200'}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

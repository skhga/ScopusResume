import React from 'react';
import { Loader2, Check, X } from 'lucide-react';

export default function SaveIndicator({ status }) {
  if (status === 'idle') return null;
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
      status === 'saving' ? 'text-gray-400 bg-gray-50' :
      status === 'saved'  ? 'text-green-600 bg-green-50' :
                            'text-red-500 bg-red-50'
    }`}>
      {status === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" />Saving...</>}
      {status === 'saved'  && <><Check className="h-3 w-3" />Saved</>}
      {status === 'error'  && <><X className="h-3 w-3" />Save failed</>}
    </div>
  );
}

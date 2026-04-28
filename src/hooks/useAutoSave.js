import { useEffect, useRef, useState } from 'react';

/**
 * Auto-saves whenever `data` changes, with a 1-second debounce.
 * Skips the initial render. Calls saveFn(id, data) after the debounce.
 * Returns saveStatus: 'idle' | 'saving' | 'saved' | 'error'
 */
export function useAutoSave(resumeId, data, saveFn) {
  const [saveStatus, setSaveStatus] = useState('idle');
  const timerRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!resumeId || !data || !saveFn) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    setSaveStatus('saving');

    timerRef.current = setTimeout(async () => {
      try {
        await saveFn(resumeId, data);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, 1000);

    return () => clearTimeout(timerRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), resumeId]);

  return saveStatus;
}

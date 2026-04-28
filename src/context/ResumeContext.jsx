import React, { createContext, useState, useEffect, useCallback } from 'react';
import resumeService from '../services/resumeService';
import { useAuth } from '../hooks/useAuth';

export const ResumeContext = createContext(null);

export function ResumeProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [currentResume, setCurrentResumeState] = useState(null);
  const [loadingResumes, setLoadingResumes] = useState(false);

  const loadResumes = useCallback(async () => {
    if (!isAuthenticated) { setResumes([]); return; }
    setLoadingResumes(true);
    try {
      const data = await resumeService.getResumes();
      setResumes(data);
    } catch (err) {
      console.error('[ResumeContext] loadResumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { loadResumes(); }, [loadResumes]);

  const createResume = async (nameOrData) => {
    const name = typeof nameOrData === 'string'
      ? nameOrData
      : (nameOrData?.title || nameOrData?.name || 'Untitled Resume');

    const created = await resumeService.createResume(name);

    // If extra data was passed (e.g. from an import), merge it in
    let final = created;
    if (typeof nameOrData === 'object' && nameOrData !== null) {
      const { title: _t, name: _n, ...data } = nameOrData;
      if (Object.keys(data).length > 0) {
        final = await resumeService.updateResume(created.id, { ...created, ...data, name });
      }
    }

    setResumes(prev => [final, ...prev]);
    setCurrentResumeState(final);
    return final;
  };

  const updateResume = async (id, data) => {
    // Optimistic update — instant UI response
    const optimistic = { id, ...data, updatedAt: new Date().toISOString() };
    setResumes(prev => prev.map(r => r.id === id ? optimistic : r));
    if (currentResume?.id === id) setCurrentResumeState(optimistic);

    // Background sync to Supabase
    try {
      const saved = await resumeService.updateResume(id, data);
      setResumes(prev => prev.map(r => r.id === id ? saved : r));
      if (currentResume?.id === id) setCurrentResumeState(saved);
      return saved;
    } catch (err) {
      console.error('[ResumeContext] updateResume failed, reverting:', err);
      await loadResumes();
      return null;
    }
  };

  const duplicateResume = async (id) => {
    const copy = await resumeService.duplicateResume(id);
    setResumes(prev => [copy, ...prev]);
    return copy;
  };

  const deleteResume = async (id) => {
    // Optimistic remove
    setResumes(prev => prev.filter(r => r.id !== id));
    if (currentResume?.id === id) setCurrentResumeState(null);

    try {
      await resumeService.deleteResume(id);
    } catch (err) {
      console.error('[ResumeContext] deleteResume failed, reverting:', err);
      await loadResumes();
    }
  };

  const setCurrentResume = async (id) => {
    const local = resumes.find(r => r.id === id);
    if (local) { setCurrentResumeState(local); return; }
    const fetched = await resumeService.getResumeById(id);
    setCurrentResumeState(fetched);
  };

  const updateSection = (section, data) => {
    if (!currentResume) return;
    return updateResume(currentResume.id, { ...currentResume, [section]: data });
  };

  return (
    <ResumeContext.Provider value={{
      resumes, currentResume, loadingResumes,
      createResume, updateResume, deleteResume, duplicateResume,
      setCurrentResume, updateSection,
    }}>
      {children}
    </ResumeContext.Provider>
  );
}

import React, { createContext, useState, useEffect } from 'react';
import resumeService from '../services/resumeService';

export const ResumeContext = createContext(null);

export function ResumeProvider({ children }) {
  const [resumes, setResumes] = useState([]);
  const [currentResume, setCurrentResumeState] = useState(null);

  useEffect(() => { setResumes(resumeService.getResumes()); }, []);

  const createResume = (nameOrData) => {
    const name = typeof nameOrData === 'string' ? nameOrData : (nameOrData?.title || nameOrData?.name || 'Untitled Resume');
    const r = resumeService.createResume(name);
    if (typeof nameOrData === 'object' && nameOrData !== null) {
      const { title, name: _n, ...data } = nameOrData;
      resumeService.updateResume(r.id, data);
    }
    setResumes(resumeService.getResumes());
    const updated = resumeService.getResumeById(r.id);
    setCurrentResumeState(updated);
    return updated;
  };

  const updateResume = (id, data) => {
    const r = resumeService.updateResume(id, data);
    setResumes(resumeService.getResumes());
    if (currentResume?.id === id) setCurrentResumeState(r);
    return r;
  };

  const deleteResume = (id) => {
    resumeService.deleteResume(id);
    setResumes(resumeService.getResumes());
    if (currentResume?.id === id) setCurrentResumeState(null);
  };

  const setCurrentResume = (id) => {
    setCurrentResumeState(resumeService.getResumeById(id));
  };

  const updateSection = (section, data) => {
    if (!currentResume) return;
    const updated = { ...currentResume, [section]: data };
    updateResume(currentResume.id, updated);
  };

  return (
    <ResumeContext.Provider value={{
      resumes, currentResume,
      createResume, updateResume, deleteResume,
      setCurrentResume, updateSection,
    }}>
      {children}
    </ResumeContext.Provider>
  );
}

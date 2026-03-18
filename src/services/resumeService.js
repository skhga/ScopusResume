import { generateResumeId } from '../utils/formatters';
import { emptyResume } from '../constants/resumeFields';

const STORAGE_KEY = 'scopus_resumes';
const getAll = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const saveAll = (resumes) => localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));

const resumeService = {
  getResumes() { return getAll(); },
  getResumeById(id) { return getAll().find(r => r.id === id) || null; },
  createResume(name = 'Untitled Resume') {
    const resumes = getAll();
    const newResume = { ...emptyResume, id: generateResumeId(), name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    resumes.push(newResume);
    saveAll(resumes);
    return newResume;
  },
  updateResume(id, data) {
    const resumes = getAll();
    const idx = resumes.findIndex(r => r.id === id);
    if (idx === -1) return null;
    resumes[idx] = { ...resumes[idx], ...data, updatedAt: new Date().toISOString() };
    saveAll(resumes);
    return resumes[idx];
  },
  deleteResume(id) {
    saveAll(getAll().filter(r => r.id !== id));
  },
};
export default resumeService;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { STEP_LABELS } from '../../utils/constants';
import { useResume } from '../../hooks/useResume';
import Button from '../../components/common/Button';
import StepIndicator from '../../components/common/StepIndicator';
import PersonalInfoStep from './PersonalInfoStep';
import CareerObjectiveStep from './CareerObjectiveStep';
import EducationStep from './EducationStep';
import WorkExperienceStep from './WorkExperienceStep';
import SkillsStep from './SkillsStep';
import ProjectsStep from './ProjectsStep';
import CertificationsStep from './CertificationsStep';
import SummaryStep from './SummaryStep';

const STEP_KEYS = [
  'personalInfo',
  'careerObjective',
  'education',
  'workExperience',
  'skills',
  'projects',
  'certifications',
  'summary',
];

const STEP_COMPONENTS = [
  PersonalInfoStep,
  CareerObjectiveStep,
  EducationStep,
  WorkExperienceStep,
  SkillsStep,
  ProjectsStep,
  CertificationsStep,
  SummaryStep,
];

export default function ResumeBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentResume, createResume, updateResume, setCurrentResume, resumes } = useResume();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    personalInfo: {},
    careerObjective: {},
    education: [],
    workExperience: [],
    skills: { technicalSkills: [], programmingLanguages: [], toolsSoftware: [], languageSkills: [], domainSpecificSkills: [] },
    projects: [],
    certifications: [],
    summary: {},
  });

  useEffect(() => {
    if (id) {
      const existing = resumes.find(r => r.id === id);
      if (existing) {
        setCurrentResume(existing.id);
        setFormData({
          personalInfo: existing.personalInfo || {},
          careerObjective: existing.careerObjective || {},
          education: existing.education || [],
          workExperience: existing.workExperience || [],
          skills: existing.skills || { technicalSkills: [], programmingLanguages: [], toolsSoftware: [], languageSkills: [], domainSpecificSkills: [] },
          projects: existing.projects || [],
          certifications: existing.certifications || [],
          summary: existing.summary || {},
        });
      }
    }
  }, [id, resumes, setCurrentResume]);

  const handleSectionChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      if (currentResume?.id) {
        await updateResume(currentResume.id, formData);
      } else {
        const title = formData.personalInfo?.fullName
          ? `${formData.personalInfo.fullName}'s Resume`
          : 'Untitled Resume';
        const created = await createResume({ ...formData, title });
        navigate(`/app/builder/${created.id}`, { replace: true });
      }
    } finally {
      setSaving(false);
    }
  };

  const next = () => { save(); setStep(s => Math.min(s + 1, STEP_COMPONENTS.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const StepComponent = STEP_COMPONENTS[step];
  const stepKey = STEP_KEYS[step];

  return (
    <div className="page-container max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {currentResume ? 'Edit Resume' : 'Create Resume'}
        </h1>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={save} loading={saving}>
            <Save className="h-4 w-4 mr-1" />Save Draft
          </Button>
          {currentResume?.id && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/app/preview/${currentResume.id}`)}>
              <Eye className="h-4 w-4 mr-1" />Preview
            </Button>
          )}
        </div>
      </div>

      <StepIndicator steps={STEP_LABELS} currentStep={step} onStepClick={setStep} />

      <div className="card mt-6 p-6">
        {stepKey === 'summary' ? (
          <StepComponent
            data={formData[stepKey]}
            onChange={val => handleSectionChange(stepKey, val)}
            allData={formData}
          />
        ) : (
          <StepComponent
            data={formData[stepKey]}
            onChange={val => handleSectionChange(stepKey, val)}
          />
        )}
      </div>

      <div className="flex justify-between mt-6">
        <Button variant="secondary" onClick={prev} disabled={step === 0}>
          <ChevronLeft className="h-4 w-4 mr-1" />Previous
        </Button>
        {step < STEP_COMPONENTS.length - 1 ? (
          <Button onClick={next}>
            Next<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={() => { save(); navigate(currentResume?.id ? `/app/preview/${currentResume.id}` : '/app/dashboard'); }}>
            Finish & Preview
          </Button>
        )}
      </div>
    </div>
  );
}

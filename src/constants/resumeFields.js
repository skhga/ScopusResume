export const emptyPersonalInfo = {
  fullName: '', email: '', phone: '', city: '', state: '',
  linkedinUrl: '', portfolioUrl: '', targetCountry: '',
};

export const emptyCareerObjective = {
  targetJobTitle: '', targetIndustry: '', seniorityLevel: '',
  jobDescriptionText: '', jobDescriptionUrl: '',
};

export const emptyEducation = {
  institutionName: '', degreeType: '', fieldOfStudy: '',
  graduationMonth: '', graduationYear: '', currentlyEnrolled: false,
  gpa: '', honorsAwards: '', relevantCoursework: '', thesisTitle: '',
  displayOrder: 0,
};

export const emptyWorkExperience = {
  companyName: '', jobTitle: '', location: '', isRemote: false,
  startMonth: '', startYear: '', endMonth: '', endYear: '',
  isCurrentRole: false, jobDescriptionRaw: '', bulletPoints: [''],
  employmentGapExplanation: '',
};

export const emptySkills = {
  technicalSkills: [], programmingLanguages: [], toolsSoftware: [],
  languageSkills: [], // each entry: { name: '', proficiency: 'professional' }
  domainSpecificSkills: [],
};

export const emptyProject = {
  projectTitle: '', associatedInstitution: '', projectDescription: '',
  technologiesUsed: [], methodologiesUsed: [], projectOutcome: '',
};

export const emptyCertification = {
  certificationName: '', issuingBody: '', dateObtained: '',
};

export const emptySummary = {
  summaryText: '', aiGenerateSummary: false,
  resumeFormatType: 'chronological', resumeLength: 'one_page',
  aiRewriteBullets: true, aiKeywordInject: true, atsOptimize: true,
};

export const emptyVolunteerExperience = {
  organizationName: '', role: '', startDate: '', endDate: '', description: '',
};

export const emptyPublication = {
  publicationTitle: '', authors: [], publicationName: '', year: '', doiUrl: '',
};

export const emptyAward = {
  awardName: '', awardingBody: '', dateReceived: '', description: '',
};

export const emptyProfessionalSummary = {
  summaryText: '', isAiGenerated: false,
};

export const emptyResume = {
  id: '', name: 'Untitled Resume', createdAt: '', updatedAt: '',
  // Metadata (also stored as top-level Supabase columns)
  templateId: 'modern',
  atsScore: null,
  status: 'draft',
  currentStep: 1,
  // Builder steps
  personalInfo: { ...emptyPersonalInfo },
  careerObjective: { ...emptyCareerObjective },
  education: [],
  workExperience: [],
  skills: { ...emptySkills },
  projects: [],
  certifications: [],
  // Additional info (Step 6)
  volunteerExperience: [],
  publications: [],
  awards: [],
  // Review & Optimize (Step 7)
  professionalSummary: { ...emptyProfessionalSummary },
  summary: { ...emptySummary },
};

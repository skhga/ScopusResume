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
  gpa: '', honorsAwards: '', relevantCoursework: '',
};

export const emptyWorkExperience = {
  companyName: '', jobTitle: '', location: '', isRemote: false,
  startMonth: '', startYear: '', endMonth: '', endYear: '',
  isCurrentRole: false, jobDescriptionRaw: '', bulletPoints: [''],
  employmentGapExplanation: '',
};

export const emptySkills = {
  technicalSkills: [], programmingLanguages: [], toolsSoftware: [],
  languageSkills: [], domainSpecificSkills: [],
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

export const emptyResume = {
  id: '', name: 'Untitled Resume', createdAt: '', updatedAt: '',
  personalInfo: { ...emptyPersonalInfo },
  careerObjective: { ...emptyCareerObjective },
  education: [],
  workExperience: [],
  skills: { ...emptySkills },
  projects: [],
  certifications: [],
  summary: { ...emptySummary },
};

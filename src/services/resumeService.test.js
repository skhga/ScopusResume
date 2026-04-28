// src/services/resumeService.test.js
//
// Unit tests for the pure `assembleResumeFromNormalized` helper. The function
// has no Supabase dependencies, so we feed it plain objects matching the
// normalized table row shapes and assert the assembled resume.
//
// Project uses Jest via react-scripts; we follow the existing describe/it/expect
// style from src/utils/formatters.test.js.

import { assembleResumeFromNormalized } from './resumeService';

// ──────────────────────────────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────────────────────────────

function makeResumeRow(overrides = {}) {
  return {
    id: 'r1',
    name: 'Test Resume',
    created_at: '2026-04-01T00:00:00Z',
    updated_at: '2026-04-02T00:00:00Z',
    template_id: 'modern',
    ats_score: 87,
    status: 'draft',
    current_step: 3,
    last_exported_at: null,
    target_job_title: null,
    target_industry: null,
    seniority_level: null,
    job_description_text: null,
    job_description_url: null,
    resume_format: null,
    resume_length: null,
    data: {},
    ...overrides,
  };
}

const fullJsonbData = {
  personalInfo: {
    fullName: 'JSONB Person',
    email: 'jsonb@example.com',
    phone: '555-000-0000',
    city: 'Old City',
    state: 'OS',
    targetCountry: 'JX',
    linkedinUrl: 'https://linkedin.com/in/jsonb',
    portfolioUrl: 'https://jsonb.dev',
  },
  careerObjective: {
    targetJobTitle: 'JSONB Engineer',
    targetIndustry: 'tech',
    seniorityLevel: 'mid',
    jobDescriptionText: 'JD text',
    jobDescriptionUrl: '',
  },
  education: [
    { institutionName: 'JSONB University', degreeType: 'bs', fieldOfStudy: 'CS' },
  ],
  workExperience: [
    {
      companyName: 'JSONB Co',
      jobTitle: 'Engineer',
      bulletPoints: ['jsonb bullet 1', 'jsonb bullet 2'],
    },
  ],
  skills: {
    technicalSkills: ['jsonb-skill'],
    programmingLanguages: ['Python'],
    toolsSoftware: ['Git'],
    languageSkills: [{ name: 'English', proficiency: 'native' }],
    domainSpecificSkills: ['Healthcare'],
  },
  projects: [
    {
      projectTitle: 'JSONB Project',
      projectDescription: 'desc',
      technologiesUsed: ['React'],
      projectOutcome: 'shipped',
    },
  ],
  certifications: [
    { certificationName: 'JSONB Cert', issuingBody: 'Body', dateObtained: '2023-01-01' },
  ],
  volunteerExperience: [
    { organizationName: 'JSONB Org', role: 'Helper' },
  ],
  publications: [
    { publicationTitle: 'JSONB Paper', authors: ['A'], year: '2023' },
  ],
  awards: [
    { awardName: 'JSONB Award', awardingBody: 'Group' },
  ],
  professionalSummary: {
    summaryText: 'JSONB summary',
    isAiGenerated: false,
  },
};

// ──────────────────────────────────────────────────────────────────────
// 1. All sections present in normalized — uses normalized
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — all normalized', () => {
  it('uses normalized rows for every section, ignoring JSONB fallback', () => {
    const row = makeResumeRow({
      data: fullJsonbData,
      target_job_title: 'Normalized Engineer',
      target_industry: 'fintech',
      seniority_level: 'senior',
      job_description_text: 'normalized JD',
      job_description_url: 'https://jd.example.com',
      resume_format: 'hybrid',
      resume_length: 'two_page',
    });

    const wexpId = 'we-1';
    const result = assembleResumeFromNormalized(row, {
      personalInfo: {
        full_name: 'Normalized Person',
        professional_email: 'norm@example.com',
        phone_number: '555-111-2222',
        city: 'New City',
        state: 'NC',
        target_country_region: 'US',
        linkedin_url: 'https://linkedin.com/in/norm',
        portfolio_url: 'https://norm.dev',
      },
      education: [
        {
          institution_name: 'Normalized U',
          degree_type: 'ms',
          field_of_study: 'EE',
          graduation_month: 5,
          graduation_year: 2024,
          currently_enrolled: false,
          gpa: '3.85',
          honors_awards: 'cum laude',
          relevant_coursework: 'Signals',
          thesis_title: 't',
          display_order: 0,
        },
      ],
      workExperience: [
        {
          id: wexpId,
          company_name: 'Normalized Co',
          job_title: 'Senior Eng',
          location: 'Remote',
          is_remote: true,
          start_month: 1,
          start_year: 2022,
          end_month: null,
          end_year: null,
          is_current_role: true,
          job_description_raw: '',
          display_order: 0,
        },
      ],
      bulletsByExperienceId: {
        [wexpId]: [
          { raw_text: 'norm bullet a', is_using_ai: false, display_order: 0 },
          { raw_text: 'raw b', ai_text: 'ai b', is_using_ai: true, display_order: 1 },
        ],
      },
      skills: [
        { category: 'technical', skill_name: 'TypeScript', display_order: 0 },
        { category: 'programming', skill_name: 'Go', display_order: 1 },
        {
          category: 'language',
          skill_name: 'Spanish',
          proficiency_level: 'professional',
          display_order: 2,
        },
      ],
      projects: [
        {
          project_title: 'Norm Project',
          description: 'normalized description',
          technologies_used: ['React', 'TS'],
          outcome: 'launched',
          project_url: 'https://norm.example.com',
          display_order: 0,
        },
      ],
      certifications: [
        {
          certification_name: 'AWS SAA',
          issuing_body: 'AWS',
          date_obtained: '2024-02-15',
          credential_id: 'X1',
          display_order: 0,
        },
      ],
      volunteerExperience: [
        {
          organization_name: 'Norm Org',
          role: 'Mentor',
          start_date: '2022-01-01',
          end_date: '2023-01-01',
          description: 'desc',
          display_order: 0,
        },
      ],
      publications: [
        {
          publication_title: 'Norm Paper',
          authors: ['B', 'C'],
          publication_name: 'Journal',
          year: 2024,
          doi_url: 'https://doi/x',
          display_order: 0,
        },
      ],
      awards: [
        {
          award_name: 'Norm Award',
          awarding_body: 'Body',
          date_received: '2023-03-03',
          description: 'd',
          display_order: 0,
        },
      ],
      professionalSummary: {
        summary_text: 'Normalized summary',
        is_ai_generated: true,
      },
    });

    expect(result.personalInfo.fullName).toBe('Normalized Person');
    expect(result.careerObjective.targetJobTitle).toBe('Normalized Engineer');
    expect(result.summary.resumeFormatType).toBe('hybrid');
    expect(result.summary.resumeLength).toBe('two_page');
    expect(result.education).toHaveLength(1);
    expect(result.education[0].institutionName).toBe('Normalized U');
    expect(result.workExperience).toHaveLength(1);
    expect(result.workExperience[0].companyName).toBe('Normalized Co');
    expect(result.skills.technicalSkills).toEqual(['TypeScript']);
    expect(result.skills.programmingLanguages).toEqual(['Go']);
    expect(result.skills.languageSkills).toEqual([
      { name: 'Spanish', proficiency: 'professional' },
    ]);
    expect(result.projects[0].projectTitle).toBe('Norm Project');
    expect(result.certifications[0].certificationName).toBe('AWS SAA');
    expect(result.volunteerExperience[0].organizationName).toBe('Norm Org');
    expect(result.publications[0].publicationTitle).toBe('Norm Paper');
    expect(result.awards[0].awardName).toBe('Norm Award');
    expect(result.professionalSummary.summaryText).toBe('Normalized summary');
    expect(result.professionalSummary.isAiGenerated).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 2. All sections empty in normalized — falls back to JSONB
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — full JSONB fallback', () => {
  it('falls back to JSONB data for every section when normalized is empty', () => {
    const row = makeResumeRow({ data: fullJsonbData });
    const result = assembleResumeFromNormalized(row, {});

    expect(result.personalInfo.fullName).toBe('JSONB Person');
    expect(result.careerObjective.targetJobTitle).toBe('JSONB Engineer');
    expect(result.education[0].institutionName).toBe('JSONB University');
    expect(result.workExperience[0].companyName).toBe('JSONB Co');
    expect(result.workExperience[0].bulletPoints).toEqual([
      'jsonb bullet 1',
      'jsonb bullet 2',
    ]);
    expect(result.skills.technicalSkills).toEqual(['jsonb-skill']);
    expect(result.projects[0].projectTitle).toBe('JSONB Project');
    expect(result.certifications[0].certificationName).toBe('JSONB Cert');
    expect(result.volunteerExperience[0].organizationName).toBe('JSONB Org');
    expect(result.publications[0].publicationTitle).toBe('JSONB Paper');
    expect(result.awards[0].awardName).toBe('JSONB Award');
    expect(result.professionalSummary.summaryText).toBe('JSONB summary');
  });
});

// ──────────────────────────────────────────────────────────────────────
// 3. Mixed — normalized education + JSONB skills
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — per-section mixed fallback', () => {
  it('uses normalized education while falling back to JSONB skills', () => {
    const row = makeResumeRow({ data: fullJsonbData });

    const result = assembleResumeFromNormalized(row, {
      education: [
        {
          institution_name: 'Mixed U',
          degree_type: 'phd',
          field_of_study: 'Math',
          display_order: 0,
        },
      ],
      // skills intentionally omitted → JSONB fallback
    });

    // Normalized education
    expect(result.education).toHaveLength(1);
    expect(result.education[0].institutionName).toBe('Mixed U');
    expect(result.education[0].degreeType).toBe('phd');

    // JSONB skills
    expect(result.skills.technicalSkills).toEqual(['jsonb-skill']);
    expect(result.skills.programmingLanguages).toEqual(['Python']);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 4. Empty resume — both stores empty
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — empty resume', () => {
  it('returns empty defaults when both normalized and JSONB are empty', () => {
    const row = makeResumeRow({ data: {} });
    const result = assembleResumeFromNormalized(row, {});

    expect(result.id).toBe('r1');
    expect(result.personalInfo.fullName).toBe('');
    expect(result.careerObjective.targetJobTitle).toBe('');
    expect(result.education).toEqual([]);
    expect(result.workExperience).toEqual([]);
    expect(result.skills.technicalSkills).toEqual([]);
    expect(result.skills.languageSkills).toEqual([]);
    expect(result.projects).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.volunteerExperience).toEqual([]);
    expect(result.publications).toEqual([]);
    expect(result.awards).toEqual([]);
    expect(result.professionalSummary.summaryText).toBe('');
  });
});

// ──────────────────────────────────────────────────────────────────────
// 5. Bullets: each work_experience row has correct bullet count
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — bullet point assembly', () => {
  it('groups bullets correctly per work experience row, sorted by display_order', () => {
    const row = makeResumeRow();
    const result = assembleResumeFromNormalized(row, {
      workExperience: [
        {
          id: 'job-a',
          company_name: 'A Inc',
          job_title: 'Engineer',
          display_order: 0,
        },
        {
          id: 'job-b',
          company_name: 'B Inc',
          job_title: 'Senior Eng',
          display_order: 1,
        },
      ],
      bulletsByExperienceId: {
        'job-a': [
          { raw_text: 'a-second', is_using_ai: false, display_order: 1 },
          { raw_text: 'a-first', is_using_ai: false, display_order: 0 },
        ],
        'job-b': [
          { raw_text: 'b-only', is_using_ai: false, display_order: 0 },
          {
            raw_text: 'b-raw',
            ai_text: 'b-ai-version',
            is_using_ai: true,
            display_order: 1,
          },
        ],
      },
    });

    expect(result.workExperience).toHaveLength(2);
    expect(result.workExperience[0].companyName).toBe('A Inc');
    expect(result.workExperience[0].bulletPoints).toEqual(['a-first', 'a-second']);
    expect(result.workExperience[1].companyName).toBe('B Inc');
    // Second bullet uses ai_text because is_using_ai === true and ai_text present.
    expect(result.workExperience[1].bulletPoints).toEqual(['b-only', 'b-ai-version']);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 6. Skills: properly groups by category back into the object shape
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — skill category grouping', () => {
  it('regroups normalized skill rows into the categorized object shape', () => {
    const row = makeResumeRow();
    const result = assembleResumeFromNormalized(row, {
      skills: [
        { category: 'technical', skill_name: 'React', display_order: 0 },
        { category: 'technical', skill_name: 'Node', display_order: 1 },
        { category: 'programming', skill_name: 'JavaScript', display_order: 2 },
        { category: 'tools', skill_name: 'Docker', display_order: 3 },
        { category: 'domain', skill_name: 'Fintech', display_order: 4 },
        {
          category: 'language',
          skill_name: 'French',
          proficiency_level: 'conversational',
          display_order: 5,
        },
        {
          category: 'language',
          skill_name: 'German',
          proficiency_level: 'basic',
          display_order: 6,
        },
      ],
    });

    expect(result.skills.technicalSkills).toEqual(['React', 'Node']);
    expect(result.skills.programmingLanguages).toEqual(['JavaScript']);
    expect(result.skills.toolsSoftware).toEqual(['Docker']);
    expect(result.skills.domainSpecificSkills).toEqual(['Fintech']);
    expect(result.skills.languageSkills).toEqual([
      { name: 'French', proficiency: 'conversational' },
      { name: 'German', proficiency: 'basic' },
    ]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 7. Projects: institution prefix correctly extracted
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — project institution prefix', () => {
  it('extracts [Institution] prefix from description into associatedInstitution', () => {
    const row = makeResumeRow();
    const result = assembleResumeFromNormalized(row, {
      projects: [
        {
          project_title: 'With Institution',
          description: '[MIT] Built a thing for class',
          technologies_used: ['Python'],
          outcome: 'A grade',
          project_url: 'https://mit.edu/proj',
          display_order: 0,
        },
        {
          project_title: 'No Institution',
          description: 'Just a side project',
          technologies_used: [],
          outcome: '',
          project_url: '',
          display_order: 1,
        },
      ],
    });

    expect(result.projects[0].associatedInstitution).toBe('MIT');
    expect(result.projects[0].projectDescription).toBe('Built a thing for class');
    expect(result.projects[0].projectTitle).toBe('With Institution');

    expect(result.projects[1].associatedInstitution).toBe('');
    expect(result.projects[1].projectDescription).toBe('Just a side project');
  });
});

// ──────────────────────────────────────────────────────────────────────
// 8. Personal info column-name → camelCase conversion
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — personal info field mapping', () => {
  it('maps every personal_info column to its camelCase app field', () => {
    const row = makeResumeRow();
    const result = assembleResumeFromNormalized(row, {
      personalInfo: {
        full_name: 'Jane Doe',
        professional_email: 'jane@doe.com',
        phone_number: '+1-555-0100',
        city: 'Austin',
        state: 'TX',
        target_country_region: 'United States',
        linkedin_url: 'https://linkedin.com/in/jane',
        portfolio_url: 'https://janedoe.dev',
      },
    });

    expect(result.personalInfo).toEqual({
      fullName: 'Jane Doe',
      email: 'jane@doe.com',
      phone: '+1-555-0100',
      city: 'Austin',
      state: 'TX',
      targetCountry: 'United States',
      linkedinUrl: 'https://linkedin.com/in/jane',
      portfolioUrl: 'https://janedoe.dev',
    });
  });
});

// src/services/resumeService.test.js
//
// Unit tests for the pure `assembleResumeFromNormalized` helper plus the
// public service surface (createResume / updateResume / duplicateResume).
//
// Phase 5 (normalized-only) note: the JSONB `resumes.data` column is gone, so
// every assembly path uses normalized rows or returns empty defaults. There is
// no JSONB fallback or rollback to test.
//
// Project uses Jest via react-scripts; we follow the existing describe/it/expect
// style from src/utils/formatters.test.js.

// ──────────────────────────────────────────────────────────────────────
// Supabase mock setup — must come BEFORE the import of resumeService so
// jest.mock is hoisted properly. Each describe block that mutates the mock
// resets it in beforeEach.
// ──────────────────────────────────────────────────────────────────────

// A recording mock that returns a fluent chainable object terminating in a
// thenable. We track every call by table+method so tests can assert against it.
let __dbCalls = [];
let __selectResult = null; // overridable per-test for `.select(...).single()` etc.

function makeChain(table, method, args) {
  __dbCalls.push({ table, method, args });
  // Default resolved value for terminal awaits / chain ends.
  const terminal = { data: __selectResult?.[table]?.[method] ?? [], error: null };
  // Build a thenable that also exposes more chain methods.
  const chain = {
    select: jest.fn((...a) => {
      __dbCalls.push({ table, method: 'select', args: a });
      return chain;
    }),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    single: jest.fn(async () => ({
      data:
        __selectResult?.[table]?.single ??
        (table === 'resumes'
          ? {
              id: 'r-new',
              name: 'X',
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
              template_id: 'modern',
              ats_score: null,
              status: 'draft',
              current_step: 1,
              last_exported_at: null,
              target_job_title: null,
              target_industry: null,
              seniority_level: null,
              job_description_text: null,
              job_description_url: null,
              resume_format: null,
              resume_length: null,
            }
          : {}),
      error: null,
    })),
    maybeSingle: jest.fn(async () => ({
      data: __selectResult?.[table]?.maybeSingle ?? null,
      error: null,
    })),
    then: (resolve) => Promise.resolve(terminal).then(resolve),
  };
  return chain;
}

const mockSupabase = {
  auth: {
    getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })),
  },
  from: jest.fn((table) => ({
    select: jest.fn((...args) => makeChain(table, 'select', args)),
    insert: jest.fn((...args) => makeChain(table, 'insert', args)),
    update: jest.fn((...args) => makeChain(table, 'update', args)),
    delete: jest.fn((...args) => makeChain(table, 'delete', args)),
    upsert: jest.fn((...args) => makeChain(table, 'upsert', args)),
  })),
};

jest.mock('../lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

import resumeService, { assembleResumeFromNormalized } from './resumeService';

function resetDbMock() {
  __dbCalls = [];
  __selectResult = null;
  mockSupabase.from.mockClear();
  mockSupabase.auth.getUser.mockClear();
}

// Convenience: did we hit `table` with `method` at least once?
function calledWith(table, method) {
  return __dbCalls.some((c) => c.table === table && c.method === method);
}

// Convenience: get all calls for a (table, method)
function callsFor(table, method) {
  return __dbCalls.filter((c) => c.table === table && c.method === method);
}

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
    ...overrides,
  };
}

// ──────────────────────────────────────────────────────────────────────
// 1. All sections present in normalized — assembled correctly
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — all normalized', () => {
  it('uses normalized rows for every section', () => {
    const row = makeResumeRow({
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
// 2. Empty resume — both stores empty (Phase 5: there is no JSONB store)
// ──────────────────────────────────────────────────────────────────────

describe('assembleResumeFromNormalized — empty resume', () => {
  it('returns empty defaults when no normalized rows are passed', () => {
    const row = makeResumeRow();
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

  it('returns empty defaults when childRowsBySection is omitted entirely', () => {
    const row = makeResumeRow();
    const result = assembleResumeFromNormalized(row);
    expect(result.education).toEqual([]);
    expect(result.skills.technicalSkills).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// 3. Bullets: each work_experience row has correct bullet count
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
// 4. Skills: properly groups by category back into the object shape
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
// 5. Projects: institution prefix correctly extracted
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
// 6. Personal info column-name → camelCase conversion
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

// ──────────────────────────────────────────────────────────────────────
// Phase 5: normalized-only writes for createResume / updateResume / duplicateResume
// ──────────────────────────────────────────────────────────────────────

describe('resumeService.createResume — normalized-only', () => {
  beforeEach(resetDbMock);

  it('inserts a resume row WITHOUT a JSONB data field, then seeds 1:1 child rows', async () => {
    const result = await resumeService.createResume('My Resume');

    expect(calledWith('resumes', 'insert')).toBe(true);

    // Phase 5 invariant: no `data` key in the parent INSERT payload.
    const parentInsert = callsFor('resumes', 'insert')[0];
    const payload = parentInsert.args[0];
    expect(payload).toEqual(
      expect.objectContaining({
        name: 'My Resume',
        template_id: 'modern',
        status: 'draft',
        current_step: 1,
      })
    );
    expect(Object.prototype.hasOwnProperty.call(payload, 'data')).toBe(false);

    // Seeds use upsert(onConflict: resume_id) so re-runs are safe.
    expect(calledWith('personal_info', 'upsert')).toBe(true);
    expect(calledWith('professional_summary', 'upsert')).toBe(true);

    const piUp = callsFor('personal_info', 'upsert')[0];
    expect(piUp.args[0]).toEqual(expect.objectContaining({ resume_id: 'r-new' }));
    expect(piUp.args[1]).toEqual(
      expect.objectContaining({ onConflict: 'resume_id' })
    );
    const psUp = callsFor('professional_summary', 'upsert')[0];
    expect(psUp.args[0]).toEqual(expect.objectContaining({ resume_id: 'r-new' }));
    expect(psUp.args[1]).toEqual(
      expect.objectContaining({ onConflict: 'resume_id' })
    );

    // Returned shape uses the assembler — top-level fields come from row.
    expect(result.id).toBe('r-new');
  });

  it('rolls back the parent resume row when seeds fail', async () => {
    // Make personal_info upsert fail by intercepting the from() chain.
    const realFrom = mockSupabase.from;
    mockSupabase.from = jest.fn((table) => {
      const base = realFrom(table);
      if (table === 'personal_info') {
        base.upsert = jest.fn((...a) => {
          __dbCalls.push({ table, method: 'upsert', args: a });
          return {
            then: (r) =>
              Promise.resolve({ data: null, error: { message: 'rls denied' } }).then(r),
          };
        });
      }
      return base;
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(resumeService.createResume('Doomed')).rejects.toThrow(
      /personal_info_seed/
    );

    // Parent resume row should be DELETEd as rollback.
    const resumeDeletes = callsFor('resumes', 'delete');
    expect(resumeDeletes.length).toBeGreaterThanOrEqual(1);

    errSpy.mockRestore();
    mockSupabase.from = realFrom;
  });
});

describe('resumeService.updateResume — normalized-only', () => {
  beforeEach(resetDbMock);

  it('UPDATEs the resumes row and writes per-section normalized tables', async () => {
    // Make work_experience insert.select() return concrete IDs so we can
    // verify bullet_points carries the right experience_id linkage.
    const realFrom = mockSupabase.from;
    mockSupabase.from = jest.fn((table) => {
      const base = realFrom(table);
      if (table === 'work_experience') {
        base.insert = jest.fn((...a) => {
          __dbCalls.push({ table, method: 'insert', args: a });
          return {
            select: jest.fn(() => ({
              then: (r) =>
                Promise.resolve({
                  data: [{ id: 'wexp-A' }, { id: 'wexp-B' }],
                  error: null,
                }).then(r),
            })),
            then: (r) =>
              Promise.resolve({
                data: [{ id: 'wexp-A' }, { id: 'wexp-B' }],
                error: null,
              }).then(r),
          };
        });
      }
      return base;
    });

    const updates = {
      personalInfo: { fullName: 'Norm', email: 'n@x.com' },
      careerObjective: { targetJobTitle: 'Eng', seniorityLevel: 'mid' },
      summary: { resumeFormatType: 'hybrid', resumeLength: 'two_page' },
      education: [
        { institutionName: 'X U', degreeType: 'bs', graduationYear: '2023' },
        { institutionName: 'Y Inst', degreeType: 'ms', graduationYear: '2025' },
      ],
      workExperience: [
        { companyName: 'Co A', jobTitle: 'Dev', bulletPoints: ['a-1', 'a-2'] },
        { companyName: 'Co B', jobTitle: 'Sr Dev', bulletPoints: ['b-1'] },
      ],
      skills: {
        technicalSkills: ['React', 'Postgres'],
        programmingLanguages: ['TS'],
        languageSkills: [{ name: 'French', proficiency: 'fluent' }],
      },
      projects: [{ projectTitle: 'P1' }],
      certifications: [{ certificationName: 'C1', issuingBody: 'B' }],
      volunteerExperience: [{ organizationName: 'O' }],
      publications: [{ publicationTitle: 'P', authors: ['A'] }],
      awards: [{ awardName: 'A' }],
      professionalSummary: { summaryText: 'My summary', isAiGenerated: true },
    };

    await resumeService.updateResume('r-1', updates);

    // Resumes UPDATE happens first (with metadata cols folded in).
    expect(calledWith('resumes', 'update')).toBe(true);

    // Phase 5 invariant: parent UPDATE must NOT include a `data` JSONB key.
    const parentPatch = callsFor('resumes', 'update')[0].args[0];
    expect(Object.prototype.hasOwnProperty.call(parentPatch, 'data')).toBe(false);

    // Each per-section table is touched.
    expect(calledWith('personal_info', 'upsert')).toBe(true);
    expect(calledWith('education', 'delete')).toBe(true);
    expect(calledWith('education', 'insert')).toBe(true);
    expect(calledWith('work_experience', 'delete')).toBe(true);
    expect(calledWith('work_experience', 'insert')).toBe(true);
    expect(calledWith('skills', 'delete')).toBe(true);
    expect(calledWith('skills', 'insert')).toBe(true);
    expect(calledWith('projects', 'delete')).toBe(true);
    expect(calledWith('projects', 'insert')).toBe(true);
    expect(calledWith('certifications', 'delete')).toBe(true);
    expect(calledWith('certifications', 'insert')).toBe(true);
    expect(calledWith('volunteer_experience', 'delete')).toBe(true);
    expect(calledWith('volunteer_experience', 'insert')).toBe(true);
    expect(calledWith('publications', 'delete')).toBe(true);
    expect(calledWith('publications', 'insert')).toBe(true);
    expect(calledWith('awards', 'delete')).toBe(true);
    expect(calledWith('awards', 'insert')).toBe(true);
    expect(calledWith('professional_summary', 'upsert')).toBe(true);

    // ── payload-shape assertions for 3 sections ─────────────────────────
    // (1) education: column names + values + display_order ascending.
    const eduIns = callsFor('education', 'insert')[0].args[0];
    expect(Array.isArray(eduIns)).toBe(true);
    expect(eduIns).toHaveLength(2);
    expect(eduIns[0]).toEqual(
      expect.objectContaining({
        resume_id: 'r-1',
        institution_name: 'X U',
        degree_type: 'bs',
        graduation_year: 2023,
        display_order: 0,
      })
    );
    expect(eduIns[1]).toEqual(
      expect.objectContaining({
        institution_name: 'Y Inst',
        degree_type: 'ms',
        graduation_year: 2025,
        display_order: 1,
      })
    );

    // (2) work_experience: payload + bullet_points referencing returned IDs.
    const wexpIns = callsFor('work_experience', 'insert')[0].args[0];
    expect(wexpIns).toHaveLength(2);
    expect(wexpIns[0]).toEqual(
      expect.objectContaining({
        resume_id: 'r-1',
        company_name: 'Co A',
        job_title: 'Dev',
        display_order: 0,
      })
    );
    expect(wexpIns[1]).toEqual(
      expect.objectContaining({
        company_name: 'Co B',
        display_order: 1,
      })
    );

    // bullet_points must be linked to the IDs returned from the work_experience
    // insert (wexp-A, wexp-B) and ordered correctly.
    const bulletIns = callsFor('bullet_points', 'insert')[0].args[0];
    expect(bulletIns).toEqual([
      expect.objectContaining({
        experience_id: 'wexp-A',
        raw_text: 'a-1',
        display_order: 0,
      }),
      expect.objectContaining({
        experience_id: 'wexp-A',
        raw_text: 'a-2',
        display_order: 1,
      }),
      expect.objectContaining({
        experience_id: 'wexp-B',
        raw_text: 'b-1',
        display_order: 0,
      }),
    ]);

    // (3) skills: category mapping + ordered display_order across categories.
    const skillsIns = callsFor('skills', 'insert')[0].args[0];
    // Two technical, one programming, one language → 4 rows total.
    expect(skillsIns).toHaveLength(4);
    expect(skillsIns[0]).toEqual(
      expect.objectContaining({
        resume_id: 'r-1',
        category: 'technical',
        skill_name: 'React',
        display_order: 0,
      })
    );
    expect(skillsIns[1]).toEqual(
      expect.objectContaining({ category: 'technical', skill_name: 'Postgres', display_order: 1 })
    );
    expect(skillsIns[2]).toEqual(
      expect.objectContaining({ category: 'programming', skill_name: 'TS', display_order: 2 })
    );
    expect(skillsIns[3]).toEqual(
      expect.objectContaining({
        category: 'language',
        skill_name: 'French',
        proficiency_level: 'fluent',
        display_order: 3,
      })
    );

    // (4) The parent resumes UPDATE should have folded in the careerObjective
    // metadata cols (target_job_title, seniority_level) and summary cols.
    expect(parentPatch).toEqual(
      expect.objectContaining({
        target_job_title: 'Eng',
        seniority_level: 'mid',
        resume_format: 'hybrid',
        resume_length: 'two_page',
      })
    );

    mockSupabase.from = realFrom;
  });

  it('updates only metadata cols when no sections are present', async () => {
    await resumeService.updateResume('r-1', { name: 'Renamed' });

    // Parent UPDATE should still fire.
    expect(calledWith('resumes', 'update')).toBe(true);
    const patch = callsFor('resumes', 'update')[0].args[0];
    expect(patch).toEqual({ name: 'Renamed' });
    // No `data` key on the parent patch — JSONB is gone.
    expect(Object.prototype.hasOwnProperty.call(patch, 'data')).toBe(false);

    // Per-section tables should NOT be touched (no DELETE-everything bug).
    expect(calledWith('education', 'delete')).toBe(false);
    expect(calledWith('work_experience', 'delete')).toBe(false);
    expect(calledWith('skills', 'delete')).toBe(false);
    expect(calledWith('projects', 'delete')).toBe(false);
    expect(calledWith('certifications', 'delete')).toBe(false);
    expect(calledWith('volunteer_experience', 'delete')).toBe(false);
    expect(calledWith('publications', 'delete')).toBe(false);
    expect(calledWith('awards', 'delete')).toBe(false);
    expect(calledWith('personal_info', 'upsert')).toBe(false);
    expect(calledWith('professional_summary', 'upsert')).toBe(false);
  });

  it('skips a section when undefined; does not accidentally DELETE everything', async () => {
    // Only education present — work_experience should NOT be DELETEd.
    await resumeService.updateResume('r-1', {
      education: [{ institutionName: 'OnlyEdu' }],
    });

    expect(calledWith('education', 'delete')).toBe(true);
    expect(calledWith('education', 'insert')).toBe(true);
    expect(calledWith('work_experience', 'delete')).toBe(false);
    expect(calledWith('skills', 'delete')).toBe(false);
  });

  it('handles empty arrays as "user cleared" — DELETE only, no INSERT', async () => {
    await resumeService.updateResume('r-1', {
      education: [],
      projects: [],
    });

    // DELETE should fire for both...
    expect(calledWith('education', 'delete')).toBe(true);
    expect(calledWith('projects', 'delete')).toBe(true);
    // ...but no INSERT (nothing to insert).
    expect(calledWith('education', 'insert')).toBe(false);
    expect(calledWith('projects', 'insert')).toBe(false);
  });

  it('reads supports both top-level and additionalInfo paths for volunteer/pubs/awards', async () => {
    await resumeService.updateResume('r-1', {
      additionalInfo: {
        volunteerExperience: [{ organizationName: 'NestedOrg' }],
        publications: [{ publicationTitle: 'NestedPub' }],
        awards: [{ awardName: 'NestedAward' }],
      },
    });

    expect(calledWith('volunteer_experience', 'delete')).toBe(true);
    expect(calledWith('volunteer_experience', 'insert')).toBe(true);
    expect(calledWith('publications', 'delete')).toBe(true);
    expect(calledWith('publications', 'insert')).toBe(true);
    expect(calledWith('awards', 'delete')).toBe(true);
    expect(calledWith('awards', 'insert')).toBe(true);

    // The actual insert payload should reflect the nested data.
    const volIns = callsFor('volunteer_experience', 'insert')[0];
    expect(volIns.args[0][0]).toEqual(
      expect.objectContaining({ organization_name: 'NestedOrg' })
    );
  });

  it('throws an aggregated error if a normalized write fails', async () => {
    // Make `skills` insert fail by intercepting the chain for that table only.
    const realFrom = mockSupabase.from;
    mockSupabase.from = jest.fn((table) => {
      const base = realFrom(table);
      if (table === 'skills') {
        base.insert = jest.fn((...a) => {
          __dbCalls.push({ table, method: 'insert', args: a });
          return {
            select: jest.fn(() => ({
              then: (r) =>
                Promise.resolve({ data: null, error: { message: 'boom' } }).then(r),
            })),
            then: (r) =>
              Promise.resolve({ data: null, error: { message: 'boom' } }).then(r),
          };
        });
      }
      return base;
    });
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // A per-section failure aggregates and rethrows so the outer caller sees
    // a save error rather than silent corruption.
    await expect(
      resumeService.updateResume('r-1', {
        skills: { technicalSkills: ['Bad'] },
        personalInfo: { fullName: 'Should still write' },
      })
    ).rejects.toThrow(/Normalized writes failed.*skills/);

    // personal_info should still have been upserted (we run all sections then
    // aggregate failures at the end).
    expect(calledWith('personal_info', 'upsert')).toBe(true);
    expect(errSpy).toHaveBeenCalled();

    errSpy.mockRestore();
    mockSupabase.from = realFrom;
  });
});

describe('resumeService.duplicateResume — normalized-only', () => {
  beforeEach(resetDbMock);

  it('inserts a new resume row WITHOUT a JSONB data field and copies child rows via updateResume', async () => {
    // Configure the parent .single() lookup so getResumeById returns something.
    __selectResult = {
      resumes: {
        single: {
          id: 'r-src',
          name: 'Original',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-02T00:00:00Z',
          template_id: 'modern',
          ats_score: null,
          status: 'draft',
          current_step: 1,
          last_exported_at: null,
          target_job_title: null,
          target_industry: null,
          seniority_level: null,
          job_description_text: null,
          job_description_url: null,
          resume_format: null,
          resume_length: null,
        },
      },
    };

    const result = await resumeService.duplicateResume('r-src');

    // INSERT into resumes (the new copy)
    const inserts = callsFor('resumes', 'insert');
    expect(inserts.length).toBeGreaterThanOrEqual(1);

    // Phase 5 invariant: no `data` key on the parent INSERT payload.
    const parentInsertPayload = inserts[0].args[0];
    expect(Object.prototype.hasOwnProperty.call(parentInsertPayload, 'data')).toBe(
      false
    );
    expect(parentInsertPayload).toEqual(
      expect.objectContaining({
        name: 'Original (Copy)',
        template_id: 'modern',
      })
    );

    // The dual-write (via updateResume on the new id) should have triggered
    // child writes. Even when source sections are empty (the normalized rows
    // returned for the source resume are empty), updateResume still issues
    // DELETE-then-INSERT for each section because the assembled `resumeData`
    // payload includes every section key (with empty values).
    expect(calledWith('personal_info', 'upsert')).toBe(true);
    expect(calledWith('education', 'delete')).toBe(true);

    // The returned object exists.
    expect(result).toBeTruthy();
  });
});

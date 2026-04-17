import { resumeToText } from './resumeToText';

describe('resumeToText', () => {
  it('returns empty string for null input', () => {
    expect(resumeToText(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(resumeToText(undefined)).toBe('');
  });

  it('returns empty string for empty object', () => {
    expect(resumeToText({})).toBe('');
  });

  it('handles empty arrays without throwing', () => {
    expect(() => resumeToText({ workExperience: [] })).not.toThrow();
  });

  it('renders full name in output', () => {
    const result = resumeToText({ personalInfo: { fullName: 'Jane Doe' } });
    expect(result).toContain('Jane Doe');
  });

  it('preserves international characters', () => {
    const result = resumeToText({ personalInfo: { fullName: 'Wei Zhang' } });
    expect(result).toContain('Wei Zhang');
  });

  it('preserves Arabic characters', () => {
    const result = resumeToText({ personalInfo: { fullName: 'محمد علي' } });
    expect(result).toContain('محمد علي');
  });

  it('preserves accented Latin characters', () => {
    const result = resumeToText({ personalInfo: { fullName: 'José García' } });
    expect(result).toContain('José García');
  });

  it('includes all contact fields', () => {
    const result = resumeToText({
      personalInfo: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '555-1234',
        city: 'San Francisco',
        state: 'CA',
        linkedinUrl: 'linkedin.com/in/jane',
      },
    });
    expect(result).toContain('jane@example.com');
    expect(result).toContain('555-1234');
    expect(result).toContain('San Francisco, CA');
    expect(result).toContain('linkedin.com/in/jane');
  });

  it('includes professional summary', () => {
    const result = resumeToText({
      summary: { summaryText: 'Experienced engineer.' },
    });
    expect(result).toContain('Professional Summary');
    expect(result).toContain('Experienced engineer.');
  });

  it('includes work experience with bullet points', () => {
    const result = resumeToText({
      workExperience: [
        {
          jobTitle: 'Software Engineer',
          companyName: 'Acme Corp',
          startMonth: 'Jan',
          startYear: '2022',
          isCurrentRole: true,
          bulletPoints: ['Built a thing', 'Improved performance by 40%'],
        },
      ],
    });
    expect(result).toContain('Software Engineer at Acme Corp');
    expect(result).toContain('Present');
    expect(result).toContain('Built a thing');
    expect(result).toContain('Improved performance by 40%');
  });

  it('handles work experience with empty bullet points', () => {
    const result = resumeToText({
      workExperience: [
        {
          jobTitle: 'Intern',
          companyName: 'Startup',
          bulletPoints: ['', '', ''],
        },
      ],
    });
    expect(result).toContain('Intern at Startup');
    expect(result).not.toContain('•');
  });

  it('includes education section', () => {
    const result = resumeToText({
      education: [
        {
          degreeType: 'bs',
          fieldOfStudy: 'Computer Science',
          institutionName: 'MIT',
          graduationYear: '2023',
          currentlyEnrolled: false,
        },
      ],
    });
    expect(result).toContain('Education');
    expect(result).toContain('Computer Science');
    expect(result).toContain('MIT');
    expect(result).toContain('2023');
  });

  it('marks currently enrolled as In Progress', () => {
    const result = resumeToText({
      education: [
        {
          institutionName: 'Stanford',
          fieldOfStudy: 'CS',
          currentlyEnrolled: true,
        },
      ],
    });
    expect(result).toContain('In Progress');
  });

  it('includes all skill categories', () => {
    const result = resumeToText({
      skills: {
        programmingLanguages: ['Python', 'TypeScript'],
        technicalSkills: ['REST APIs'],
        toolsSoftware: ['Docker'],
        domainSpecificSkills: ['Machine Learning'],
        languageSkills: ['English', 'French'],
      },
    });
    expect(result).toContain('Python');
    expect(result).toContain('TypeScript');
    expect(result).toContain('Docker');
    expect(result).toContain('Machine Learning');
    expect(result).toContain('English');
  });

  it('includes projects with technologies', () => {
    const result = resumeToText({
      projects: [
        {
          projectTitle: 'Resume AI',
          projectDescription: 'Built an AI-powered resume tool.',
          technologiesUsed: ['React', 'Node.js'],
          projectOutcome: 'Reduced time-to-hire by 30%',
        },
      ],
    });
    expect(result).toContain('Resume AI');
    expect(result).toContain('React, Node.js');
    expect(result).toContain('Reduced time-to-hire');
  });

  it('includes certifications', () => {
    const result = resumeToText({
      certifications: [
        {
          certificationName: 'AWS Solutions Architect',
          issuingBody: 'Amazon',
          dateObtained: '2024',
        },
      ],
    });
    expect(result).toContain('AWS Solutions Architect');
    expect(result).toContain('Amazon');
  });

  it('produces a full resume text from a complete resume', () => {
    const fullResume = {
      personalInfo: { fullName: 'Alex Chen', email: 'alex@example.com' },
      summary: { summaryText: 'Full-stack engineer with 5 years experience.' },
      workExperience: [
        {
          jobTitle: 'Senior Engineer',
          companyName: 'TechCo',
          startYear: '2020',
          isCurrentRole: true,
          bulletPoints: ['Led team of 4 engineers'],
        },
      ],
      education: [
        {
          fieldOfStudy: 'Computer Science',
          institutionName: 'UC Berkeley',
          graduationYear: '2019',
          currentlyEnrolled: false,
        },
      ],
      skills: { technicalSkills: ['React', 'Node.js'] },
    };
    const result = resumeToText(fullResume);
    expect(result).toContain('Alex Chen');
    expect(result).toContain('Full-stack engineer');
    expect(result).toContain('Senior Engineer');
    expect(result).toContain('UC Berkeley');
    expect(result).toContain('React, Node.js');
  });

  it('reads professionalSummary from reviewOptimize path', () => {
    const result = resumeToText({
      reviewOptimize: {
        professionalSummary: { summaryText: 'Senior engineer with 10 years experience.' },
      },
    });
    expect(result).toContain('Professional Summary');
    expect(result).toContain('Senior engineer with 10 years experience.');
  });

  it('falls back to summary.summaryText for old resumes', () => {
    const result = resumeToText({
      summary: { summaryText: 'Old-format summary.' },
    });
    expect(result).toContain('Old-format summary.');
  });

  it('prefers reviewOptimize summary over legacy summary', () => {
    const result = resumeToText({
      reviewOptimize: { professionalSummary: { summaryText: 'New summary.' } },
      summary: { summaryText: 'Old summary.' },
    });
    expect(result).toContain('New summary.');
    expect(result).not.toContain('Old summary.');
  });

  it('includes volunteer experience from additionalInfo', () => {
    const result = resumeToText({
      additionalInfo: {
        volunteerExperience: [
          { organizationName: 'Red Cross', role: 'Coordinator', description: 'Organized disaster relief.' },
        ],
      },
    });
    expect(result).toContain('Volunteer Experience');
    expect(result).toContain('Red Cross');
    expect(result).toContain('Coordinator');
    expect(result).toContain('Organized disaster relief.');
  });

  it('includes publications from additionalInfo', () => {
    const result = resumeToText({
      additionalInfo: {
        publications: [
          { publicationTitle: 'ML Survey', publicationName: 'IEEE', year: '2023', doiUrl: 'doi.org/10.1' },
        ],
      },
    });
    expect(result).toContain('Publications');
    expect(result).toContain('ML Survey');
    expect(result).toContain('IEEE');
    expect(result).toContain('2023');
    expect(result).toContain('doi.org/10.1');
  });

  it('includes awards from additionalInfo', () => {
    const result = resumeToText({
      additionalInfo: {
        awards: [
          { awardName: 'Best Paper', awardingBody: 'ACM', dateReceived: '2023', description: 'Top 1% of papers.' },
        ],
      },
    });
    expect(result).toContain('Awards');
    expect(result).toContain('Best Paper');
    expect(result).toContain('ACM');
    expect(result).toContain('2023');
  });

  it('handles empty additionalInfo arrays without throwing', () => {
    expect(() => resumeToText({
      additionalInfo: { volunteerExperience: [], publications: [], awards: [] },
    })).not.toThrow();
  });
});

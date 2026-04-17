/**
 * Serialize a resume object to a plain-text string suitable for LLM input.
 * Handles empty/partial resumes gracefully — never throws.
 */
export function resumeToText(resume) {
  if (!resume || typeof resume !== 'object') return '';

  const lines = [];

  // Personal Info
  const p = resume.personalInfo || {};
  if (p.fullName) lines.push(`# ${p.fullName}`);
  const contact = [
    p.email,
    p.phone,
    p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state,
    p.linkedinUrl,
    p.portfolioUrl,
  ].filter(Boolean);
  if (contact.length) lines.push(contact.join(' | '));

  // Career Objective
  const co = resume.careerObjective || {};
  if (co.targetJobTitle || co.targetIndustry) {
    lines.push('\n## Target Role');
    if (co.targetJobTitle) lines.push(`Title: ${co.targetJobTitle}`);
    if (co.targetIndustry) lines.push(`Industry: ${co.targetIndustry}`);
    if (co.seniorityLevel) lines.push(`Level: ${co.seniorityLevel}`);
  }

  // Professional Summary — support both old (resume.summary) and new (resume.reviewOptimize.professionalSummary) paths
  const summaryText =
    resume.reviewOptimize?.professionalSummary?.summaryText ||
    resume.summary?.summaryText ||
    '';
  if (summaryText) {
    lines.push('\n## Professional Summary');
    lines.push(summaryText);
  }

  // Work Experience
  const work = resume.workExperience || [];
  if (work.length) {
    lines.push('\n## Work Experience');
    for (const w of work) {
      const start = [w.startMonth, w.startYear].filter(Boolean).join(' ');
      const end = w.isCurrentRole
        ? 'Present'
        : [w.endMonth, w.endYear].filter(Boolean).join(' ');
      const period = start || end ? `${start} - ${end}` : '';
      const locationPart = w.isRemote ? 'Remote' : w.location;

      const header = [
        `${w.jobTitle || 'Role'} at ${w.companyName || 'Company'}`,
        locationPart,
        period,
      ]
        .filter(Boolean)
        .join(' | ');
      lines.push(`\n${header}`);

      const bullets = (w.bulletPoints || []).filter(Boolean);
      for (const b of bullets) lines.push(`• ${b}`);
    }
  }

  // Education
  const edu = resume.education || [];
  if (edu.length) {
    lines.push('\n## Education');
    for (const e of edu) {
      const degree = [
        e.degreeType ? e.degreeType.toUpperCase() : '',
        e.fieldOfStudy ? `in ${e.fieldOfStudy}` : '',
      ]
        .filter(Boolean)
        .join(' ');
      const grad = e.currentlyEnrolled
        ? 'In Progress'
        : [e.graduationMonth, e.graduationYear].filter(Boolean).join(' ');
      lines.push(`\n${degree || 'Degree'} | ${e.institutionName || 'Institution'} | ${grad}`);
      if (e.gpa) lines.push(`GPA: ${e.gpa}`);
      if (e.honorsAwards) lines.push(`Honors: ${e.honorsAwards}`);
      if (e.relevantCoursework) lines.push(`Coursework: ${e.relevantCoursework}`);
    }
  }

  // Skills
  const sk = resume.skills || {};
  const techSkills = [
    ...(sk.programmingLanguages || []),
    ...(sk.technicalSkills || []),
    ...(sk.toolsSoftware || []),
    ...(sk.domainSpecificSkills || []),
  ].filter(Boolean);
  if (techSkills.length) {
    lines.push('\n## Skills');
    lines.push(techSkills.join(', '));
  }
  const langSkills = (sk.languageSkills || []).filter(Boolean);
  if (langSkills.length) {
    lines.push(`Languages: ${langSkills.join(', ')}`);
  }

  // Projects
  const projects = resume.projects || [];
  if (projects.length) {
    lines.push('\n## Projects');
    for (const pr of projects) {
      const header = [pr.projectTitle, pr.associatedInstitution].filter(Boolean).join(' | ');
      lines.push(`\n${header}`);
      if (pr.projectDescription) lines.push(pr.projectDescription);
      const tech = (pr.technologiesUsed || []).filter(Boolean);
      if (tech.length) lines.push(`Technologies: ${tech.join(', ')}`);
      if (pr.projectOutcome) lines.push(`Outcome: ${pr.projectOutcome}`);
    }
  }

  // Certifications
  const certs = resume.certifications || [];
  if (certs.length) {
    lines.push('\n## Certifications');
    for (const c of certs) {
      const parts = [c.certificationName, c.issuingBody, c.dateObtained].filter(Boolean);
      lines.push(parts.join(' | '));
    }
  }

  // Additional Info
  const ai = resume.additionalInfo || {};

  const volunteers = ai.volunteerExperience || [];
  if (volunteers.length) {
    lines.push('\n## Volunteer Experience');
    for (const v of volunteers) {
      const header = [v.organizationName, v.role].filter(Boolean).join(' | ');
      if (header) lines.push(`\n${header}`);
      if (v.description) lines.push(v.description);
    }
  }

  const pubs = ai.publications || [];
  if (pubs.length) {
    lines.push('\n## Publications');
    for (const pub of pubs) {
      const parts = [pub.publicationTitle, pub.publicationName, pub.year].filter(Boolean);
      if (parts.length) lines.push(parts.join(' | '));
      if (pub.doiUrl) lines.push(`DOI: ${pub.doiUrl}`);
    }
  }

  const awards = ai.awards || [];
  if (awards.length) {
    lines.push('\n## Awards');
    for (const a of awards) {
      const parts = [a.awardName, a.awardingBody, a.dateReceived].filter(Boolean);
      if (parts.length) lines.push(parts.join(' | '));
      if (a.description) lines.push(a.description);
    }
  }

  return lines.join('\n').trim();
}

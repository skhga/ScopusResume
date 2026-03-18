const delay = (ms) => new Promise(r => setTimeout(r, ms));

export async function analyzeJobDescription(jdText, resume) {
  await delay(1500);
  const skills = resume?.skills || {};
  const allSkills = [
    ...(skills.technicalSkills || []),
    ...(skills.programmingLanguages || []),
    ...(skills.toolsSoftware || []),
  ].map(s => s.toLowerCase());

  const required = ['React.js', 'Node.js', 'TypeScript', 'REST APIs', 'PostgreSQL'];
  const matchedSkills = required.filter(s => allSkills.some(sk => sk.toLowerCase().includes(s.toLowerCase())));
  const missingKeywords = required.filter(s => !allSkills.some(sk => sk.toLowerCase().includes(s.toLowerCase())));

  return {
    overallScore: Math.round((matchedSkills.length / required.length) * 100),
    matchedSkills,
    missingKeywords,
    suggestions: [
      'Add more quantified achievements to bullet points',
      'Include missing keywords in your skills section',
      'Tailor your summary to match the job description',
    ],
  };
}

export async function rewriteBulletPoint(original) {
  await delay(1000);
  return `Spearheaded ${original.toLowerCase().replace('responsible for ', '').replace('worked on ', '')}, driving measurable impact across the organization`;
}

export async function generateSummary(resumeData) {
  await delay(1200);
  return 'Results-driven software professional with expertise in full-stack development, specializing in building scalable web applications. Proven track record of delivering high-impact solutions and collaborating with cross-functional teams.';
}

export async function getATSScore(resumeData) {
  await delay(1000);
  return {
    overall: 72,
    categories: [
      { name: 'Contact Info', score: 90 },
      { name: 'Work Experience', score: 75 },
      { name: 'Skills Match', score: 60 },
      { name: 'Keywords', score: 55 },
      { name: 'Formatting', score: 85 },
    ],
    missingKeywords: ['TypeScript', 'PostgreSQL', 'Docker', 'GraphQL'],
    formattingIssues: [
      'Consider using standard section headers (e.g., "Work Experience" instead of custom names)',
      'Ensure consistent date formatting throughout',
    ],
    suggestions: [
      'Add more quantified achievements to bullet points',
      'Include TypeScript in your skills section',
      'Add relevant keywords from the job description',
      'Use action verbs at the start of each bullet point',
    ],
  };
}

export async function optimizeBullets(bullets) {
  await delay(1500);
  return bullets.map(b =>
    `Engineered and delivered ${b.toLowerCase().replace('responsible for ', '').replace('worked on ', '')}, resulting in 25% improvement in team productivity`
  );
}

/**
 * voiceConsistency — flags resume bullet points that sound generic or AI-generated.
 *
 * This is a rule-based phrase detector, not a "score."
 * Returns specific callouts so the user knows exactly what to fix.
 */

const CLICHE_PATTERNS = [
  {
    pattern: /\b(spearheaded|spearhead)\b/i,
    phrase: 'spearheaded',
    suggestion: 'Use "led", "launched", or "drove" — more specific and less overused',
  },
  {
    pattern: /\bsynergize[ds]?\b/i,
    phrase: 'synergized',
    suggestion: 'Describe the actual collaboration: "worked with X team to..."',
  },
  {
    pattern: /\bleverage[ds]?\b/i,
    phrase: 'leveraged',
    suggestion: 'Replace with the specific tool or approach you used',
  },
  {
    pattern: /\b(results.driven|results driven)\b/i,
    phrase: 'results-driven',
    suggestion: 'Show results with numbers instead of claiming to be results-driven',
  },
  {
    pattern: /\bfast.paced environment\b/i,
    phrase: 'fast-paced environment',
    suggestion: 'Cut entirely — every workplace claims this',
  },
  {
    pattern: /\bteam player\b/i,
    phrase: 'team player',
    suggestion: 'Describe a specific instance of collaboration instead',
  },
  {
    pattern: /\b(proven track record)\b/i,
    phrase: 'proven track record',
    suggestion: 'State what you proved and how — use a specific metric',
  },
  {
    pattern: /\b(go.to person)\b/i,
    phrase: 'go-to person',
    suggestion: 'Describe what you were actually relied on for',
  },
  {
    pattern: /\b(think outside the box)\b/i,
    phrase: 'think outside the box',
    suggestion: 'Describe the unconventional solution you actually built',
  },
  {
    pattern: /\b(driving measurable impact)\b/i,
    phrase: 'driving measurable impact',
    suggestion: 'State the actual measurement — %, $, time saved',
  },
  {
    pattern: /\b(cross.functional team[s]?)\b/i,
    phrase: 'cross-functional teams',
    suggestion: 'Name the teams: "collaborated with design, engineering, and sales"',
  },
  {
    pattern: /\b(passionate about)\b/i,
    phrase: 'passionate about',
    suggestion: 'Cut the adjective, describe what you built or did instead',
  },
  {
    pattern: /\b(detail.oriented)\b/i,
    phrase: 'detail-oriented',
    suggestion: 'Show an example that demonstrates this — let the work speak',
  },
  {
    pattern: /\b(self.starter)\b/i,
    phrase: 'self-starter',
    suggestion: 'Describe something you initiated without being asked',
  },
  {
    pattern: /\bengineered and delivered\b/i,
    phrase: 'engineered and delivered',
    suggestion: '"Built", "shipped", or "delivered" alone is clearer',
  },
];

/**
 * Check a resume for voice consistency issues.
 * Scans: summary, bullet points, career objective.
 *
 * @param {object} resume
 * @returns {Array<{phrase: string, location: string, suggestion: string}>}
 */
export function checkVoiceConsistency(resume) {
  if (!resume || typeof resume !== 'object') return [];

  const flags = [];
  const seen = new Set(); // deduplicate same phrase across multiple locations

  const check = (text, location) => {
    if (!text || typeof text !== 'string') return;
    for (const { pattern, phrase, suggestion } of CLICHE_PATTERNS) {
      if (pattern.test(text) && !seen.has(phrase)) {
        seen.add(phrase);
        flags.push({ phrase, location, suggestion });
      }
    }
  };

  // Summary
  check(resume.summary?.summaryText, 'Professional Summary');

  // Career objective
  check(resume.careerObjective?.targetJobTitle, 'Target Role');

  // Work experience bullet points
  for (const work of resume.workExperience || []) {
    const label = work.companyName ? `${work.jobTitle} at ${work.companyName}` : 'Work Experience';
    for (const bullet of work.bulletPoints || []) {
      check(bullet, label);
    }
  }

  // Project descriptions
  for (const project of resume.projects || []) {
    check(project.projectDescription, `Project: ${project.projectTitle || 'Unnamed'}`);
    check(project.projectOutcome, `Project: ${project.projectTitle || 'Unnamed'}`);
  }

  return flags;
}

const { callOpenAI } = require('./_openai');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeData } = req.body;
  if (!resumeData) return res.status(400).json({ error: 'resumeData is required' });

  const jobs = resumeData.workExperience || [];
  const yearsOfExperience = (() => {
    const startYears = jobs.map(j => parseInt(j.startYear)).filter(Boolean);
    return startYears.length ? new Date().getFullYear() - Math.min(...startYears) : 0;
  })();

  const topSkills = [
    ...(resumeData.skills?.programmingLanguages || []),
    ...(resumeData.skills?.technicalSkills || []),
    ...(resumeData.skills?.toolsSoftware || []),
  ].slice(0, 6).join(', ');

  const mostRecentJob = jobs[0];
  const firstEdu = (resumeData.education || [])[0];

  const systemPrompt = `You are an expert resume writer. Generate a concise, compelling 3-4 sentence professional summary.
The summary should:
- Open with years of experience and target role
- Highlight 2-3 top skills relevant to the target job
- Include a notable achievement or differentiator if possible
- Close with value proposition for the employer
- Use professional but confident tone
- NOT use clichés: "results-driven", "dynamic", "passionate", "team player", "go-getter"
Return ONLY the summary text, no quotes, no preamble, no explanation.`;

  const userPrompt = `Target Job Title: ${resumeData.careerObjective?.targetJobTitle || 'Not specified'}
Target Industry: ${resumeData.careerObjective?.targetIndustry || 'Not specified'}
Seniority Level: ${resumeData.careerObjective?.seniorityLevel || 'mid'}
Years of Experience: ${yearsOfExperience}
Top Skills: ${topSkills || 'Not listed'}
Most Recent Role: ${mostRecentJob?.jobTitle || 'Not provided'} at ${mostRecentJob?.companyName || ''}
Education: ${firstEdu ? `${firstEdu.degreeType} in ${firstEdu.fieldOfStudy} from ${firstEdu.institutionName}` : 'Not provided'}
Job Description Keywords: ${resumeData.careerObjective?.jobDescriptionText ? resumeData.careerObjective.jobDescriptionText.substring(0, 400) : 'None'}

Generate a 3-4 sentence professional summary.`;

  try {
    const summary = await callOpenAI(systemPrompt, userPrompt);
    res.status(200).json({ summary: summary.trim() });
  } catch (err) {
    console.error('generate-summary error:', err);
    res.status(500).json({ error: 'Summary generation failed', details: err.message });
  }
};

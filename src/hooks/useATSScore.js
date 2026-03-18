import { useMemo } from 'react';

export default function useATSScore(resume) {
  return useMemo(() => {
    if (!resume) return { score: 0, breakdown: [] };
    let total = 0; const breakdown = [];

    const hasContact = resume.personalInfo?.fullName && resume.personalInfo?.email;
    const contactScore = hasContact ? 90 : 30;
    breakdown.push({ category: 'Contact Info', score: contactScore, maxScore: 100, suggestions: hasContact ? [] : ['Add your name and email'] });
    total += contactScore;

    const expCount = resume.workExperience?.length || 0;
    const expScore = Math.min(expCount * 25, 100);
    breakdown.push({ category: 'Work Experience', score: expScore, maxScore: 100, suggestions: expCount < 2 ? ['Add more work experience'] : [] });
    total += expScore;

    const skillCount = (resume.skills?.technicalSkills?.length || 0) + (resume.skills?.programmingLanguages?.length || 0);
    const skillScore = Math.min(skillCount * 10, 100);
    breakdown.push({ category: 'Skills', score: skillScore, maxScore: 100, suggestions: skillCount < 5 ? ['Add more relevant skills'] : [] });
    total += skillScore;

    const eduCount = resume.education?.length || 0;
    const eduScore = eduCount > 0 ? 80 : 20;
    breakdown.push({ category: 'Education', score: eduScore, maxScore: 100, suggestions: eduCount === 0 ? ['Add your education'] : [] });
    total += eduScore;

    const hasSummary = resume.summary?.summaryText?.length > 20;
    const summaryScore = hasSummary ? 85 : 20;
    breakdown.push({ category: 'Summary', score: summaryScore, maxScore: 100, suggestions: hasSummary ? [] : ['Write a professional summary'] });
    total += summaryScore;

    return { score: Math.round(total / 5), breakdown };
  }, [resume]);
}

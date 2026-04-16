import React from 'react';

const TEMPLATE_STYLES = {
  modern: {
    headerBg: 'bg-brand-700',
    headerText: 'text-white',
    headerBorder: 'border-brand-700',
    headingColor: 'text-brand-700',
    headingBorder: 'border-brand-200',
    font: 'font-sans',
    accentColor: 'text-brand-600',
  },
  classic: {
    headerBg: 'bg-gray-900',
    headerText: 'text-white',
    headerBorder: 'border-gray-900',
    headingColor: 'text-gray-900',
    headingBorder: 'border-gray-400',
    font: 'font-serif',
    accentColor: 'text-gray-700',
  },
  minimal: {
    headerBg: 'bg-white',
    headerText: 'text-gray-900',
    headerBorder: 'border-gray-200',
    headingColor: 'text-gray-600',
    headingBorder: 'border-gray-200',
    font: 'font-sans',
    accentColor: 'text-gray-500',
  },
  professional: {
    headerBg: 'bg-slate-700',
    headerText: 'text-white',
    headerBorder: 'border-slate-700',
    headingColor: 'text-slate-700',
    headingBorder: 'border-slate-300',
    font: 'font-sans',
    accentColor: 'text-slate-600',
  },
};

export default function ResumeTemplate({ resume, resumeData, template = 'modern' }) {
  const d = resume || resumeData || {};
  const s = TEMPLATE_STYLES[template] || TEMPLATE_STYLES.modern;

  const p = d.personalInfo || {};
  const exp = d.workExperience || [];
  const edu = d.education || [];
  const skills = d.skills || {};
  const projects = d.projects || [];
  const additionalInfo = d.additionalInfo || {};
  const volunteerExp = additionalInfo.volunteerExperience || [];
  const awards = additionalInfo.awards || [];

  // Support both new and legacy summary paths
  const summaryText =
    d.reviewOptimize?.professionalSummary?.summaryText ||
    d.professionalSummary?.summaryText ||
    d.summary?.summaryText ||
    '';

  const SectionHeading = ({ children }) => (
    <h2 className={`text-sm font-bold uppercase tracking-wider border-b pb-1 mb-2 ${s.headingColor} ${s.headingBorder}`}>
      {children}
    </h2>
  );

  return (
    <div className={`bg-white shadow-lg rounded-lg max-w-[21cm] mx-auto overflow-hidden ${s.font}`} style={{ fontSize: '11pt', lineHeight: '1.4' }}>
      {/* Header */}
      <div className={`px-8 pt-6 pb-4 ${s.headerBg}`}>
        <h1 className={`text-2xl font-bold tracking-wide text-center ${s.headerText}`}>
          {p.fullName || 'Your Name'}
        </h1>
        <p className={`text-sm mt-1 text-center ${template === 'minimal' ? 'text-gray-500' : 'text-white/80'}`}>
          {[p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state]
            .filter(Boolean).join(' | ')}
        </p>
        {(p.linkedinUrl || p.portfolioUrl) && (
          <p className={`text-sm text-center mt-0.5 ${template === 'minimal' ? 'text-gray-400' : 'text-white/70'}`}>
            {[p.linkedinUrl, p.portfolioUrl].filter(Boolean).join(' | ')}
          </p>
        )}
      </div>

      <div className="p-8 space-y-4">
        {/* Professional Summary */}
        {summaryText && (
          <div>
            <SectionHeading>Professional Summary</SectionHeading>
            <p className="text-sm text-gray-700">{summaryText}</p>
          </div>
        )}

        {/* Experience */}
        {exp.length > 0 && (
          <div>
            <SectionHeading>Experience</SectionHeading>
            {exp.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between items-start">
                  <span className={`font-semibold text-sm ${s.accentColor}`}>{e.jobTitle}</span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">
                    {e.startMonth} {e.startYear} – {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}
                  </span>
                </div>
                <p className="text-sm text-gray-600 italic">
                  {e.companyName}{e.location ? `, ${e.location}` : ''}{e.isRemote ? ' (Remote)' : ''}
                </p>
                {e.bulletPoints?.filter(Boolean).length > 0 && (
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-0.5">
                    {e.bulletPoints.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Education */}
        {edu.length > 0 && (
          <div>
            <SectionHeading>Education</SectionHeading>
            {edu.map((e, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-sm">{e.institutionName}</span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{e.graduationMonth} {e.graduationYear}</span>
                </div>
                <p className="text-sm text-gray-600">
                  {[e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ')}
                  {e.gpa ? ` | GPA: ${e.gpa}` : ''}
                </p>
                {e.thesisTitle && <p className="text-xs text-gray-500 italic">Thesis: {e.thesisTitle}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {(skills.technicalSkills?.length > 0 || skills.programmingLanguages?.length > 0 || skills.toolsSoftware?.length > 0) && (
          <div>
            <SectionHeading>Skills</SectionHeading>
            <div className="text-sm text-gray-700 space-y-1">
              {skills.technicalSkills?.length > 0 && <p><strong>Technical:</strong> {skills.technicalSkills.join(', ')}</p>}
              {skills.programmingLanguages?.length > 0 && <p><strong>Languages:</strong> {skills.programmingLanguages.join(', ')}</p>}
              {skills.toolsSoftware?.length > 0 && <p><strong>Tools:</strong> {skills.toolsSoftware.join(', ')}</p>}
              {skills.domainSpecificSkills?.length > 0 && <p><strong>Domain:</strong> {skills.domainSpecificSkills.join(', ')}</p>}
              {skills.languageSkills?.length > 0 && (
                <p><strong>Languages:</strong> {skills.languageSkills.map(l => `${l.name} (${l.proficiency})`).join(', ')}</p>
              )}
            </div>
          </div>
        )}

        {/* Projects (legacy) */}
        {projects.length > 0 && (
          <div>
            <SectionHeading>Projects</SectionHeading>
            {projects.map((pr, i) => (
              <div key={i} className="mb-2">
                <span className={`font-semibold text-sm ${s.accentColor}`}>{pr.projectTitle}</span>
                {pr.projectDescription && <p className="text-sm text-gray-700">{pr.projectDescription}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Volunteer Experience */}
        {volunteerExp.length > 0 && (
          <div>
            <SectionHeading>Volunteer Experience</SectionHeading>
            {volunteerExp.map((v, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between items-start">
                  <span className={`font-semibold text-sm ${s.accentColor}`}>{v.role}</span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">
                    {v.startDate}{v.endDate ? ` – ${v.endDate}` : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-600 italic">{v.organizationName}</p>
                {v.description && <p className="text-sm text-gray-700">{v.description}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Awards */}
        {awards.length > 0 && (
          <div>
            <SectionHeading>Awards & Honors</SectionHeading>
            {awards.map((a, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between items-start">
                  <span className={`font-semibold text-sm ${s.accentColor}`}>{a.awardName}</span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{a.dateReceived}</span>
                </div>
                {a.awardingBody && <p className="text-sm text-gray-600 italic">{a.awardingBody}</p>}
                {a.description && <p className="text-sm text-gray-700">{a.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

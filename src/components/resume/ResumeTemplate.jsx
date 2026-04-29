import React from 'react';

const TEMPLATE_STYLES = {
  modern: {
    headerBg: 'bg-brand-700', headerText: 'text-white', headerBorder: 'border-brand-700',
    headingColor: 'text-brand-700', headingBorder: 'border-brand-200', font: 'font-sans', accentColor: 'text-brand-600',
  },
  classic: {
    headerBg: 'bg-white', headerText: 'text-gray-900', headerBorder: 'border-gray-300',
    headingColor: 'text-gray-900', headingBorder: 'border-gray-400', font: 'font-serif', accentColor: 'text-gray-800',
  },
  minimal: {
    headerBg: 'bg-white', headerText: 'text-gray-900', headerBorder: 'border-gray-200',
    headingColor: 'text-gray-600', headingBorder: 'border-gray-200', font: 'font-sans', accentColor: 'text-gray-500',
  },
  professional: {
    headerBg: 'bg-slate-800', headerText: 'text-white', headerBorder: 'border-slate-800',
    headingColor: 'text-slate-800', headingBorder: 'border-slate-300', font: 'font-sans', accentColor: 'text-slate-700',
  },
};

function SectionHeading({ children, s }) {
  return (
    <h2 className={`text-sm font-bold uppercase tracking-wider border-b pb-1 mb-2 ${s.headingColor} ${s.headingBorder}`}>
      {children}
    </h2>
  );
}

// Classic -- centered, traditional, serif, single-column
function ClassicTemplate({ d, s }) {
  const p = d.personalInfo || {};
  const exp = d.workExperience || [];
  const edu = d.education || [];
  const skills = d.skills || {};
  const summaryText = d.reviewOptimize?.professionalSummary?.summaryText || d.professionalSummary?.summaryText || d.summary?.summaryText || '';

  return (
    <div className={`bg-white max-w-[21cm] mx-auto overflow-hidden ${s.font}`} style={{ fontSize: '11pt', lineHeight: '1.4' }}>
      <div className="px-8 pt-8 pb-4 text-center border-b-2 border-gray-300">
        <h1 className="text-2xl font-bold tracking-wide">{p.fullName || 'Your Name'}</h1>
        <p className="text-sm mt-2 text-gray-600">
          {[p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state].filter(Boolean).join(' | ')}
        </p>
        {(p.linkedinUrl || p.portfolioUrl) && (
          <p className="text-sm mt-1 text-gray-500">{[p.linkedinUrl, p.portfolioUrl].filter(Boolean).join(' | ')}</p>
        )}
      </div>
      <div className="px-8 py-6 space-y-5">
        {summaryText && (
          <div>
            <SectionHeading s={s}>Professional Summary</SectionHeading>
            <p className="text-sm text-gray-700">{summaryText}</p>
          </div>
        )}
        {exp.length > 0 && (
          <div>
            <SectionHeading s={s}>Experience</SectionHeading>
            {exp.map((e, i) => (
              <div key={i} className="mb-4">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-sm">{e.jobTitle}</span>
                  <span className="text-xs text-gray-500">{e.startMonth} {e.startYear} -- {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}</span>
                </div>
                <p className="text-sm text-gray-600 italic">{e.companyName}{e.location ? `, ${e.location}` : ''}</p>
                {e.bulletPoints?.filter(Boolean).length > 0 && (
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-0.5">
                    {e.bulletPoints.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        {edu.length > 0 && (
          <div>
            <SectionHeading s={s}>Education</SectionHeading>
            {edu.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-sm">{e.institutionName}</span>
                  <span className="text-xs text-gray-500">{e.graduationMonth} {e.graduationYear}</span>
                </div>
                <p className="text-sm text-gray-600">{[e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ')}{e.gpa ? ` | GPA: ${e.gpa}` : ''}</p>
              </div>
            ))}
          </div>
        )}
        {(skills.technicalSkills?.length > 0 || skills.programmingLanguages?.length > 0) && (
          <div>
            <SectionHeading s={s}>Skills</SectionHeading>
            <div className="text-sm text-gray-700 space-y-1">
              {skills.technicalSkills?.length > 0 && <p><strong>Technical:</strong> {skills.technicalSkills.join(', ')}</p>}
              {skills.programmingLanguages?.length > 0 && <p><strong>Languages:</strong> {skills.programmingLanguages.join(', ')}</p>}
              {skills.toolsSoftware?.length > 0 && <p><strong>Tools:</strong> {skills.toolsSoftware.join(', ')}</p>}
              {skills.languageSkills?.length > 0 && <p><strong>Languages:</strong> {skills.languageSkills.map(l => `${l.name} (${l.proficiency})`).join(', ')}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal -- maximum whitespace, understated, light
function MinimalTemplate({ d, s }) {
  const p = d.personalInfo || {};
  const exp = d.workExperience || [];
  const edu = d.education || [];
  const skills = d.skills || {};
  const summaryText = d.reviewOptimize?.professionalSummary?.summaryText || d.professionalSummary?.summaryText || d.summary?.summaryText || '';

  return (
    <div className={`bg-white max-w-[21cm] mx-auto overflow-hidden ${s.font}`} style={{ fontSize: '10.5pt', lineHeight: '1.6' }}>
      <div className="px-12 pt-10 pb-6">
        <h1 className="text-xl font-light tracking-widest uppercase text-gray-600">{p.fullName || 'Your Name'}</h1>
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-0.5">
          {[p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state, p.linkedinUrl, p.portfolioUrl].filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
        </div>
      </div>
      <div className="px-12 pb-10 space-y-8">
        {summaryText && <p className="text-sm text-gray-700 leading-relaxed">{summaryText}</p>}
        {exp.length > 0 && (
          <div>
            <h2 className="text-xs font-light uppercase tracking-[0.2em] text-gray-400 mb-4">Experience</h2>
            <div className="space-y-6">
              {exp.map((e, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-gray-700">{e.jobTitle}</span>
                    <span className="text-xs text-gray-400">{e.startMonth} {e.startYear} -- {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{e.companyName}{e.location ? `, ${e.location}` : ''}</p>
                  {e.bulletPoints?.filter(Boolean).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {e.bulletPoints.filter(Boolean).map((b, j) => <li key={j} className="text-sm text-gray-600 flex"><span className="text-gray-300 mr-2">--</span>{b}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {edu.length > 0 && (
          <div>
            <h2 className="text-xs font-light uppercase tracking-[0.2em] text-gray-400 mb-4">Education</h2>
            {edu.map((e, i) => (
              <div key={i} className="mb-4">
                <span className="text-sm font-medium text-gray-700">{e.institutionName}</span>
                <p className="text-xs text-gray-500 mt-0.5">{[e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ')}{e.gpa ? ` -- GPA ${e.gpa}` : ''} | {e.graduationMonth} {e.graduationYear}</p>
              </div>
            ))}
          </div>
        )}
        {(skills.technicalSkills?.length > 0 || skills.programmingLanguages?.length > 0) && (
          <div>
            <h2 className="text-xs font-light uppercase tracking-[0.2em] text-gray-400 mb-4">Skills</h2>
            <div className="text-sm text-gray-600 space-y-1">
              {skills.technicalSkills?.length > 0 && <p>{skills.technicalSkills.join(' · ')}</p>}
              {skills.programmingLanguages?.length > 0 && <p>{skills.programmingLanguages.join(' · ')}</p>}
              {skills.toolsSoftware?.length > 0 && <p>{skills.toolsSoftware.join(' · ')}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Professional -- compact, dense, two-column with skills sidebar
function ProfessionalTemplate({ d, s }) {
  const p = d.personalInfo || {};
  const exp = d.workExperience || [];
  const edu = d.education || [];
  const skills = d.skills || {};
  const summaryText = d.reviewOptimize?.professionalSummary?.summaryText || d.professionalSummary?.summaryText || d.summary?.summaryText || '';
  const additionalInfo = d.additionalInfo || {};
  const projects = d.projects || [];
  const volunteerExp = additionalInfo.volunteerExperience || [];
  const awards = additionalInfo.awards || [];

  return (
    <div className={`bg-white max-w-[21cm] mx-auto overflow-hidden ${s.font}`} style={{ fontSize: '10pt', lineHeight: '1.35' }}>
      <div className={`px-6 py-4 ${s.headerBg} ${s.headerText}`}>
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-xl font-bold tracking-tight">{p.fullName || 'Your Name'}</h1>
            <p className="text-xs mt-1 opacity-80">{[p.email, p.phone, p.city].filter(Boolean).join(' | ')}</p>
          </div>
          {(p.linkedinUrl || p.portfolioUrl) && (
            <p className="text-xs opacity-70">{[p.linkedinUrl, p.portfolioUrl].filter(Boolean).join(' | ')}</p>
          )}
        </div>
      </div>
      <div className="px-6 py-4 space-y-3">
        {summaryText && <p className="text-xs text-gray-700 leading-relaxed pb-2 border-b border-gray-200">{summaryText}</p>}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-3">
            {exp.length > 0 && (
              <div>
                <SectionHeading s={s}>Professional Experience</SectionHeading>
                {exp.map((e, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-xs">{e.jobTitle}</span>
                      <span className="text-xs text-gray-500">{e.startMonth} {e.startYear} -- {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}</span>
                    </div>
                    <p className="text-xs text-gray-600 italic">{e.companyName}{e.location ? `, ${e.location}` : ''}</p>
                    {e.bulletPoints?.filter(Boolean).length > 0 && (
                      <ul className="list-disc list-inside text-xs text-gray-700 mt-0.5 space-y-0">
                        {e.bulletPoints.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
            {edu.length > 0 && (
              <div>
                <SectionHeading s={s}>Education</SectionHeading>
                {edu.map((e, i) => (
                  <div key={i} className="mb-1.5">
                    <span className="font-bold text-xs">{e.institutionName}</span>
                    <span className="text-xs text-gray-500 ml-2">{e.graduationMonth} {e.graduationYear}</span>
                    <p className="text-xs text-gray-600">{[e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ')}{e.gpa ? `, GPA ${e.gpa}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
            {projects.length > 0 && (
              <div>
                <SectionHeading s={s}>Projects</SectionHeading>
                {projects.map((pr, i) => (
                  <div key={i} className="mb-1.5">
                    <span className={`font-semibold text-xs ${s.accentColor}`}>{pr.projectTitle}</span>
                    {pr.projectDescription && <p className="text-xs text-gray-700">{pr.projectDescription}</p>}
                  </div>
                ))}
              </div>
            )}
            {volunteerExp.length > 0 && (
              <div>
                <SectionHeading s={s}>Volunteer Experience</SectionHeading>
                {volunteerExp.map((v, i) => (
                  <div key={i} className="mb-1.5">
                    <span className={`font-semibold text-xs ${s.accentColor}`}>{v.role}</span>
                    <span className="text-xs text-gray-500 ml-2">{v.startDate}{v.endDate ? ` -- ${v.endDate}` : ''}</span>
                    <p className="text-xs text-gray-600 italic">{v.organizationName}</p>
                  </div>
                ))}
              </div>
            )}
            {awards.length > 0 && (
              <div>
                <SectionHeading s={s}>Awards & Honors</SectionHeading>
                {awards.map((a, i) => (
                  <div key={i} className="mb-1.5">
                    <span className={`font-semibold text-xs ${s.accentColor}`}>{a.awardName}</span>
                    <span className="text-xs text-gray-500 ml-2">{a.dateReceived}</span>
                    {a.awardingBody && <p className="text-xs text-gray-600 italic">{a.awardingBody}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {(skills.technicalSkills?.length > 0 || skills.programmingLanguages?.length > 0 || skills.toolsSoftware?.length > 0) && (
              <div>
                <SectionHeading s={s}>Skills</SectionHeading>
                <div className="text-xs text-gray-700 space-y-1">
                  {skills.technicalSkills?.length > 0 && <div><p className="font-semibold text-xs">Technical</p><p>{skills.technicalSkills.join(', ')}</p></div>}
                  {skills.programmingLanguages?.length > 0 && <div><p className="font-semibold text-xs mt-1">Languages</p><p>{skills.programmingLanguages.join(', ')}</p></div>}
                  {skills.toolsSoftware?.length > 0 && <div><p className="font-semibold text-xs mt-1">Tools</p><p>{skills.toolsSoftware.join(', ')}</p></div>}
                  {skills.domainSpecificSkills?.length > 0 && <div><p className="font-semibold text-xs mt-1">Domain</p><p>{skills.domainSpecificSkills.join(', ')}</p></div>}
                  {skills.languageSkills?.length > 0 && <div><p className="font-semibold text-xs mt-1">Languages</p><p>{skills.languageSkills.map(l => `${l.name} (${l.proficiency})`).join(', ')}</p></div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component -- dispatches to template-specific renderers
export default function ResumeTemplate({ resume, resumeData, template = 'modern' }) {
  const d = resume || resumeData || {};
  const s = TEMPLATE_STYLES[template] || TEMPLATE_STYLES.modern;

  if (template === 'classic') return <ClassicTemplate d={d} s={s} />;
  if (template === 'minimal') return <MinimalTemplate d={d} s={s} />;
  if (template === 'professional') return <ProfessionalTemplate d={d} s={s} />;

  // Modern (original, kept as fallback)
  const p = d.personalInfo || {};
  const exp = d.workExperience || [];
  const edu = d.education || [];
  const skills = d.skills || {};
  const projects = d.projects || [];
  const additionalInfo = d.additionalInfo || {};
  const volunteerExp = additionalInfo.volunteerExperience || [];
  const awards = additionalInfo.awards || [];
  const summaryText = d.reviewOptimize?.professionalSummary?.summaryText || d.professionalSummary?.summaryText || d.summary?.summaryText || '';

  return (
    <div className={`bg-white shadow-lg rounded-lg max-w-[21cm] mx-auto overflow-hidden ${s.font}`} style={{ fontSize: '11pt', lineHeight: '1.4' }}>
      <div className={`px-8 pt-6 pb-4 ${s.headerBg}`}>
        <h1 className={`text-2xl font-bold tracking-wide text-center ${s.headerText}`}>{p.fullName || 'Your Name'}</h1>
        <p className={`text-sm mt-1 text-center ${template === 'minimal' ? 'text-gray-500' : 'text-white/80'}`}>
          {[p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state].filter(Boolean).join(' | ')}
        </p>
        {(p.linkedinUrl || p.portfolioUrl) && (
          <p className={`text-sm text-center mt-0.5 ${template === 'minimal' ? 'text-gray-400' : 'text-white/70'}`}>
            {[p.linkedinUrl, p.portfolioUrl].filter(Boolean).join(' | ')}
          </p>
        )}
      </div>
      <div className="p-8 space-y-4">
        {summaryText && (
          <div>
            <SectionHeading s={s}>Professional Summary</SectionHeading>
            <p className="text-sm text-gray-700">{summaryText}</p>
          </div>
        )}
        {exp.length > 0 && (
          <div>
            <SectionHeading s={s}>Experience</SectionHeading>
            {exp.map((e, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between items-start">
                  <span className={`font-semibold text-sm ${s.accentColor}`}>{e.jobTitle}</span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{e.startMonth} {e.startYear} -- {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}</span>
                </div>
                <p className="text-sm text-gray-600 italic">{e.companyName}{e.location ? `, ${e.location}` : ''}{e.isRemote ? ' (Remote)' : ''}</p>
                {e.bulletPoints?.filter(Boolean).length > 0 && (
                  <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-0.5">
                    {e.bulletPoints.filter(Boolean).map((b, j) => <li key={j}>{b}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
        {edu.length > 0 && (
          <div>
            <SectionHeading s={s}>Education</SectionHeading>
            {edu.map((e, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-sm">{e.institutionName}</span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{e.graduationMonth} {e.graduationYear}</span>
                </div>
                <p className="text-sm text-gray-600">{[e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ')}{e.gpa ? ` | GPA: ${e.gpa}` : ''}</p>
              </div>
            ))}
          </div>
        )}
        {(skills.technicalSkills?.length > 0 || skills.programmingLanguages?.length > 0 || skills.toolsSoftware?.length > 0) && (
          <div>
            <SectionHeading s={s}>Skills</SectionHeading>
            <div className="text-sm text-gray-700 space-y-1">
              {skills.technicalSkills?.length > 0 && <p><strong>Technical:</strong> {skills.technicalSkills.join(', ')}</p>}
              {skills.programmingLanguages?.length > 0 && <p><strong>Languages:</strong> {skills.programmingLanguages.join(', ')}</p>}
              {skills.toolsSoftware?.length > 0 && <p><strong>Tools:</strong> {skills.toolsSoftware.join(', ')}</p>}
              {skills.domainSpecificSkills?.length > 0 && <p><strong>Domain:</strong> {skills.domainSpecificSkills.join(', ')}</p>}
              {skills.languageSkills?.length > 0 && <p><strong>Languages:</strong> {skills.languageSkills.map(l => `${l.name} (${l.proficiency})`).join(', ')}</p>}
            </div>
          </div>
        )}
        {projects.length > 0 && (
          <div>
            <SectionHeading s={s}>Projects</SectionHeading>
            {projects.map((pr, i) => (
              <div key={i} className="mb-2">
                <span className={`font-semibold text-sm ${s.accentColor}`}>{pr.projectTitle}</span>
                {pr.projectDescription && <p className="text-sm text-gray-700">{pr.projectDescription}</p>}
              </div>
            ))}
          </div>
        )}
        {volunteerExp.length > 0 && (
          <div>
            <SectionHeading s={s}>Volunteer Experience</SectionHeading>
            {volunteerExp.map((v, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between items-start">
                  <span className={`font-semibold text-sm ${s.accentColor}`}>{v.role}</span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{v.startDate}{v.endDate ? ` -- ${v.endDate}` : ''}</span>
                </div>
                <p className="text-sm text-gray-600 italic">{v.organizationName}</p>
                {v.description && <p className="text-sm text-gray-700">{v.description}</p>}
              </div>
            ))}
          </div>
        )}
        {awards.length > 0 && (
          <div>
            <SectionHeading s={s}>Awards & Honors</SectionHeading>
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

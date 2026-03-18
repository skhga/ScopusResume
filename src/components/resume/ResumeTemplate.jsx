import React from 'react';

export default function ResumeTemplate({ resume, resumeData }) {
  const d = resume || resumeData || {};
  const p = d.personalInfo || {};
  const exp = d.workExperience || [];
  const edu = d.education || [];
  const skills = d.skills || {};
  const projects = d.projects || [];

  return (
    <div className="bg-white shadow-lg rounded-lg p-8 max-w-[21cm] mx-auto" style={{ fontFamily: 'Georgia, serif', fontSize: '11pt', lineHeight: '1.4' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-900 tracking-wide">{p.fullName || 'Your Name'}</h1>
        <p className="text-sm text-gray-600 mt-1">
          {[p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state].filter(Boolean).join(' | ')}
        </p>
        {(p.linkedinUrl || p.portfolioUrl) && (
          <p className="text-sm text-gray-600">{[p.linkedinUrl, p.portfolioUrl].filter(Boolean).join(' | ')}</p>
        )}
      </div>

      {/* Summary */}
      {d.summary?.summaryText && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300 pb-1 mb-2">Professional Summary</h2>
          <p className="text-sm text-gray-700">{d.summary.summaryText}</p>
        </div>
      )}

      {/* Experience */}
      {exp.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300 pb-1 mb-2">Experience</h2>
          {exp.map((e, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between"><span className="font-semibold text-sm">{e.jobTitle}</span><span className="text-xs text-gray-500">{e.startMonth} {e.startYear} - {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}</span></div>
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

      {/* Education */}
      {edu.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300 pb-1 mb-2">Education</h2>
          {edu.map((e, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between"><span className="font-semibold text-sm">{e.institutionName}</span><span className="text-xs text-gray-500">{e.graduationMonth} {e.graduationYear}</span></div>
              <p className="text-sm text-gray-600">{e.degreeType} in {e.fieldOfStudy}{e.gpa ? ` | GPA: ${e.gpa}` : ''}</p>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {(skills.technicalSkills?.length > 0 || skills.programmingLanguages?.length > 0) && (
        <div className="mb-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300 pb-1 mb-2">Skills</h2>
          <div className="text-sm text-gray-700 space-y-1">
            {skills.technicalSkills?.length > 0 && <p><strong>Technical:</strong> {skills.technicalSkills.join(', ')}</p>}
            {skills.programmingLanguages?.length > 0 && <p><strong>Languages:</strong> {skills.programmingLanguages.join(', ')}</p>}
            {skills.toolsSoftware?.length > 0 && <p><strong>Tools:</strong> {skills.toolsSoftware.join(', ')}</p>}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-300 pb-1 mb-2">Projects</h2>
          {projects.map((pr, i) => (
            <div key={i} className="mb-2">
              <span className="font-semibold text-sm">{pr.projectTitle}</span>
              {pr.projectDescription && <p className="text-sm text-gray-700">{pr.projectDescription}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

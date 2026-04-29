// Vercel serverless function — generates .docx from resume JSON
const {
  Document, Packer, Paragraph, TextRun,
  AlignmentType, BorderStyle,
} = require('docx');

const FONT = 'Calibri';
const BRAND = '0ABAB5';
const DARK = '1F2937';
const GRAY = '6B7280';

const configs = {
  modern: { headingColor: BRAND, font: FONT, spacing: { before: 240, after: 120 } },
  classic: { headingColor: DARK, font: 'Georgia', spacing: { before: 300, after: 150 } },
  minimal: { headingColor: GRAY, font: FONT, spacing: { before: 300, after: 200 } },
  professional: { headingColor: '1E293B', font: FONT, spacing: { before: 200, after: 80 } },
};

function heading(text, cfg) {
  return new Paragraph({
    children: [new TextRun({ text: text.toUpperCase(), bold: true, font: cfg.font, size: 22, color: cfg.headingColor })],
    spacing: cfg.spacing,
    border: { bottom: { color: cfg.headingColor, space: 4, style: BorderStyle.SINGLE, size: 2 } },
  });
}

function btext(text, cfg, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: cfg.font, size: 21, color: DARK, ...opts })],
    spacing: { after: 60 },
  });
}

function bullets(items, cfg) {
  return items.filter(Boolean).map(item =>
    new Paragraph({
      children: [new TextRun({ text: item, font: cfg.font, size: 20, color: DARK })],
      spacing: { after: 40 },
      bullet: { level: 0 },
    })
  );
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { resume, templateId } = req.body || {};
    if (!resume) return res.status(400).json({ error: 'Resume data is required' });

    const cfg = configs[templateId] || configs.modern;
    const p = resume.personalInfo || {};
    const exp = resume.workExperience || [];
    const edu = resume.education || [];
    const skills = resume.skills || {};
    const summaryText =
      resume.reviewOptimize?.professionalSummary?.summaryText ||
      resume.professionalSummary?.summaryText ||
      resume.summary?.summaryText || '';
    const additionalInfo = resume.additionalInfo || {};
    const projects = resume.projects || [];
    const volunteerExp = additionalInfo.volunteerExperience || [];
    const awards = additionalInfo.awards || [];

    const children = [];

    // Header
    children.push(
      new Paragraph({
        children: [new TextRun({ text: p.fullName || 'Your Name', bold: true, font: cfg.font, size: 32, color: cfg.headingColor })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    );

    const contact = [p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state].filter(Boolean).join(' | ');
    if (contact) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: contact, font: cfg.font, size: 18, color: GRAY })],
          alignment: AlignmentType.CENTER, spacing: { after: 40 },
        })
      );
    }

    if (p.linkedinUrl || p.portfolioUrl) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: [p.linkedinUrl, p.portfolioUrl].filter(Boolean).join(' | '), font: cfg.font, size: 18, color: GRAY })],
          alignment: AlignmentType.CENTER, spacing: { after: 200 },
        })
      );
    }

    // Summary
    if (summaryText) { children.push(heading('Professional Summary', cfg)); children.push(btext(summaryText, cfg)); }

    // Experience
    if (exp.length > 0) {
      children.push(heading('Experience', cfg));
      for (const e of exp) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: e.jobTitle || '', bold: true, font: cfg.font, size: 22, color: DARK }),
              new TextRun({ text: `  ${e.startMonth || ''} ${e.startYear || ''} — ${e.isCurrentRole ? 'Present' : `${e.endMonth || ''} ${e.endYear || ''}`}`, font: cfg.font, size: 18, color: GRAY }),
            ],
            spacing: { before: 160, after: 40 },
          })
        );
        const company = [e.companyName, e.location].filter(Boolean).join(', ');
        if (company) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: company, italics: true, font: cfg.font, size: 20, color: DARK })],
              spacing: { after: 60 },
            })
          );
        }
        if (e.bulletPoints?.length) children.push(...bullets(e.bulletPoints, cfg));
      }
    }

    // Education
    if (edu.length > 0) {
      children.push(heading('Education', cfg));
      for (const e of edu) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: e.institutionName || '', bold: true, font: cfg.font, size: 22, color: DARK }),
              new TextRun({ text: `  ${e.graduationMonth || ''} ${e.graduationYear || ''}`, font: cfg.font, size: 18, color: GRAY }),
            ],
            spacing: { before: 120, after: 40 },
          })
        );
        const details = [e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ');
        const gpa = e.gpa ? ` | GPA: ${e.gpa}` : '';
        if (details || gpa) children.push(btext(`${details}${gpa}`, cfg, { size: 20 }));
      }
    }

    // Skills
    const skillCats = [
      ['Technical Skills', skills.technicalSkills],
      ['Programming Languages', skills.programmingLanguages],
      ['Tools & Software', skills.toolsSoftware],
      ['Language Skills', skills.languageSkills?.map(l => `${l.name} (${l.proficiency})`)],
    ].filter(([, arr]) => arr?.length > 0);

    if (skillCats.length > 0) {
      children.push(heading('Skills', cfg));
      for (const [label, arr] of skillCats) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${label}: `, bold: true, font: cfg.font, size: 20, color: DARK }),
              new TextRun({ text: arr.join(', '), font: cfg.font, size: 20, color: DARK }),
            ],
            spacing: { after: 40 },
          })
        );
      }
    }

    // Projects
    if (projects.length > 0) {
      children.push(heading('Projects', cfg));
      for (const proj of projects) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: proj.projectName || '', bold: true, font: cfg.font, size: 22, color: DARK })],
            spacing: { before: 120, after: 40 },
          })
        );
        if (proj.projectDescription) children.push(btext(proj.projectDescription, cfg, { size: 20 }));
      }
    }

    // Volunteer
    if (volunteerExp.length > 0) {
      children.push(heading('Volunteer Experience', cfg));
      for (const v of volunteerExp) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: v.role || '', bold: true, font: cfg.font, size: 22, color: DARK })],
            spacing: { before: 120, after: 40 },
          })
        );
        if (v.description) children.push(btext(v.description, cfg, { size: 20 }));
      }
    }

    // Awards
    if (awards.length > 0) {
      children.push(heading('Awards', cfg));
      children.push(...bullets(awards, cfg));
    }

    const doc = new Document({
      styles: { default: { document: { run: { font: cfg.font, size: 21 } } } },
      sections: [{ children }],
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${(resume.name || 'resume').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx"`);
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    console.error('[export-docx]', err);
    res.status(500).json({ error: 'DOCX generation failed' });
  }
};

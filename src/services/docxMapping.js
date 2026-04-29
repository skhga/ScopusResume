import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, convertInchesToTwip,
} from 'docx';

const FONT = 'Calibri';
const BRAND = '0ABAB5';
const DARK = '1F2937';
const GRAY = '6B7280';

const templateConfigs = {
  modern: { headingColor: BRAND, font: FONT, spacing: { before: 240, after: 120 } },
  classic: { headingColor: DARK, font: 'Georgia', spacing: { before: 300, after: 150 } },
  minimal: { headingColor: GRAY, font: FONT, spacing: { before: 300, after: 200 } },
  professional: { headingColor: '1E293B', font: FONT, spacing: { before: 200, after: 80 } },
};

function sectionHeading(text, config) {
  return new Paragraph({
    children: [
      new TextRun({
        text: text.toUpperCase(),
        bold: true,
        font: config.font,
        size: 22,
        color: config.headingColor,
      }),
    ],
    spacing: config.spacing,
    border: {
      bottom: { color: config.headingColor, space: 4, style: BorderStyle.SINGLE, size: 2 },
    },
  });
}

function bodyText(text, config, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: config.font, size: 21, color: DARK, ...opts })],
    spacing: { after: 60 },
  });
}

function bulletList(items, config) {
  return items.filter(Boolean).map(item =>
    new Paragraph({
      children: [new TextRun({ text: `  ${item}`, font: config.font, size: 20, color: DARK })],
      spacing: { after: 40 },
      bullet: { level: 0 },
    })
  );
}

export function buildDocxDocument(resume, templateId = 'modern') {
  const config = templateConfigs[templateId] || templateConfigs.modern;
  const p = resume.personalInfo || {};
  const exp = resume.workExperience || [];
  const edu = resume.education || [];
  const skills = resume.skills || {};
  const summaryText =
    resume.reviewOptimize?.professionalSummary?.summaryText ||
    resume.professionalSummary?.summaryText ||
    resume.summary?.summaryText ||
    '';
  const additionalInfo = resume.additionalInfo || {};
  const projects = resume.projects || [];
  const volunteerExp = additionalInfo.volunteerExperience || [];
  const awards = additionalInfo.awards || [];

  const children = [];

  // Header
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: p.fullName || 'Your Name', bold: true, font: config.font, size: 32, color: config.headingColor }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    })
  );

  const contactLine = [p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state]
    .filter(Boolean).join(' | ');
  if (contactLine) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: contactLine, font: config.font, size: 18, color: GRAY })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      })
    );
  }

  if (p.linkedinUrl || p.portfolioUrl) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: [p.linkedinUrl, p.portfolioUrl].filter(Boolean).join(' | '), font: config.font, size: 18, color: GRAY })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Summary
  if (summaryText) {
    children.push(sectionHeading('Professional Summary', config));
    children.push(bodyText(summaryText, config));
  }

  // Experience
  if (exp.length > 0) {
    children.push(sectionHeading('Experience', config));
    for (const e of exp) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: e.jobTitle || '', bold: true, font: config.font, size: 22, color: DARK }),
            new TextRun({
              text: `  ${e.startMonth || ''} ${e.startYear || ''} — ${e.isCurrentRole ? 'Present' : `${e.endMonth || ''} ${e.endYear || ''}`}`,
              font: config.font, size: 18, color: GRAY,
            }),
          ],
          spacing: { before: 160, after: 40 },
        })
      );
      const companyLine = [e.companyName, e.location].filter(Boolean).join(', ');
      if (companyLine) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: companyLine, italics: true, font: config.font, size: 20, color: DARK })],
            spacing: { after: 60 },
          })
        );
      }
      if (e.bulletPoints?.length) {
        children.push(...bulletList(e.bulletPoints, config));
      }
    }
  }

  // Education
  if (edu.length > 0) {
    children.push(sectionHeading('Education', config));
    for (const e of edu) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: e.institutionName || '', bold: true, font: config.font, size: 22, color: DARK }),
            new TextRun({
              text: `  ${e.graduationMonth || ''} ${e.graduationYear || ''}`,
              font: config.font, size: 18, color: GRAY,
            }),
          ],
          spacing: { before: 120, after: 40 },
        })
      );
      const details = [e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ');
      const gpa = e.gpa ? ` | GPA: ${e.gpa}` : '';
      if (details || gpa) {
        children.push(bodyText(`${details}${gpa}`, config, { size: 20 }));
      }
    }
  }

  // Skills
  const skillCategories = [
    ['Technical Skills', skills.technicalSkills],
    ['Programming Languages', skills.programmingLanguages],
    ['Tools & Software', skills.toolsSoftware],
    ['Language Skills', skills.languageSkills?.map(l => `${l.name} (${l.proficiency})`)],
  ].filter(([, arr]) => arr?.length > 0);

  if (skillCategories.length > 0) {
    children.push(sectionHeading('Skills', config));
    for (const [label, arr] of skillCategories) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true, font: config.font, size: 20, color: DARK }),
            new TextRun({ text: arr.join(', '), font: config.font, size: 20, color: DARK }),
          ],
          spacing: { after: 40 },
        })
      );
    }
  }

  // Projects
  if (projects.length > 0) {
    children.push(sectionHeading('Projects', config));
    for (const proj of projects) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: proj.projectName || '', bold: true, font: config.font, size: 22, color: DARK })],
          spacing: { before: 120, after: 40 },
        })
      );
      if (proj.projectDescription) {
        children.push(bodyText(proj.projectDescription, config, { size: 20 }));
      }
    }
  }

  // Volunteer
  if (volunteerExp.length > 0) {
    children.push(sectionHeading('Volunteer Experience', config));
    for (const v of volunteerExp) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: v.role || '', bold: true, font: config.font, size: 22, color: DARK })],
          spacing: { before: 120, after: 40 },
        })
      );
      if (v.description) {
        children.push(bodyText(v.description, config, { size: 20 }));
      }
    }
  }

  // Awards
  if (awards.length > 0) {
    children.push(sectionHeading('Awards', config));
    children.push(...bulletList(awards, config));
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: config.font, size: 21 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.8),
            bottom: convertInchesToTwip(0.8),
            left: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
          },
        },
      },
      children,
    }],
  });
}

export async function generateDocxBuffer(resume, templateId) {
  const doc = buildDocxDocument(resume, templateId);
  return Packer.toBuffer(doc);
}

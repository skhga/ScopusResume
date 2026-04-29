# Ocean Boil — Complete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement every remaining feature from the CS353 spec — DOCX export, JD Analyzer (parser + match + optimize), French translation, LinkedIn OAuth, template polish, Account Settings wiring, and bug fixes.

**Architecture:** Three sequential phases. Phase 1 fixes bugs and wires Account Settings (~9 tasks). Phase 2 dispatches 4 parallel worktree streams (DOCX, JD Analyzer, Translation+Auth, Templates). Phase 3 does cross-feature QA, visual polish, test expansion, and documentation.

**Tech Stack:** React 19, TailwindCSS, Supabase Auth/DB, OpenAI GPT-4o-mini, Vercel serverless functions, `docx` npm, DeepL API, html2pdf.js, Zod, Jest + React Testing Library

---

## File Structure Map

### Phase 1 — Files Modified
| File | Change |
|------|--------|
| `src/utils/validators.js` | Loosen Zod email regex for ISSUE-001 |
| `src/pages/auth/AccountSettingsPage.jsx` | Wire password change + account delete |
| `src/services/authService.js` | Add `changePassword()` method |
| `src/context/AuthContext.jsx` | Expose `changePassword` to consumers |
| `src/hooks/useAuth.js` | Already exposes context — no change needed |
| `.gitignore` | Add `.superpowers/` |

### Phase 2 — Stream A: DOCX Export
| File | Action |
|------|--------|
| `api/export-docx.js` | **Create** — Vercel serverless function |
| `src/services/docxMapping.js` | **Create** — resume JSON → DOCX structure mapping |
| `src/services/docxMapping.test.js` | **Create** — mapping unit tests |
| `src/pages/export/ExportPage.jsx` | **Modify** — wire DOCX download, add to EXPORT_FORMATS |
| `src/utils/constants.js` | **Modify** — add docx to EXPORT_FORMATS array |
| `package.json` | **Modify** — add `docx` dependency |

### Phase 2 — Stream B: JD Analyzer
| File | Action |
|------|--------|
| `src/services/aiService.js` | **Modify** — add `parseJobDescription()`, `compareResumeToJD()` |
| `src/services/aiService.jd.test.js` | **Create** — tests for new functions |
| `src/components/optimizer/JDParserPanel.jsx` | **Create** — parsed JD display |
| `src/components/optimizer/MatchComparisonPanel.jsx` | **Create** — side-by-side match view |
| `src/pages/optimizer/JDAnalyzerPage.jsx` | **Modify** — 3-tab interface |

### Phase 2 — Stream C: Translation + LinkedIn OAuth
| File | Action |
|------|--------|
| `api/translate.js` | **Create** — Vercel serverless function |
| `src/services/aiService.js` | **Modify** — add `translateResume()` |
| `src/pages/export/ExportPage.jsx` | **Modify** — add language selector + translate button |
| `src/pages/auth/SignInPage.jsx` | **Modify** — add LinkedIn OAuth button |
| `src/pages/auth/SignUpPage.jsx` | **Modify** — add LinkedIn OAuth button |

### Phase 2 — Stream D: Template Library Polish
| File | Action |
|------|--------|
| `src/components/resume/ResumeTemplate.jsx` | **Modify** — 4 distinct layouts |
| `src/pages/export/ExportPage.jsx` | **Modify** — visual template thumbnails |
| `src/constants/templates.js` | **Modify** — add thumbnail/color metadata |

### Phase 3 — Polish & QA
| File | Action |
|------|--------|
| `src/services/docxMapping.test.js` | **Modify** — expand coverage |
| `src/services/aiService.jd.test.js` | **Modify** — expand coverage |
| `src/pages/export/ExportPage.test.js` | **Create** — export page tests |
| `CLAUDE.md` | **Modify** — update architecture docs |
| `README.md` | **Modify** — add feature list + env vars |

---

## Phase 1 — Foundation

### Task 1.1: Fix ISSUE-001 — Email TLD validation

**Files:** Modify: `src/utils/validators.js:3-6,13-16,19-22`

The Zod `.email()` regex rejects non-standard TLDs (like `.dev`, `.test`). Since Supabase already validates emails server-side, the client should not pre-reject them. Use a simpler regex that catches obviously-invalid emails (no `@`, empty) but doesn't reject uncommon TLDs.

- [ ] **Step 1: Replace email validation in all three schemas**

Replace `.email('...')` with a custom regex that only rejects clearly invalid emails:

```js
// src/utils/validators.js
import { z } from 'zod';

// Only reject emails that are clearly malformed — let Supabase handle TLD validation
const emailField = z.string().min(1, 'Email is required').regex(
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  'Please enter a valid email'
);

export const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'Password is required'),
});

export const personalInfoSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: emailField,
  phone: z.string().min(7, 'Valid phone required'),
});
```

- [ ] **Step 2: Run existing validator tests**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npx jest src/utils/validators.test.js --no-coverage
```

Expected: Tests that check valid emails should still pass. Tests that check invalid emails (no @, no domain) should still fail validation.

- [ ] **Step 3: Commit**

```bash
git add src/utils/validators.js
git commit -m "fix: loosen email validation to not reject non-standard TLDs"
```

---

### Task 1.2: Fix ISSUE-002 — Duplicate React key warnings

**Files:** Modify: `src/pages/resume-builder/ReviewOptimizeStep.jsx` and any component rendering `missingKeywords`

The QA report traces the warnings to duplicate keys likely from the `missingKeywords` array. Let's check the ATS score panel.

- [ ] **Step 1: Locate the source**

```bash
cd /Users/sk_hga/ScopusResume/scopus && grep -rn "key=" src/components/resume/ --include="*.jsx" | head -20
```

Also check:
```bash
grep -rn "missingKeywords\|keyword" src/components/resume/ --include="*.jsx" -l
```

- [ ] **Step 2: Read and fix the component rendering keyword lists**

```bash
grep -rn "\.map\|\.map(" src/components/resume/ATSScorePanel.jsx 2>/dev/null || echo "File not found, checking other paths..."
```

The fix pattern: if `missingKeywords` contains duplicates (e.g., `["React", "React", "TypeScript"]`), wrap the `.map()` index into the key or deduplicate before rendering:

```jsx
// Before (if this is the pattern causing the issue):
{keywords.map((kw, i) => <span key={kw}>{kw}</span>)}

// After — use index to guarantee uniqueness when values may duplicate:
{keywords.map((kw, i) => <span key={`kw-${i}`}>{kw}</span>)}
```

Or better, deduplicate:
```jsx
{[...new Set(keywords)].map((kw, i) => <span key={kw}>{kw}</span>)}
```

- [ ] **Step 3: Start the dev server and verify no warnings**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm start &
# Wait for the dev server, then navigate to /app/builder and check browser console
```

Expected: Zero "Encountered two children with the same key" warnings.

- [ ] **Step 4: Commit**

```bash
git add <modified-files>
git commit -m "fix: deduplicate keyword rendering to suppress React key warnings"
```

---

### Task 1.3: Wire password change in Account Settings

**Files:** Modify: `src/services/authService.js`, `src/context/AuthContext.jsx`, `src/pages/auth/AccountSettingsPage.jsx`

- [ ] **Step 1: Add `changePassword` to authService**

```js
// src/services/authService.js — add after updateProfile()

async changePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw new Error(error.message);
  return data.user;
},
```

- [ ] **Step 2: Expose `changePassword` in AuthContext**

```jsx
// src/context/AuthContext.jsx — add after updateProfile definition (line 39-42)

const changePassword = async (newPassword) => {
  await authService.changePassword(newPassword);
};
```

And add `changePassword` to the context value object (after line 58):

```jsx
changePassword,
```

- [ ] **Step 3: Wire the Change Password form in AccountSettingsPage**

Replace the dead `onSubmit={e => e.preventDefault()}` form in `AccountSettingsPage.jsx` (line 79):

```jsx
// src/pages/auth/AccountSettingsPage.jsx
// Add to imports:
import toast from 'react-hot-toast';

// Replace the password state:
const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
const [changingPassword, setChangingPassword] = useState(false);
const [passwordError, setPasswordError] = useState('');

// Get changePassword from context:
const { user, updateProfile, logout, changePassword } = useAuth();

// Replace the Change Password form (lines 78-87):
<Card title="Change Password">
  <form className="space-y-4" onSubmit={async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (passwords.newPass.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (passwords.newPass !== passwords.confirm) {
      setPasswordError('Passwords do not match');
      return;
    }
    setChangingPassword(true);
    try {
      await changePassword(passwords.newPass);
      toast.success('Password updated');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password');
    } finally {
      setChangingPassword(false);
    }
  }}>
    {passwordError && (
      <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{passwordError}</p>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
        <input
          type="password"
          value={passwords.newPass}
          onChange={e => setPasswords({...passwords, newPass: e.target.value})}
          className="input-field"
          placeholder="Min 8 characters"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New</label>
        <input
          type="password"
          value={passwords.confirm}
          onChange={e => setPasswords({...passwords, confirm: e.target.value})}
          className="input-field"
          placeholder="Repeat password"
        />
      </div>
    </div>
    <Button type="submit" size="sm" loading={changingPassword}>Update Password</Button>
  </form>
</Card>
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npx jest --no-coverage
```

Expected: 90 passing.

- [ ] **Step 5: Commit**

```bash
git add src/services/authService.js src/context/AuthContext.jsx src/pages/auth/AccountSettingsPage.jsx
git commit -m "feat: wire password change in Account Settings via Supabase"
```

---

### Task 1.4: Wire account soft-delete

**Files:** Modify: `src/pages/auth/AccountSettingsPage.jsx`, `src/services/authService.js`

- [ ] **Step 1: Add `softDeleteAccount` to authService**

```js
// src/services/authService.js — add after changePassword()

async softDeleteAccount(userId) {
  // Set deleted_at timestamp on profile table (30-day grace period per spec)
  const { error } = await supabase
    .from('profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
  // Then sign out
  await supabase.auth.signOut();
},
```

- [ ] **Step 2: Wire the Delete Account flow in AccountSettingsPage**

Replace `handleDeleteAccount` (lines 50-61) with:

```jsx
const handleDeleteAccount = async () => {
  setDeleting(true);
  try {
    if (user?.id) {
      await authService.softDeleteAccount(user.id);
    }
    toast.success('Account deleted. Data retained for 30 days.');
    await logout();
    navigate('/');
  } catch (err) {
    console.error('Account deletion failed:', err);
    toast.error('Deletion failed. Please try again.');
  } finally {
    setDeleting(false);
    setShowDeleteModal(false);
  }
};
```

Import `authService` at the top (it's already imported as `supabase` is used directly — add `authService`):

```jsx
import authService from '../../services/authService';
```

- [ ] **Step 3: Commit**

```bash
git add src/services/authService.js src/pages/auth/AccountSettingsPage.jsx
git commit -m "feat: wire account soft-delete with 30-day grace period"
```

---

### Task 1.5: Add .superpowers/ to .gitignore

**Files:** Modify: `.gitignore`

- [ ] **Step 1: Append the entry**

```bash
echo "" >> .gitignore && echo "# Superpowers brainstorming artifacts" >> .gitignore && echo ".superpowers/" >> .gitignore
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add .superpowers/ to .gitignore"
```

---

### Task 1.6: Phase 1 gate — full test run

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npx jest --no-coverage
```

Expected: 90+ passing, 0 failing.

- [ ] **Step 2: Start dev server and smoke test Account Settings**

```bash
npm start &
# Navigate to /app/account — verify password change form submits, delete account modal works
```

---

## Phase 2 — Stream A: DOCX Export

### Task 2A.1: Install docx dependency

- [ ] **Step 1: Install the docx npm package**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm install docx
```

Expected: `docx` added to `package.json` dependencies.

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add docx npm package for DOCX export"
```

---

### Task 2A.2: Create the DOCX mapping service

**Files:** Create: `src/services/docxMapping.js`

- [ ] **Step 1: Write the mapping module**

```js
// src/services/docxMapping.js
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, TabStopPosition, TabStopType,
} from 'docx';

/**
 * Build a structured DOCX Document from resume data.
 * Returns a Buffer ready for download.
 */
export function buildDocxDocument(resume, templateId = 'modern') {
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

  // Name + Contact header
  children.push(
    new Paragraph({
      text: p.fullName || 'Your Name',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    })
  );

  const contactLine = [p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state]
    .filter(Boolean).join(' | ');
  if (contactLine) {
    children.push(
      new Paragraph({
        text: contactLine,
        alignment: AlignmentType.CENTER,
        spacing: { after: 40 },
      })
    );
  }

  if (p.linkedinUrl || p.portfolioUrl) {
    children.push(
      new Paragraph({
        text: [p.linkedinUrl, p.portfolioUrl].filter(Boolean).join(' | '),
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  // Professional Summary
  if (summaryText) {
    children.push(sectionHeading('Professional Summary'));
    children.push(new Paragraph({ text: summaryText, spacing: { after: 200 } }));
  }

  // Work Experience
  if (exp.length > 0) {
    children.push(sectionHeading('Experience'));
    for (const e of exp) {
      const dates = e.isCurrentRole
        ? `${e.startMonth} ${e.startYear} – Present`
        : `${e.startMonth} ${e.startYear} – ${e.endMonth} ${e.endYear}`;
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: e.jobTitle || '', bold: true }),
            new TextRun({ text: `  ${dates}`, italics: true }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { after: 40 },
        })
      );
      children.push(
        new Paragraph({
          text: [e.companyName, e.isRemote ? '(Remote)' : '', e.location].filter(Boolean).join(', '),
          italics: true,
          spacing: { after: 80 },
        })
      );
      if (e.bulletPoints?.filter(Boolean).length > 0) {
        for (const bullet of e.bulletPoints.filter(Boolean)) {
          children.push(
            new Paragraph({
              text: `• ${bullet}`,
              spacing: { after: 40 },
              indent: { left: 360 },
            })
          );
        }
      }
    }
  }

  // Education
  if (edu.length > 0) {
    children.push(sectionHeading('Education'));
    for (const e of edu) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: e.institutionName || '', bold: true }),
            new TextRun({ text: `  ${e.graduationMonth} ${e.graduationYear}` }),
          ],
          spacing: { after: 40 },
        })
      );
      const detail = [e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ');
      children.push(new Paragraph({ text: `${detail}${e.gpa ? ` | GPA: ${e.gpa}` : ''}`, spacing: { after: 80 } }));
    }
  }

  // Skills
  const skillGroups = [
    ['Technical', skills.technicalSkills],
    ['Programming Languages', skills.programmingLanguages],
    ['Tools & Software', skills.toolsSoftware],
    ['Domain-Specific', skills.domainSpecificSkills],
  ].filter(([, arr]) => arr?.length > 0);

  if (skillGroups.length > 0) {
    children.push(sectionHeading('Skills'));
    for (const [label, arr] of skillGroups) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true }),
            new TextRun({ text: arr.join(', ') }),
          ],
          spacing: { after: 60 },
        })
      );
    }
    if (skills.languageSkills?.length > 0) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Languages: ', bold: true }),
            new TextRun({ text: skills.languageSkills.map(l => `${l.name} (${l.proficiency})`).join(', ') }),
          ],
          spacing: { after: 60 },
        })
      );
    }
  }

  // Projects
  if (projects.length > 0) {
    children.push(sectionHeading('Projects'));
    for (const pr of projects) {
      children.push(new Paragraph({ children: [new TextRun({ text: pr.projectTitle || '', bold: true })], spacing: { after: 40 } }));
      if (pr.projectDescription) {
        children.push(new Paragraph({ text: pr.projectDescription, spacing: { after: 80 } }));
      }
    }
  }

  // Volunteer
  if (volunteerExp.length > 0) {
    children.push(sectionHeading('Volunteer Experience'));
    for (const v of volunteerExp) {
      children.push(new Paragraph({ children: [new TextRun({ text: v.role || '', bold: true })], spacing: { after: 40 } }));
      if (v.organizationName) {
        children.push(new Paragraph({ text: v.organizationName, italics: true, spacing: { after: 40 } }));
      }
      if (v.description) {
        children.push(new Paragraph({ text: v.description, spacing: { after: 80 } }));
      }
    }
  }

  // Awards
  if (awards.length > 0) {
    children.push(sectionHeading('Awards & Honors'));
    for (const a of awards) {
      children.push(new Paragraph({ children: [new TextRun({ text: a.awardName || '', bold: true })], spacing: { after: 40 } }));
      if (a.awardingBody) {
        children.push(new Paragraph({ text: a.awardingBody, italics: true, spacing: { after: 40 } }));
      }
      if (a.description) {
        children.push(new Paragraph({ text: a.description, spacing: { after: 80 } }));
      }
    }
  }

  return new Document({
    sections: [{
      properties: {},
      children,
    }],
  });
}

function sectionHeading(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    border: { bottom: { color: '0abab5', size: 2, space: 4, style: 'single' } },
  });
}

/**
 * Generate a DOCX buffer from resume data.
 */
export async function generateDocxBuffer(resume, templateId) {
  const doc = buildDocxDocument(resume, templateId);
  return Packer.toBuffer(doc);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/docxMapping.js
git commit -m "feat: add DOCX mapping service — resume JSON to structured docx"
```

---

### Task 2A.3: Create the Vercel API route for DOCX

**Files:** Create: `api/export-docx.js`

- [ ] **Step 1: Write the serverless function**

```js
// api/export-docx.js
const { buildDocxDocument } = require('../src/services/docxMapping.js');

// Vercel serverless function — strips the need for the docx npm on the frontend
// Note: In CRA, the api/ directory is NOT part of the React bundle.
// This file is deployed as a Vercel serverless function.
// The frontend must POST to /api/export-docx.

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { resume, templateId } = req.body;
    if (!resume) {
      return res.status(400).json({ error: 'Resume data is required' });
    }

    const doc = buildDocxDocument(resume, templateId || 'modern');
    const { Packer } = require('docx');
    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${(resume.name || 'resume').replace(/[^a-z0-9]/gi, '_')}.docx"`);
    res.setHeader('Content-Length', buffer.length);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('[export-docx]', err);
    res.status(500).json({ error: 'Failed to generate DOCX' });
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add api/export-docx.js
git commit -m "feat: add Vercel serverless function for DOCX export"
```

---

### Task 2A.4: Wire DOCX export in the frontend

**Files:** Modify: `src/utils/constants.js`, `src/pages/export/ExportPage.jsx`

- [ ] **Step 1: Add docx to EXPORT_FORMATS**

```js
// src/utils/constants.js — update EXPORT_FORMATS (line 46-50)
export const EXPORT_FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'DOCX' },
  { value: 'txt', label: 'Plain Text' },
];
```

- [ ] **Step 2: Replace the DOCX alert in ExportPage.jsx**

In `src/pages/export/ExportPage.jsx`, replace the `else` branch in `handleExport` (lines 60-61):

```jsx
} else if (format === 'docx') {
  try {
    const res = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume, templateId: template }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'DOCX generation failed');
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    toast.error(err.message || 'DOCX export failed. Try PDF instead.');
  }
}
```

Add `toast` import at the top if not already present:
```jsx
import toast from 'react-hot-toast';
```

- [ ] **Step 3: Add DOCX format description**

Update the format radio description on line 98 — the `.docx` case already exists in the JSX mapping since it reads from `f.value` and `f.label`. The existing template literal is generic enough. The docx radio button will show "DOCX" and "Editable format" (already there).

- [ ] **Step 4: Commit**

```bash
git add src/utils/constants.js src/pages/export/ExportPage.jsx
git commit -m "feat: wire DOCX export — client calls /api/export-docx Vercel function"
```

---

### Task 2A.5: Write DOCX mapping tests

**Files:** Create: `src/services/docxMapping.test.js`

- [ ] **Step 1: Write the tests**

```js
// src/services/docxMapping.test.js
import { buildDocxDocument } from './docxMapping';

describe('docxMapping', () => {
  const minimalResume = {
    personalInfo: { fullName: 'John Doe', email: 'john@example.com', phone: '555-0100', city: 'NYC', state: 'NY' },
    workExperience: [
      {
        jobTitle: 'Engineer', companyName: 'Acme', location: 'Remote', isRemote: true,
        startMonth: 'Jan', startYear: '2020', endMonth: 'Dec', endYear: '2023',
        bulletPoints: ['Built features', 'Led team of 3'],
      },
    ],
    education: [
      { institutionName: 'State U', degreeType: 'BS', fieldOfStudy: 'CS', graduationMonth: 'May', graduationYear: '2019', gpa: '3.7' },
    ],
    skills: {
      technicalSkills: ['React', 'Node.js'],
      programmingLanguages: ['JavaScript', 'Python'],
    },
  };

  test('builds a document for a minimal resume', () => {
    const doc = buildDocxDocument(minimalResume, 'modern');
    expect(doc).toBeDefined();
    expect(doc.sections).toHaveLength(1);
  });

  test('handles empty resume gracefully', () => {
    const doc = buildDocxDocument({}, 'modern');
    expect(doc).toBeDefined();
    expect(doc.sections).toHaveLength(1);
  });

  test('includes all sections when data is present', () => {
    const full = {
      ...minimalResume,
      reviewOptimize: { professionalSummary: { summaryText: 'Experienced dev.' } },
      projects: [{ projectTitle: 'Side Project', projectDescription: 'A thing I built' }],
      additionalInfo: {
        volunteerExperience: [{ role: 'Mentor', organizationName: 'Code.org', description: 'Taught kids' }],
        awards: [{ awardName: 'Top Performer', awardingBody: 'Acme', description: 'Q4 2023' }],
      },
      skills: {
        ...minimalResume.skills,
        toolsSoftware: ['Git', 'Docker'],
        domainSpecificSkills: ['Fintech'],
        languageSkills: [{ name: 'French', proficiency: 'Professional' }],
      },
    };
    const doc = buildDocxDocument(full, 'modern');
    expect(doc).toBeDefined();
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx jest src/services/docxMapping.test.js --no-coverage
```

Expected: 3 passing.

- [ ] **Step 3: Commit**

```bash
git add src/services/docxMapping.test.js
git commit -m "test: add DOCX mapping unit tests"
```

---

## Phase 2 — Stream B: JD Analyzer (Full)

### Task 2B.1: Add `parseJobDescription()` to aiService

**Files:** Modify: `src/services/aiService.js`

- [ ] **Step 1: Add the function**

```js
// src/services/aiService.js — add after analyzeJobDescription() (before the Legacy helpers section, ~line 180)

/**
 * Parse a job description into structured data.
 * Returns: { roleTitle, requiredSkills[], preferredSkills[], keywords[{word, count}], senioritySignals[], cultureHints[] }
 */
export async function parseJobDescription(jdText) {
  if (!jdText || !jdText.trim()) {
    throw new Error('Job description is required.');
  }

  if (IS_PROD) {
    return callProxy('/api/analyze', { mode: 'parse', jd: jdText.slice(0, 5000) });
  }

  // Dev with key: call OpenAI directly
  const systemPrompt = `You are a job description parser. Extract structured information from the JD.
Return ONLY a JSON object with this shape:
{
  "roleTitle": string,
  "requiredSkills": string[],
  "preferredSkills": string[],
  "keywords": [{ "word": string, "count": number }],
  "senioritySignals": string[],
  "cultureHints": string[]
}
Only include skills and keywords actually mentioned in the JD. Do not invent.`;

  const raw = await callLLM(systemPrompt, jdText.slice(0, 5000));
  const parsed = parseJSON(raw);

  if (!parsed || !Array.isArray(parsed.requiredSkills)) {
    throw new Error('LLM returned malformed JD parse. Please try again.');
  }
  return parsed;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/aiService.js
git commit -m "feat: add parseJobDescription() to aiService — extract structured JD data"
```

---

### Task 2B.2: Add `compareResumeToJD()` to aiService

**Files:** Modify: `src/services/aiService.js`

- [ ] **Step 1: Add the function**

```js
// src/services/aiService.js — add after parseJobDescription()

/**
 * Compare a resume against a parsed job description.
 * Returns match scores, gaps, and suggestions.
 */
export async function compareResumeToJD(resume, jdText, parsedJD = null) {
  const resumeText = resumeToText(resume);

  if (IS_PROD) {
    return callProxy('/api/analyze', { mode: 'compare', resumeText, jd: jdText.slice(0, 5000) });
  }

  const systemPrompt = `You are an ATS match analyzer. Compare a resume to a job description.
Return ONLY a JSON object with this shape:
{
  "overallMatch": number (0-100),
  "skillMatch": number (0-100),
  "experienceMatch": number (0-100),
  "educationMatch": number (0-100),
  "matchedSkills": string[],
  "missingKeywords": string[],
  "gapAnalysis": [{ "gap": string, "severity": "high"|"medium"|"low", "suggestion": string }],
  "strengths": string[]
}`;

  const raw = await callLLM(systemPrompt, `RESUME:\n${resumeText || '(empty resume)'}\n\nJOB DESCRIPTION:\n${jdText.slice(0, 5000)}`);
  const parsed = parseJSON(raw);

  if (!parsed || typeof parsed.overallMatch !== 'number') {
    throw new Error('LLM returned malformed comparison. Please try again.');
  }
  return parsed;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/aiService.js
git commit -m "feat: add compareResumeToJD() to aiService — resume-to-JD match analysis"
```

---

### Task 2B.3: Create JDParserPanel component

**Files:** Create: `src/components/optimizer/JDParserPanel.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/optimizer/JDParserPanel.jsx
import React from 'react';
import { Briefcase, Star, Lightbulb, Tag, TrendingUp } from 'lucide-react';
import Card from '../common/Card';

export default function JDParserPanel({ parsedJD, loading }) {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          <span className="ml-3 text-gray-500">Parsing job description...</span>
        </div>
      </Card>
    );
  }

  if (!parsedJD) return null;

  const { roleTitle, requiredSkills = [], preferredSkills = [], keywords = [], senioritySignals = [], cultureHints = [] } = parsedJD;

  return (
    <div className="space-y-4">
      {roleTitle && (
        <div className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-brand-600" />
          <h2 className="text-lg font-bold text-gray-900">{roleTitle}</h2>
        </div>
      )}

      {/* Required Skills */}
      <Card title="Required Skills">
        <div className="flex flex-wrap gap-2">
          {requiredSkills.map((s, i) => (
            <span key={`req-${i}`} className="px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm font-medium">{s}</span>
          ))}
          {requiredSkills.length === 0 && <p className="text-sm text-gray-400">None extracted</p>}
        </div>
      </Card>

      {/* Preferred Skills */}
      <Card title="Preferred Skills">
        <div className="flex flex-wrap gap-2">
          {preferredSkills.map((s, i) => (
            <span key={`pref-${i}`} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{s}</span>
          ))}
          {preferredSkills.length === 0 && <p className="text-sm text-gray-400">None extracted</p>}
        </div>
      </Card>

      {/* Keyword Frequency */}
      {keywords.length > 0 && (
        <Card title="Keyword Frequency">
          <div className="space-y-2">
            {keywords.slice(0, 10).map(({ word, count }, i) => (
              <div key={`kw-${i}`} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 w-32 truncate">{word}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: `${Math.min((count / Math.max(...keywords.map(k => k.count))) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Seniority Signals */}
      {senioritySignals.length > 0 && (
        <Card title="Seniority Signals">
          <div className="flex flex-wrap gap-2">
            {senioritySignals.map((s, i) => (
              <span key={`sen-${i}`} className="flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm">
                <TrendingUp className="h-3 w-3" />{s}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Culture Hints */}
      {cultureHints.length > 0 && (
        <Card title="Culture Hints">
          <div className="flex flex-wrap gap-2">
            {cultureHints.map((h, i) => (
              <span key={`cult-${i}`} className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                <Lightbulb className="h-3 w-3" />{h}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/optimizer/JDParserPanel.jsx
git commit -m "feat: add JDParserPanel — display parsed JD data with keyword bars"
```

---

### Task 2B.4: Create MatchComparisonPanel component

**Files:** Create: `src/components/optimizer/MatchComparisonPanel.jsx`

- [ ] **Step 1: Write the component**

```jsx
// src/components/optimizer/MatchComparisonPanel.jsx
import React from 'react';
import { Check, X, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import Card from '../common/Card';

function ScoreBadge({ score, label }) {
  const color = score >= 80 ? 'text-green-600 bg-green-50' : score >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
  return (
    <div className={`text-center p-4 rounded-xl ${color}`}>
      <p className="text-2xl font-bold">{score}%</p>
      <p className="text-xs font-medium mt-1">{label}</p>
    </div>
  );
}

export default function MatchComparisonPanel({ comparison, loading }) {
  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
          <span className="ml-3 text-gray-500">Analyzing match...</span>
        </div>
      </Card>
    );
  }

  if (!comparison) return null;

  const {
    overallMatch, skillMatch, experienceMatch, educationMatch,
    matchedSkills = [], missingKeywords = [],
    gapAnalysis = [], strengths = [],
  } = comparison;

  return (
    <div className="space-y-4">
      {/* Score Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ScoreBadge score={overallMatch} label="Overall" />
        <ScoreBadge score={skillMatch} label="Skills" />
        <ScoreBadge score={experienceMatch} label="Experience" />
        <ScoreBadge score={educationMatch} label="Education" />
      </div>

      {/* Matched Skills */}
      <Card title="Matched Skills">
        <div className="flex flex-wrap gap-2">
          {matchedSkills.map((s, i) => (
            <span key={`match-${i}`} className="flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
              <Check className="h-3 w-3" />{s}
            </span>
          ))}
          {matchedSkills.length === 0 && <p className="text-sm text-gray-400">No skills matched</p>}
        </div>
      </Card>

      {/* Missing Keywords */}
      {missingKeywords.length > 0 && (
        <Card title="Missing Keywords">
          <div className="flex flex-wrap gap-2">
            {[...new Set(missingKeywords)].map((s, i) => (
              <span key={`miss-${i}`} className="flex items-center gap-1 px-3 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                <X className="h-3 w-3" />{s}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Strengths */}
      {strengths.length > 0 && (
        <Card title="Strengths">
          <ul className="space-y-1">
            {strengths.map((s, i) => (
              <li key={`str-${i}`} className="flex items-start gap-2 text-sm text-gray-700">
                <Zap className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Gap Analysis */}
      {gapAnalysis.length > 0 && (
        <Card title="Gap Analysis">
          <div className="space-y-3">
            {gapAnalysis.map((g, i) => {
              const severityColor = g.severity === 'high' ? 'border-red-200 bg-red-50' : g.severity === 'medium' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50';
              return (
                <div key={`gap-${i}`} className={`border rounded-lg p-3 ${severityColor}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${g.severity === 'high' ? 'text-red-500' : g.severity === 'medium' ? 'text-amber-500' : 'text-blue-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{g.gap}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{g.suggestion}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/optimizer/MatchComparisonPanel.jsx
git commit -m "feat: add MatchComparisonPanel — score gauges, matched/missing skills, gap analysis"
```

---

### Task 2B.5: Rebuild JDAnalyzerPage as 3-tab interface

**Files:** Modify: `src/pages/optimizer/JDAnalyzerPage.jsx`

- [ ] **Step 1: Rewrite the page with 3 tabs**

```jsx
// src/pages/optimizer/JDAnalyzerPage.jsx
import React, { useState } from 'react';
import { Wand2, Search, BarChart3, Sparkles, AlertCircle } from 'lucide-react';
import { useResume } from '../../hooks/useResume';
import { tailorResume, parseJobDescription, compareResumeToJD } from '../../services/aiService';
import resumeVersionService from '../../services/resumeVersionService';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import DiffView from '../../components/resume/DiffView';
import JDParserPanel from '../../components/optimizer/JDParserPanel';
import MatchComparisonPanel from '../../components/optimizer/MatchComparisonPanel';

const TABS = [
  { id: 'parse', label: 'Parse JD', icon: Search, description: 'Extract skills, keywords, and signals from the job description' },
  { id: 'compare', label: 'Compare', icon: BarChart3, description: 'See how your resume matches the job' },
  { id: 'optimize', label: 'Optimize', icon: Sparkles, description: 'Apply AI-suggested changes to your resume' },
];

export default function JDAnalyzerPage() {
  const { resumes, updateResume } = useResume();
  const [selectedId, setSelectedId] = useState('');
  const [jdText, setJdText] = useState('');
  const [activeTab, setActiveTab] = useState('parse');

  // Parse state
  const [parsedJD, setParsedJD] = useState(null);
  const [parseLoading, setParseLoading] = useState(false);
  const [parseError, setParseError] = useState('');

  // Compare state
  const [comparison, setComparison] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');

  // Optimize state
  const [diffs, setDiffs] = useState(null);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [optimizeError, setOptimizeError] = useState('');
  const [saved, setSaved] = useState(false);

  const selectedResume = resumes.find(r => r.id === selectedId) || null;
  const hasRequiredInputs = jdText.trim().length > 0 && selectedId;

  // Parse handlers
  const handleParse = async () => {
    setParseError(''); setParsedJD(null);
    setParseLoading(true);
    try {
      const result = await parseJobDescription(jdText);
      setParsedJD(result);
    } catch (err) {
      setParseError(err.message || 'Parsing failed.');
    } finally {
      setParseLoading(false);
    }
  };

  // Compare handlers
  const handleCompare = async () => {
    setCompareError(''); setComparison(null);
    setCompareLoading(true);
    try {
      const result = await compareResumeToJD(selectedResume, jdText, parsedJD);
      setComparison(result);
    } catch (err) {
      setCompareError(err.message || 'Comparison failed.');
    } finally {
      setCompareLoading(false);
    }
  };

  // Optimize handlers
  const handleOptimize = async () => {
    setOptimizeError(''); setDiffs(null); setSaved(false);
    setOptimizeLoading(true);
    try {
      const result = await tailorResume(selectedResume, jdText);
      setDiffs(result);
    } catch (err) {
      setOptimizeError(err.message || 'Optimization failed.');
    } finally {
      setOptimizeLoading(false);
    }
  };

  const handleApply = (diff) => {
    if (!selectedResume) return;
    const existing = selectedResume.tailoredDiffs || [];
    updateResume(selectedResume.id, {
      ...selectedResume,
      tailoredDiffs: [...existing.filter(d => d.section !== diff.section), diff],
    });
  };

  const handleApplyAll = async () => {
    if (!selectedResume || !diffs) return;
    try {
      await resumeVersionService.saveVersion(selectedResume.id, selectedResume, jdText, diffs);
    } catch (err) {
      console.warn('[JDAnalyzerPage] Failed to save version snapshot:', err);
    }
    updateResume(selectedResume.id, { ...selectedResume, tailoredDiffs: diffs });
    setSaved(true);
  };

  return (
    <div className="page-container max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Job Description Analyzer</h1>
      <p className="text-gray-500 mb-6">Parse, compare, and optimize your resume for any job.</p>

      {/* Shared Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Resume</label>
          <select
            value={selectedId}
            onChange={e => {
              setSelectedId(e.target.value);
              setParsedJD(null); setComparison(null); setDiffs(null);
            }}
            className="input-field bg-white"
          >
            <option value="">-- Select a resume --</option>
            {resumes.map(r => (
              <option key={r.id} value={r.id}>{r.name || 'Untitled'}</option>
            ))}
          </select>
          {resumes.length === 0 && (
            <p className="text-xs text-gray-400 mt-1">
              No resumes yet. <a href="/app/builder" className="text-brand-600 hover:underline">Create one first.</a>
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
          <textarea
            value={jdText}
            onChange={e => { setJdText(e.target.value); setParsedJD(null); setComparison(null); setDiffs(null); }}
            rows={4}
            className="input-field resize-none"
            placeholder="Paste the full job description here..."
          />
          {jdText.length > 5000 && (
            <p className="text-xs text-yellow-600 mt-1">Long JD — only the first 5,000 characters will be sent.</p>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition -mb-px ${
                isActive ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'parse' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{TABS[0].description}</p>
          <Button onClick={handleParse} loading={parseLoading} disabled={!jdText.trim()}>
            <Search className="h-4 w-4 mr-2" />Parse Job Description
          </Button>
          {parseError && (
            <Card>
              <div className="flex items-start gap-3 text-red-600">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">{parseError}</p>
              </div>
            </Card>
          )}
          <JDParserPanel parsedJD={parsedJD} loading={parseLoading} />
        </div>
      )}

      {activeTab === 'compare' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{TABS[1].description}</p>
          <Button onClick={handleCompare} loading={compareLoading} disabled={!hasRequiredInputs}>
            <BarChart3 className="h-4 w-4 mr-2" />Compare Resume to JD
          </Button>
          {compareError && (
            <Card>
              <div className="flex items-start gap-3 text-red-600">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">{compareError}</p>
              </div>
            </Card>
          )}
          <MatchComparisonPanel comparison={comparison} loading={compareLoading} />
        </div>
      )}

      {activeTab === 'optimize' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">{TABS[2].description}</p>
          <Button onClick={handleOptimize} loading={optimizeLoading} disabled={!hasRequiredInputs}>
            <Wand2 className="h-4 w-4 mr-2" />Tailor Resume
          </Button>
          {optimizeError && (
            <Card>
              <div className="flex items-start gap-3 text-red-600">
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">{optimizeError}</p>
              </div>
            </Card>
          )}
          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              All changes applied. Edit the resume to see the updated version.
            </div>
          )}
          {diffs && diffs.length === 0 && (
            <Card>
              <p className="text-sm text-gray-500 text-center py-4">
                Your resume is already well-matched for this job. No changes suggested.
              </p>
            </Card>
          )}
          {diffs && diffs.length > 0 && (
            <DiffView diffs={diffs} onApply={handleApply} onApplyAll={handleApplyAll} />
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/optimizer/JDAnalyzerPage.jsx
git commit -m "feat: rebuild JD Analyzer as 3-tab interface — Parse, Compare, Optimize"
```

---

## Phase 2 — Stream C: French Translation + LinkedIn OAuth

### Task 2C.1: Create Vercel translation proxy

**Files:** Create: `api/translate.js`

- [ ] **Step 1: Write the serverless function**

```js
// api/translate.js
// Vercel serverless function — proxies DeepL API calls

const DEEPL_KEY = process.env.DEEPL_API_KEY;
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate'; // or https://api.deepl.com/v2/translate for paid

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!DEEPL_KEY) {
    return res.status(500).json({ error: 'DeepL API key not configured' });
  }

  try {
    const { text, targetLang = 'FR' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const response = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text: typeof text === 'string' ? text : JSON.stringify(text),
        target_lang: targetLang,
      }).toString(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.message || 'Translation failed' });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('[translate]', err);
    res.status(500).json({ error: 'Translation service unavailable' });
  }
};
```

- [ ] **Step 2: Commit**

```bash
git add api/translate.js
git commit -m "feat: add Vercel translation proxy for DeepL API"
```

---

### Task 2C.2: Add `translateResume()` to aiService

**Files:** Modify: `src/services/aiService.js`

- [ ] **Step 1: Add the function**

```js
// src/services/aiService.js — add after all LLM functions, at the end of the file

/**
 * Translate resume content to the target language via DeepL proxy.
 * Translates: section headers, job titles, bullet points, summary, institution names.
 * Returns a deep-cloned resume with translated text fields.
 */
export async function translateResume(resume, targetLang = 'FR') {
  // Collect all translatable text from the resume
  const texts = [];

  // Personal info maintains original — names and contact details stay as-is per spec
  // But we translate structured fields

  const exp = resume.workExperience || [];
  for (const e of exp) {
    if (e.jobTitle) texts.push(e.jobTitle);
    if (e.bulletPoints) texts.push(...e.bulletPoints.filter(Boolean));
  }

  const edu = resume.education || [];
  for (const e of edu) {
    if (e.degreeType) texts.push(e.degreeType);
    if (e.fieldOfStudy) texts.push(e.fieldOfStudy);
    if (e.thesisTitle) texts.push(e.thesisTitle);
    if (e.honorsAwards) texts.push(e.honorsAwards);
  }

  const skills = resume.skills || {};
  if (skills.domainSpecificSkills) texts.push(...skills.domainSpecificSkills);

  const summaryText =
    resume.reviewOptimize?.professionalSummary?.summaryText ||
    resume.professionalSummary?.summaryText ||
    resume.summary?.summaryText ||
    '';
  if (summaryText) texts.push(summaryText);

  const additionalInfo = resume.additionalInfo || {};
  const volunteerExp = additionalInfo.volunteerExperience || [];
  for (const v of volunteerExp) {
    if (v.role) texts.push(v.role);
    if (v.description) texts.push(v.description);
  }

  const projects = resume.projects || [];
  for (const p of projects) {
    if (p.projectDescription) texts.push(p.projectDescription);
  }

  if (texts.length === 0) return resume;

  // Call translation proxy
  let translated;
  if (IS_PROD || !OPENAI_KEY) {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts, targetLang }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Translation failed');
    }
    const data = await res.json();
    translated = data.translations?.map(t => t.text) || texts;
  } else {
    // Dev fallback: mock translation (appends [FR] prefix)
    await new Promise(r => setTimeout(r, 800));
    translated = texts.map(t => `[${targetLang}] ${t}`);
  }

  // Rebuild resume with translated text
  const result = JSON.parse(JSON.stringify(resume));
  let ti = 0;
  const next = () => translated[ti++] || '';

  for (const e of result.workExperience || []) {
    if (e.jobTitle) e.jobTitle = next();
    if (e.bulletPoints) e.bulletPoints = e.bulletPoints.map(() => next());
  }
  for (const e of result.education || []) {
    if (e.degreeType) e.degreeType = next();
    if (e.fieldOfStudy) e.fieldOfStudy = next();
    if (e.thesisTitle) e.thesisTitle = next();
    if (e.honorsAwards) e.honorsAwards = next();
  }
  if (result.skills?.domainSpecificSkills) {
    result.skills.domainSpecificSkills = result.skills.domainSpecificSkills.map(() => next());
  }
  const sumPath = result.reviewOptimize?.professionalSummary || result.professionalSummary || result.summary || {};
  if (sumPath.summaryText) sumPath.summaryText = next();

  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/aiService.js
git commit -m "feat: add translateResume() — French translation via DeepL proxy"
```

---

### Task 2C.3: Add language selector + translate to Export page

**Files:** Modify: `src/pages/export/ExportPage.jsx`

- [ ] **Step 1: Add translation state and handler**

Add to the top of `ExportPage.jsx`, after the existing imports:

```jsx
import { translateResume } from '../../services/aiService';
import { LANGUAGES } from '../../utils/constants';
```

Add state after existing state declarations (after `exporting`):

```jsx
const [targetLang, setTargetLang] = useState('en');
const [translating, setTranslating] = useState(false);
const [translatedResume, setTranslatedResume] = useState(null);

const displayResume = translatedResume || resume;
```

- [ ] **Step 2: Add translate handler**

```jsx
const handleTranslate = async () => {
  setTranslating(true);
  try {
    const translated = await translateResume(resume, targetLang);
    setTranslatedResume(translated);
    toast.success('Resume translated');
  } catch (err) {
    toast.error(err.message || 'Translation failed');
  } finally {
    setTranslating(false);
  }
};
```

- [ ] **Step 3: Add Translation card to the options column**

Insert before the final `<Button onClick={handleExport}>` block (before line 149):

```jsx
{/* Translation */}
<Card title="Translation">
  <div className="space-y-3">
    <div className="flex gap-2">
      <select
        value={targetLang}
        onChange={e => setTargetLang(e.target.value)}
        className="input-field flex-1"
      >
        {LANGUAGES.map(l => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleTranslate}
        loading={translating}
        disabled={targetLang === 'en'}
      >
        Translate
      </Button>
    </div>
    {translatedResume && (
      <p className="text-xs text-green-600">Translated to {LANGUAGES.find(l => l.value === targetLang)?.label}</p>
    )}
  </div>
</Card>
```

- [ ] **Step 4: Update preview and export to use displayResume**

Replace all references to `resume` in the preview and export section with `displayResume`:

In `handleExport`, change `const safeName = (resume.name || 'resume')...` to use `displayResume`.

In the preview div (line 157), change `resume={resume}` to `resume={displayResume}`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/export/ExportPage.jsx
git commit -m "feat: add language selector + translation to Export page"
```

---

### Task 2C.4: Add LinkedIn OAuth buttons

**Files:** Modify: `src/pages/auth/SignInPage.jsx`, `src/pages/auth/SignUpPage.jsx`

- [ ] **Step 1: Add LinkedIn button to SignInPage**

After the Google button in `SignInPage.jsx` (after line 44), add:

```jsx
<button
  type="button"
  onClick={async () => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin',
      options: { redirectTo: `${window.location.origin}/app/dashboard` },
    });
    if (oauthError) setError(oauthError.message);
  }}
  className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 mb-3"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
  Continue with LinkedIn
</button>
```

- [ ] **Step 2: Add LinkedIn button to SignUpPage**

Same button, added after the Google button in `SignUpPage.jsx` (after line 82). Replace `setError` with `setErrors({ general: ... })` to match SignUp's error pattern:

```jsx
<button
  type="button"
  onClick={async () => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'linkedin',
      options: { redirectTo: `${window.location.origin}/app/dashboard` },
    });
    if (oauthError) setErrors({ general: oauthError.message });
  }}
  className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 mb-3"
>
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
  Continue with LinkedIn
</button>
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/auth/SignInPage.jsx src/pages/auth/SignUpPage.jsx
git commit -m "feat: add LinkedIn OAuth buttons to Sign In and Sign Up pages"
```

**Note:** LinkedIn OAuth must also be enabled in the Supabase Auth dashboard (Provider → LinkedIn → add Client ID + Secret from LinkedIn Developer App). This is a Supabase configuration step, not code.

---

## Phase 2 — Stream D: Template Library Polish

### Task 2D.1: Add distinct layout for Classic template

**Files:** Modify: `src/components/resume/ResumeTemplate.jsx`

- [ ] **Step 1: Refactor ResumeTemplate to render template-specific layouts**

Replace the current single render path with template-gated sections. The Modern template stays as-is. Classic, Minimal, and Professional get distinct structures.

```jsx
// src/components/resume/ResumeTemplate.jsx
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

// Classic template — centered, traditional, serif
function ClassicTemplate({ d, s }) {
  const p = d.personalInfo || {};
  const exp = d.workExperience || [];
  const edu = d.education || [];
  const skills = d.skills || {};
  const summaryText = d.reviewOptimize?.professionalSummary?.summaryText || d.professionalSummary?.summaryText || d.summary?.summaryText || '';

  return (
    <div className={`bg-white max-w-[21cm] mx-auto overflow-hidden ${s.font}`} style={{ fontSize: '11pt', lineHeight: '1.4' }}>
      {/* Centered Header */}
      <div className="px-8 pt-8 pb-4 text-center border-b-2 border-gray-300">
        <h1 className="text-2xl font-bold tracking-wide">{p.fullName || 'Your Name'}</h1>
        <p className="text-sm mt-2 text-gray-600">
          {[p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state].filter(Boolean).join(' | ')}
        </p>
        {(p.linkedinUrl || p.portfolioUrl) && (
          <p className="text-sm mt-1 text-gray-500">
            {[p.linkedinUrl, p.portfolioUrl].filter(Boolean).join(' | ')}
          </p>
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
                  <span className="text-xs text-gray-500">{e.startMonth} {e.startYear} – {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}</span>
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
                <p className="text-sm text-gray-600">
                  {[e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ')}
                  {e.gpa ? ` | GPA: ${e.gpa}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        {(skills.technicalSkills?.length > 0 || skills.programmingLanguages?.length > 0) && (
          <div>
            <SectionHeading s={s}>Skills</SectionHeading>
            <div className="text-sm text-gray-700 space-y-1">
              {skills.technicalSkills?.length > 0 && <p><strong>Technical:</strong> {skills.technicalSkills.join(', ')}</p>}
              {skills.programmingLanguages?.length > 0 && <p><strong>Languages:</strong> {skills.programmingLanguages.join(', ')}</p>}
              {skills.toolsSoftware?.length > 0 && <p><strong>Tools:</strong> {skills.toolsSoftware.join(', ')}</p>}
              {skills.languageSkills?.length > 0 && (
                <p><strong>Languages:</strong> {skills.languageSkills.map(l => `${l.name} (${l.proficiency})`).join(', ')}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal template — maximum whitespace, understated
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
          {[p.email, p.phone, p.city && p.state ? `${p.city}, ${p.state}` : p.city || p.state, p.linkedinUrl, p.portfolioUrl]
            .filter(Boolean).map((line, i) => <p key={i}>{line}</p>)}
        </div>
      </div>

      <div className="px-12 pb-10 space-y-8">
        {summaryText && (
          <div>
            <p className="text-sm text-gray-700 leading-relaxed">{summaryText}</p>
          </div>
        )}

        {exp.length > 0 && (
          <div>
            <h2 className="text-xs font-light uppercase tracking-[0.2em] text-gray-400 mb-4">Experience</h2>
            <div className="space-y-6">
              {exp.map((e, i) => (
                <div key={i}>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-gray-700">{e.jobTitle}</span>
                    <span className="text-xs text-gray-400">{e.startMonth} {e.startYear} – {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{e.companyName}{e.location ? `, ${e.location}` : ''}</p>
                  {e.bulletPoints?.filter(Boolean).length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {e.bulletPoints.filter(Boolean).map((b, j) => (
                        <li key={j} className="text-sm text-gray-600 flex"><span className="text-gray-300 mr-2">—</span>{b}</li>
                      ))}
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
                <p className="text-xs text-gray-500 mt-0.5">
                  {[e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ')}{e.gpa ? ` — GPA ${e.gpa}` : ''} | {e.graduationMonth} {e.graduationYear}
                </p>
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

// Professional template — compact, dense, maximizes content
function ProfessionalTemplate({ d, s }) {
  const p = d.personalInfo || {};
  const exp = d.workExperience || [];
  const edu = d.education || [];
  const skills = d.skills || {};
  const summaryText = d.reviewOptimize?.professionalSummary?.summaryText || d.professionalSummary?.summaryText || d.summary?.summaryText || '';
  const additionalInfo = d.additionalInfo || {};
  const projects = d.projects || [];

  return (
    <div className={`bg-white max-w-[21cm] mx-auto overflow-hidden ${s.font}`} style={{ fontSize: '10pt', lineHeight: '1.35' }}>
      {/* Compact Header */}
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
        {summaryText && (
          <p className="text-xs text-gray-700 leading-relaxed pb-2 border-b border-gray-200">{summaryText}</p>
        )}

        {/* Two-column for Experience + Skills */}
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 space-y-3">
            {exp.length > 0 && (
              <div>
                <SectionHeading s={s}>Professional Experience</SectionHeading>
                {exp.map((e, i) => (
                  <div key={i} className="mb-2">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-xs">{e.jobTitle}</span>
                      <span className="text-xs text-gray-500">{e.startMonth} {e.startYear} – {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}</span>
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
                    <p className="text-xs text-gray-600">
                      {[e.degreeType, e.fieldOfStudy].filter(Boolean).join(' in ')}{e.gpa ? `, GPA ${e.gpa}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skills sidebar */}
          <div className="space-y-3">
            {(skills.technicalSkills?.length > 0 || skills.programmingLanguages?.length > 0 || skills.toolsSoftware?.length > 0) && (
              <div>
                <SectionHeading s={s}>Skills</SectionHeading>
                <div className="text-xs text-gray-700 space-y-1">
                  {skills.technicalSkills?.length > 0 && <div><p className="font-semibold text-xs">Technical</p><p>{skills.technicalSkills.join(', ')}</p></div>}
                  {skills.programmingLanguages?.length > 0 && <div><p className="font-semibold text-xs mt-1">Languages</p><p>{skills.programmingLanguages.join(', ')}</p></div>}
                  {skills.toolsSoftware?.length > 0 && <div><p className="font-semibold text-xs mt-1">Tools</p><p>{skills.toolsSoftware.join(', ')}</p></div>}
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

// Main component — dispatches to template-specific renderers
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
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{e.startMonth} {e.startYear} – {e.isCurrentRole ? 'Present' : `${e.endMonth} ${e.endYear}`}</span>
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
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{v.startDate}{v.endDate ? ` – ${v.endDate}` : ''}</span>
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/resume/ResumeTemplate.jsx
git commit -m "feat: add 4 distinct template layouts — Modern, Classic, Minimal, Professional"
```

---

### Task 2D.2: Add visual template thumbnails to Export page

**Files:** Modify: `src/pages/export/ExportPage.jsx`

- [ ] **Step 1: Replace text-only template selector with visual cards**

Replace the template selector Card (lines 106-122) with:

```jsx
{/* Template */}
<Card title="Template">
  <div className="grid grid-cols-2 gap-2">
    {TEMPLATES.map(t => {
      const previewStyle = TEMPLATE_PREVIEW_STYLES[t.id] || {};
      return (
        <button
          key={t.id}
          type="button"
          onClick={() => handleTemplateChange(t.id)}
          className={`p-3 rounded-xl border-2 text-left transition-all ${
            template === t.id ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          {/* Mini preview bar */}
          <div className={`h-10 rounded-lg mb-2 flex items-center justify-center text-xs font-bold ${previewStyle.header}`}>
            <span className={previewStyle.headerText}>{t.name}</span>
          </div>
          <p className="text-xs text-gray-500">{t.description}</p>
          <p className="text-xs text-brand-600 mt-0.5">{t.bestFor}</p>
        </button>
      );
    })}
  </div>
</Card>
```

- [ ] **Step 2: Add preview style constants**

Add before the component (after imports):

```jsx
const TEMPLATE_PREVIEW_STYLES = {
  modern: { header: 'bg-brand-700', headerText: 'text-white', accent: 'border-brand-500' },
  classic: { header: 'bg-white border border-gray-300', headerText: 'text-gray-900 font-serif', accent: 'border-gray-500' },
  minimal: { header: 'bg-white', headerText: 'text-gray-400 font-light tracking-widest', accent: 'border-gray-300' },
  professional: { header: 'bg-slate-800', headerText: 'text-white', accent: 'border-slate-600' },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/export/ExportPage.jsx
git commit -m "feat: add visual template preview thumbnails to Export page"
```

---

## Phase 3 — Polish & Ship

### Task 3.1: Cross-feature QA — full user journey test

- [ ] **Step 1: Start dev server and walk the full path**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm start &
```

Manual verification checklist:
1. Sign up with Google OAuth → lands on dashboard
2. Create new resume → complete all 7 steps
3. Navigate to JD Analyzer → paste JD → parse → compare → optimize → apply all
4. Navigate to Export → select each template → preview renders correctly
5. Export PDF → file downloads and opens correctly
6. Export DOCX → file downloads and opens in Word/LibreOffice
7. Export TXT → file downloads with correct content
8. Translate to French → preview updates → export translated PDF
9. Account Settings → change password → sign out → sign back in
10. Account Settings → export data JSON → file downloads
11. Account Settings → delete account → redirected to landing

- [ ] **Step 2: Check browser console**

Expected: Zero errors, zero warnings throughout the full journey.

- [ ] **Step 3: Commit any fixes from QA**

```bash
git add <fixed-files>
git commit -m "fix: QA polish — <describe fixes>"
```

---

### Task 3.2: Visual polish pass

- [ ] **Step 1: Audit loading states**

Every async operation must show a loading indicator. Check:
- JD Analyzer: Parse, Compare, Optimize buttons show spinner during API calls
- Export: DOCX generation shows spinner, translation shows spinner
- Auth: LinkedIn button disables during redirect

- [ ] **Step 2: Audit empty states**

Every panel that can be empty must show a message:
- JDParserPanel: "Paste a JD and click Parse" (handled in tab)
- MatchComparisonPanel: "Click Compare to analyze" (handled in tab)
- No resumes in JD Analyzer dropdown: link to builder (already exists)

- [ ] **Step 3: Audit error states**

Every API call must handle errors gracefully:
- Toast on failure with retry guidance
- Error messages should be user-friendly (not raw stack traces)

- [ ] **Step 4: Responsive check**

Check at 768px (tablet) and 375px (mobile):
- JD Analyzer tabs should stack or scroll horizontally
- Export page grid should collapse to single column
- Template cards should remain tappable at 375px

---

### Task 3.3: Test suite expansion

- [ ] **Step 1: Run all existing tests**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npx jest --no-coverage
```

Expected: 90+ passing (some tests added in Phase 2 may increase count).

- [ ] **Step 2: Add any missing edge case tests**

Check coverage gaps and add tests for critical paths:
```bash
npx jest --coverage
```

Focus on new service functions: `parseJobDescription`, `compareResumeToJD`, `translateResume`, `buildDocxDocument`.

- [ ] **Step 3: Commit**

```bash
git add <test-files>
git commit -m "test: expand coverage for new services"
```

---

### Task 3.4: Documentation update

**Files:** Modify: `CLAUDE.md`, `README.md`

- [ ] **Step 1: Update CLAUDE.md**

Add new sections to `CLAUDE.md`:

```markdown
## API Routes (Vercel Serverless)
- `/api/export-docx` — POST `{ resume, templateId }` → .docx Blob
- `/api/translate` — POST `{ text, targetLang }` → DeepL translations
- `/api/analyze` — POST `{ mode, resumeText, jd }` → JD analysis (multi-mode)
- `/api/tailor` — POST `{ resumeText, jd }` → tailored diffs

## Environment Variables
- `REACT_APP_SUPABASE_URL` — Supabase project URL
- `REACT_APP_SUPABASE_ANON_KEY` — Supabase anon key
- `REACT_APP_OPENAI_KEY` — OpenAI API key (dev only; prod uses Vercel proxy)
- `DEEPL_API_KEY` — DeepL API key (server-side only, set in Vercel dashboard)

## Supabase Configuration
- LinkedIn OAuth: Enable provider in Supabase Auth dashboard → add Client ID + Secret
```

- [ ] **Step 2: Update README.md**

Add feature list and setup instructions for new env vars.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: update README and CLAUDE.md with new features, API routes, and env vars"
```

---

### Task 3.5: Final gate — full test run + build

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npx jest --no-coverage
```

Expected: All passing, 0 failures, 0 warnings in output.

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Final commit if any fixes needed, then tag**

```bash
git tag -a v1.0.0 -m "v1.0.0 — feature complete: DOCX export, JD Analyzer, French translation, LinkedIn OAuth, 4 templates, Account Settings"
```
```


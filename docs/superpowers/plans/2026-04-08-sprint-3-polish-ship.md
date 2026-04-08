# Sprint 3 — Polish + Ship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get the product to a state where it can be shown to real users — working PDF export, a landing page that communicates the actual product value, and guardrails for unauthenticated users.

**Architecture:** Three independent workstreams: (1) client-side PDF/text export using `html2pdf.js` + `resumeToText`, (2) landing page redesign (hero rewrite, section collapse), (3) auth-dependent UX polish (demo banner, localStorage migration). Tasks 1-3 are independent of Sprint 2. Tasks 4-5 require Sprint 2 Supabase auth to be live.

**Tech Stack:** `html2pdf.js` for PDF, React (no new deps for landing/banner/migration)

---

## Dependencies

| Task | Requires Sprint 2? |
|------|-------------------|
| Task 1: PDF + text export | No — works with localStorage |
| Task 2: Landing page hero | No |
| Task 3: Landing page section overhaul | No |
| Task 4: Demo mode banner | YES — needs Supabase `isAuthenticated` |
| Task 5: Auth data migration | YES — needs Supabase auth + resumeService |

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/export/ExportPage.jsx` | Modify | Wire real PDF + plain text export |
| `src/utils/exportUtils.js` | Create | `exportAsPDF(elementId, filename)` + `exportAsText(resume, filename)` |
| `src/pages/landing/LandingPage.jsx` | Replace | New 2-col hero, collapsed sections, stronger copy |
| `src/components/landing/ProductPreview.jsx` | Create | Inline HTML/CSS mockup of the DiffView for the hero |
| `src/components/common/DemoModeBanner.jsx` | Create | "You're in demo mode" sticky banner |
| `src/components/layout/AppLayout.jsx` | Modify | Mount `DemoModeBanner` when `!isAuthenticated` |
| `src/context/ResumeContext.jsx` | Modify | On Supabase auth: check localStorage for orphaned resumes, offer migration |
| `src/components/common/MigrationPrompt.jsx` | Create | Modal: "Import your X saved resumes?" |

---

## Task 1: PDF + Text Export (no Sprint 2 dependency)

Replace the `alert()` stub in ExportPage with real export logic.
- **PDF**: `html2pdf.js` captures the visible `<ResumeTemplate>` DOM node
- **Plain text**: uses `resumeToText` (already exists) to generate `.txt`
- **DOCX**: deferred — complexity outweighs value for Sprint 3

**Files:**
- Create: `src/utils/exportUtils.js`
- Modify: `src/pages/export/ExportPage.jsx`

- [ ] **Step 1.1: Install `html2pdf.js`**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm install html2pdf.js
```

Expected: `html2pdf.js` appears in `package.json` dependencies.

- [ ] **Step 1.2: Create `src/utils/exportUtils.js`**

```js
import html2pdf from 'html2pdf.js';
import { resumeToText } from './resumeToText';

/**
 * Capture a DOM element and download it as a PDF.
 * @param {string} elementId - the id of the element to capture
 * @param {string} filename - e.g. "john-doe-resume"
 */
export async function exportAsPDF(elementId, filename) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found in DOM`);

  const opt = {
    margin:       [10, 10, 10, 10],   // mm: top, right, bottom, left
    filename:     `${filename}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true, logging: false },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
  };

  await html2pdf().set(opt).from(element).save();
}

/**
 * Generate a plain-text resume and trigger a .txt download.
 * @param {object} resume - resume data object
 * @param {string} filename - e.g. "john-doe-resume"
 */
export function exportAsText(resume, filename) {
  const text = resumeToText(resume);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 1.3: Add `id` to the resume preview element in `ExportPage.jsx`**

Find the preview `<div>` wrapping `<ResumeTemplate>` (currently at line 117) and add `id="resume-export-target"`:

```jsx
<div id="resume-export-target" className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 min-h-[600px] sticky top-6">
  <ResumeTemplate resume={resume} />
</div>
```

- [ ] **Step 1.4: Wire real export in `ExportPage.jsx`**

Add import at the top:

```js
import { exportAsPDF, exportAsText } from '../../utils/exportUtils';
import { resumeToText } from '../../utils/resumeToText';
```

Replace the `handleExport` function and remove the DOCX option from the format selector:

```js
const handleExport = async () => {
  setExporting(true);
  try {
    const safeFilename = (resume.personalInfo?.fullName || 'resume')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    if (format === 'pdf') {
      await exportAsPDF('resume-export-target', safeFilename);
    } else if (format === 'txt') {
      exportAsText(resume, safeFilename);
    }
    // DOCX deferred to Sprint 4
  } catch (err) {
    console.error('[ExportPage]', err);
    // Show a toast so the user knows something went wrong
    // (react-hot-toast is already in the project)
    const toast = (await import('react-hot-toast')).default;
    toast.error('Export failed: ' + err.message);
  } finally {
    setExporting(false);
  }
};
```

Update the `EXPORT_FORMATS` usage to exclude DOCX for now — or just update the label to say "(coming soon)". The simpler change is to update the button label and disable DOCX:

In the format Card, update the DOCX option label:

```jsx
{EXPORT_FORMATS.map(f => (
  <label
    key={f.value}
    className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
      f.value === 'docx'
        ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
        : format === f.value ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <input
      type="radio"
      name="format"
      value={f.value}
      checked={format === f.value}
      onChange={() => { if (f.value !== 'docx') setFormat(f.value); }}
      className="sr-only"
      disabled={f.value === 'docx'}
    />
    <FileType className="h-5 w-5 mr-3 text-gray-500" />
    <div>
      <div className="text-sm font-medium text-gray-900">
        {f.label}{f.value === 'docx' ? ' (coming soon)' : ''}
      </div>
      <div className="text-xs text-gray-500">
        {f.value === 'pdf' ? 'Best for applications' : f.value === 'docx' ? 'Editable format' : 'Plain text'}
      </div>
    </div>
  </label>
))}
```

- [ ] **Step 1.5: Verify PDF export**

```bash
npm start
```

1. Sign in → create a resume with at least a name and one work experience
2. Navigate to `/app/export/{id}`
3. Select "PDF" format → click "Download PDF"
4. A PDF file should download. Open it — should look like the preview
5. Select "Plain Text" → click "Download TXT"
6. Open the `.txt` file — should contain readable resume content

- [ ] **Step 1.6: Commit**

```bash
git add src/utils/exportUtils.js src/pages/export/ExportPage.jsx package.json package-lock.json
git commit -m "feat: implement PDF and plain text resume export with html2pdf.js"
```

---

## Task 2: Landing Page Hero Rewrite

The current hero is generic ("Build ATS-Optimized Resumes with AI" — AI Slop pattern #9). Replace with a 2-column layout: copy on the left, a product preview mockup on the right. The copy leads with user pain per the TODOS.md: "The design doc's core thesis — 'submit hoping for the best' — should be in the headline."

**Files:**
- Create: `src/components/landing/ProductPreview.jsx`
- Modify: `src/pages/landing/LandingPage.jsx` (hero section only)

- [ ] **Step 2.1: Create `src/components/landing/ProductPreview.jsx`**

This is a static HTML/CSS mockup of the DiffView component — gives visitors a preview of what the product actually does before they sign up.

```jsx
import React from 'react';
import { Check } from 'lucide-react';

/**
 * Static product preview for the landing page hero.
 * Shows a realistic mockup of the AI Tailor diff view.
 */
export default function ProductPreview() {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      {/* Browser chrome */}
      <div className="bg-gray-900 rounded-t-xl px-4 py-2.5 flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-400" />
        <div className="w-3 h-3 rounded-full bg-green-400" />
        <div className="ml-3 flex-1 bg-gray-800 rounded-md px-3 py-1 text-xs text-gray-400 font-mono">
          scopusresume.com/app/jd-analyzer
        </div>
      </div>

      {/* App content */}
      <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl overflow-hidden shadow-2xl">
        {/* Page header */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">AI Tailor</p>
          <p className="text-sm text-gray-400">2 changes suggested · 1 applied</p>
        </div>

        {/* Diff card 1 — applied */}
        <div className="border-b border-green-100 bg-green-50/40">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-gray-700">Professional Summary</span>
            </div>
            <span className="text-xs text-green-600 font-medium">Applied</span>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4 pb-4">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase mb-1">Original</p>
              <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-500 leading-relaxed">
                Software engineer with 4 years experience in web development.
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-green-600 uppercase mb-1">Tailored</p>
              <div className="bg-green-100 rounded-lg p-2.5 text-xs text-green-800 leading-relaxed">
                Full-stack engineer with 4 years delivering TypeScript + React applications at scale. Reduced deploy time 40% at Acme Corp.
              </div>
            </div>
          </div>
        </div>

        {/* Diff card 2 — pending */}
        <div className="border-b border-gray-100">
          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Work Experience: Acme Corp</span>
            <button className="text-xs font-medium text-brand-600 px-2 py-1 rounded hover:bg-brand-50">
              Apply
            </button>
          </div>
        </div>

        {/* Score indicator */}
        <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
          <span className="text-xs text-gray-500">ATS Match Score</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 line-through">43%</span>
            <span className="text-sm font-bold text-green-600">81%</span>
          </div>
        </div>
      </div>

      {/* Decorative glow */}
      <div className="absolute -bottom-4 -right-4 w-40 h-40 bg-brand-400 rounded-full opacity-10 blur-2xl pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 2.2: Replace the hero section in `LandingPage.jsx`**

Replace only the `{/* Hero */}` section (lines 27-38 in the current file). The rest of the page stays unchanged for now.

```jsx
{/* Hero */}
<section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
    <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
      {/* Copy */}
      <div>
        <p className="text-brand-600 font-semibold text-sm uppercase tracking-wide mb-4">
          AI Resume Tailoring
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight tracking-tight">
          You apply.<br />
          You wait.<br />
          <span className="text-brand-600">You never hear why.</span>
        </h1>
        <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-md">
          ScopusResume shows you exactly what your resume is missing for each job — and rewrites it to match. No more guessing.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/signup"
            className="btn-primary text-base px-7 py-3 inline-flex items-center justify-center"
          >
            Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
          <a
            href="#how-it-works"
            className="btn-secondary text-base px-7 py-3 inline-flex items-center justify-center"
          >
            See How It Works
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">No credit card required.</p>
      </div>

      {/* Product preview */}
      <div className="hidden lg:block">
        <ProductPreview />
      </div>
    </div>
  </div>
</section>
```

Also add the import at the top of `LandingPage.jsx`:

```js
import ProductPreview from '../../components/landing/ProductPreview';
```

- [ ] **Step 2.3: Verify hero looks right**

```bash
npm start
```

Open `http://localhost:3000`. Check:
- 2-column layout: copy left, product mockup right
- Mockup is hidden on mobile (only shows on `lg:` screens)
- Copy reads: "You apply. / You wait. / You never hear why."
- Both CTAs are present

- [ ] **Step 2.4: Commit**

```bash
git add src/components/landing/ProductPreview.jsx src/pages/landing/LandingPage.jsx
git commit -m "feat: rewrite hero with 2-col layout + product preview mockup + pain-first copy"
```

---

## Task 3: Landing Page Section Overhaul

The current section rhythm: hero → features (6 cards) → how-it-works (3 steps) → testimonials → CTA. The features section is still AI Slop #10 (cookie-cutter). Plan:
- Replace "features" + "how-it-works" with a single "How it works" section (3 focused steps, each with a brief feature note)
- Keep testimonials but tighten copy
- Remove the generic feature grid entirely (6 features → 3 focused steps that double as features)

**Files:**
- Modify: `src/pages/landing/LandingPage.jsx` (features + how-it-works sections)

- [ ] **Step 3.1: Replace `features` + `how-it-works` with a combined 3-step section**

Replace the `{/* Features */}` section (currently lines 41-59) and the `{/* How It Works */}` section (lines 62-79) with a single combined section:

```jsx
{/* How It Works (replaces both Features and How It Works) */}
<section id="how-it-works" className="py-20 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="max-w-xl mb-16">
      <h2 className="text-4xl font-bold text-gray-900">Three steps. No guesswork.</h2>
      <p className="mt-3 text-lg text-gray-500">Most resume tools give you a template. ScopusResume tells you what's wrong with yours for this job.</p>
    </div>

    <div className="space-y-12 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-10">
      {/* Step 1 */}
      <div className="flex flex-col">
        <div className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center text-lg font-bold mb-5">
          1
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Build your resume</h3>
        <p className="text-gray-500 leading-relaxed flex-1">
          Our guided builder walks you through every section. No blank page. No guessing what to include.
        </p>
      </div>

      {/* Step 2 */}
      <div className="flex flex-col">
        <div className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center text-lg font-bold mb-5">
          2
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Paste a job description</h3>
        <p className="text-gray-500 leading-relaxed flex-1">
          Drop in any job posting. ScopusResume compares it to your resume word by word and shows exactly what's missing.
        </p>
      </div>

      {/* Step 3 */}
      <div className="flex flex-col">
        <div className="w-10 h-10 rounded-lg bg-brand-600 text-white flex items-center justify-center text-lg font-bold mb-5">
          3
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Apply the AI suggestions</h3>
        <p className="text-gray-500 leading-relaxed flex-1">
          Review side-by-side rewrites. Apply the ones that fit. Download a tailored PDF. Repeat for every job.
        </p>
      </div>
    </div>
  </div>
</section>
```

Also remove the `features` and `steps` constant arrays at the top of the file (they're no longer used), and remove the unused icon imports:

Before:
```js
import { Target, Sparkles, Search, BarChart3, Download, Globe, ArrowRight } from 'lucide-react';
```

After:
```js
import { ArrowRight } from 'lucide-react';
```

- [ ] **Step 3.2: Tighten the testimonials section**

Replace the testimonials section (lines 81-99) with a visually tighter version — single row, less padding, no star emoji:

```jsx
{/* Social proof */}
<section className="py-16 bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <p className="text-sm text-gray-400 uppercase tracking-wide text-center mb-10 font-medium">
      What job seekers say
    </p>
    <div className="grid md:grid-cols-3 gap-6">
      {[
        {
          name: 'Sarah K.',
          role: 'Software Engineer',
          text: 'From 0 callbacks to 5 interviews in two weeks after using ScopusResume.',
        },
        {
          name: 'James L.',
          role: 'Marketing Graduate',
          text: 'The AI rewrites turned my basic bullets into achievement statements hiring managers actually read.',
        },
        {
          name: 'Priya M.',
          role: 'International Student',
          text: 'I could see exactly why my resume wasn\'t matching the job description. Fixed it in 10 minutes.',
        },
      ].map(t => (
        <div key={t.name} className="bg-white rounded-xl p-6 border border-gray-100">
          <p className="text-gray-700 leading-relaxed mb-5">"{t.text}"</p>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
            <p className="text-gray-400 text-sm">{t.role}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

- [ ] **Step 3.3: Verify landing page looks right**

```bash
npm start
```

Open `http://localhost:3000`. Check:
- Hero: 2-col with product mockup
- One "How it works" section with 3 left-aligned numbered steps (not icon circles)
- Testimonials: clean white cards, no star rating spans
- No generic 6-feature grid

- [ ] **Step 3.4: Commit**

```bash
git add src/pages/landing/LandingPage.jsx
git commit -m "refactor: collapse landing page to hero + 3-step section + social proof (remove AI slop grid)"
```

---

## Task 4: Demo Mode Banner (requires Sprint 2)

> **Prerequisite:** Sprint 2 (Supabase auth) must be live. This task only makes sense once `isAuthenticated` reflects real Supabase sessions. If Sprint 2 is not done, skip this task.

Show a persistent sticky banner inside `/app/*` when the user is not authenticated. The banner explains that data is saved locally only and prompts sign-up.

**Files:**
- Create: `src/components/common/DemoModeBanner.jsx`
- Modify: `src/components/layout/AppLayout.jsx`

- [ ] **Step 4.1: Create `src/components/common/DemoModeBanner.jsx`**

```jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, X } from 'lucide-react';

/**
 * Shown when user is using the app without a Supabase account.
 * Warns about data loss and nudges toward sign-up.
 */
export default function DemoModeBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Info className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            You're in <strong>demo mode</strong> — data is saved in this browser only.{' '}
            <Link to="/signup" className="font-semibold underline hover:text-amber-900">
              Create a free account
            </Link>{' '}
            to save your resumes across devices.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.2: Read `src/components/layout/AppLayout.jsx`**

Read the file first, then add the banner. Find where the main content area starts and insert the banner above it.

```bash
# Read the file to understand its structure before editing
cat src/components/layout/AppLayout.jsx
```

- [ ] **Step 4.3: Modify `AppLayout.jsx` to mount the banner when not authenticated**

Add these imports at the top:

```js
import { useAuth } from '../../hooks/useAuth';
import DemoModeBanner from '../common/DemoModeBanner';
```

Inside the component, add:

```jsx
const { isAuthenticated } = useAuth();
```

Then add `{!isAuthenticated && <DemoModeBanner />}` immediately inside the outer wrapper, before the main content area. Exact placement depends on the file structure — place it between the sidebar/nav and the main content `<main>` element.

- [ ] **Step 4.4: Verify banner shows/hides correctly**

```bash
npm start
```

1. Open `http://localhost:3000/app/dashboard` while signed out — amber banner should appear
2. Click the X — banner should dismiss for the session
3. Sign in — banner should not appear

- [ ] **Step 4.5: Commit**

```bash
git add src/components/common/DemoModeBanner.jsx src/components/layout/AppLayout.jsx
git commit -m "feat: add demo mode banner when user is not authenticated"
```

---

## Task 5: Auth Data Migration (requires Sprint 2)

> **Prerequisite:** Sprint 2 (Supabase auth + resumeService) must be live. This task migrates localStorage resumes to Supabase on first sign-in.

When a user signs in for the first time (after Sprint 2 is deployed), any resumes in `localStorage` under `scopus_resumes` are orphaned — they don't have a Supabase `user_id`. This task detects orphaned resumes and offers a one-time import.

**Files:**
- Create: `src/components/common/MigrationPrompt.jsx`
- Modify: `src/context/ResumeContext.jsx`

- [ ] **Step 5.1: Create `src/components/common/MigrationPrompt.jsx`**

```jsx
import React from 'react';
import Button from './Button';
import { Archive } from 'lucide-react';

/**
 * One-time modal shown when localStorage resumes are detected after sign-in.
 * User can import them to their Supabase account or discard them.
 */
export default function MigrationPrompt({ count, onImport, onDiscard, loading }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
            <Archive className="h-5 w-5 text-brand-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Import saved resumes?</h2>
            <p className="text-sm text-gray-500">Found {count} resume{count !== 1 ? 's' : ''} saved in this browser.</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          These resumes were created before you signed in. Would you like to import them into your account so they're saved securely and accessible everywhere?
        </p>

        <div className="flex gap-3">
          <Button onClick={onImport} loading={loading} className="flex-1">
            Import {count} resume{count !== 1 ? 's' : ''}
          </Button>
          <Button variant="secondary" onClick={onDiscard} disabled={loading} className="flex-1">
            Discard
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Add migration logic to `src/context/ResumeContext.jsx`**

Add this hook inside `ResumeProvider`, after the `loadResumes` effect:

```jsx
import MigrationPrompt from '../components/common/MigrationPrompt';
// ... existing imports

// Inside ResumeProvider, add state:
const [migrationResumes, setMigrationResumes] = useState(null); // orphaned localStorage resumes
const [migrating, setMigrating] = useState(false);

// Add this effect after the loadResumes effect:
useEffect(() => {
  if (!isAuthenticated) return;

  // Check for orphaned localStorage resumes (pre-Supabase)
  const LEGACY_KEY = 'scopus_resumes';
  const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || '[]');
  if (legacy.length > 0) {
    setMigrationResumes(legacy);
  }
}, [isAuthenticated]);

const handleMigrateImport = async () => {
  if (!migrationResumes) return;
  setMigrating(true);
  try {
    for (const legacyResume of migrationResumes) {
      const { id: _id, createdAt: _c, updatedAt: _u, name, ...data } = legacyResume;
      await resumeService.createResume(name || 'Imported Resume');
      // Note: createResume creates with emptyResume — then update with the real data
      // We get the created resume, then immediately update with legacy data
      const created = await resumeService.createResume(name || 'Imported Resume');
      await resumeService.updateResume(created.id, { ...created, ...data, name });
    }
    localStorage.removeItem('scopus_resumes');
    setMigrationResumes(null);
    await loadResumes();
  } catch (err) {
    console.error('[MigrationPrompt] Import failed:', err);
  } finally {
    setMigrating(false);
  }
};

const handleMigrateDiscard = () => {
  localStorage.removeItem('scopus_resumes');
  setMigrationResumes(null);
};
```

Also update the `ResumeContext.Provider` return to mount the migration prompt:

```jsx
return (
  <ResumeContext.Provider value={{
    resumes, currentResume, loadingResumes,
    createResume, updateResume, deleteResume,
    setCurrentResume, updateSection,
  }}>
    {children}
    {migrationResumes && migrationResumes.length > 0 && (
      <MigrationPrompt
        count={migrationResumes.length}
        onImport={handleMigrateImport}
        onDiscard={handleMigrateDiscard}
        loading={migrating}
      />
    )}
  </ResumeContext.Provider>
);
```

- [ ] **Step 5.3: Fix duplicate create in migration (code cleanup)**

The `handleMigrateImport` above accidentally calls `createResume` twice. Replace the loop:

```js
for (const legacyResume of migrationResumes) {
  const { id: _id, createdAt: _c, updatedAt: _u, name, ...data } = legacyResume;
  const created = await resumeService.createResume(name || 'Imported Resume');
  // Merge legacy data fields into the created resume
  if (Object.keys(data).length > 0) {
    await resumeService.updateResume(created.id, { ...created, ...data, name: name || 'Imported Resume' });
  }
}
```

- [ ] **Step 5.4: Verify migration flow**

Requires Sprint 2 to be complete.

```bash
npm start
```

1. While signed OUT: create 2 resumes (saved to localStorage)
2. Sign in with a Supabase user
3. Migration prompt should appear: "Import 2 resumes?"
4. Click "Import 2 resumes" — prompt dismisses, dashboard shows the 2 imported resumes
5. Sign out and sign back in — resumes should still be there (Supabase-backed now)
6. Create another test: sign in with a fresh account with no localStorage data — no migration prompt

- [ ] **Step 5.5: Commit**

```bash
git add src/components/common/MigrationPrompt.jsx src/context/ResumeContext.jsx
git commit -m "feat: migrate localStorage resumes to Supabase on first sign-in"
```

---

## Self-Review

### Spec Coverage

| TODOS.md item | Task |
|---------------|------|
| Auth data migration | Task 5 |
| PDF export | Task 1 |
| Hero copy + product screenshot | Task 2 |
| Landing feature grid + section rhythm | Task 3 |
| Demo mode banner | Task 4 |

All 5 TODOS covered.

### Dependencies Respected

- Tasks 1-3: no Sprint 2 dependency. Can be done in parallel or before Sprint 2.
- Tasks 4-5: explicitly gated on Sprint 2 completion in task headings.

### Known Gaps / Deferred

- **DOCX export**: `html-docx-js` requires server-side rendering for quality output. Deferred to Sprint 4. Marked "coming soon" in the UI.
- **Account deletion (server-side)**: Supabase requires a service-role key for `admin.deleteUser`. Deferred to a Sprint 4 Edge Function.
- **Testimonials are placeholder copy**: Real testimonials require actual users. Current copy is plausible but fictional — replace when beta users exist.
- **ProductPreview is static**: The mockup is hardcoded HTML, not a real screenshot. A real screenshot (once the product is live) would be more credible. Replace in Sprint 4.
- **`handleMigrateImport` creates then updates**: Two Supabase round-trips per resume instead of one. Acceptable for a one-time migration flow. Can be optimized later if needed.

### Placeholder Scan

No TBDs. All code blocks are complete.

### Type Consistency

- `exportAsPDF(elementId, filename)` — `elementId` matches `id="resume-export-target"` added in Step 1.3
- `exportAsText(resume, filename)` — `resume` is the resume object from `useResume()`, matches `resumeToText(resume)` signature
- `MigrationPrompt({ count, onImport, onDiscard, loading })` — matches call site in ResumeContext

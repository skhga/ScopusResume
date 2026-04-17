# ScopusResume — Spec Alignment Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the existing ScopusResume codebase into full alignment with the CS353 Feature Specification and Technical Specification documents.

**Architecture:** React 19 SPA on Vercel, Supabase (Postgres + Auth + Storage) replacing the spec's MySQL/Node.js/JWT stack, Vercel serverless functions in `api/` replacing Express.js routes, Anthropic Claude replacing OpenAI GPT-4o for all AI features. The spec's 18-table schema maps directly onto Supabase tables.

**Tech Stack:** React 19, TailwindCSS 3.4, React Hook Form + Zod, @dnd-kit/core, Supabase JS client, Anthropic Claude API (via `api/` Vercel functions), html2pdf.js, docx (npm), DeepL API

**Source of Truth Documents:**
- Feature Spec: `/Users/sk_hga/Documents/Shiller International University /School Work /Integrative Project III /ScopusResume Feature Specification.pdf`
- Technical Spec: `/Users/sk_hga/Documents/Shiller International University /School Work /Integrative Project III /ScopusResume_Technical_Specification.pdf`

---

## WHAT'S ALREADY DONE ✅

- Auth flow (sign up, sign in, password reset, account settings) via Supabase Auth
- 8-step resume builder (Personal Info, Education, Work Experience, Skills, Projects, Certifications, Career Objective, Summary)
- Resume CRUD via Supabase
- JD Analyzer page (partial — `JDAnalyzerPage.jsx`)
- AI Optimization page (partial — `AIOptimizationPage.jsx`)
- ATS Optimizer page (partial — `ATSOptimizerPage.jsx`)
- PDF + TXT export (`ExportPage.jsx`, `html2pdf.js`)
- Vercel API proxy routes (`api/tailor.js`, `api/analyze.js`, `api/_anthropic.js`)
- Landing page, Privacy Policy, Cookie Banner

---

## PHASE 1 — Supabase Schema Migration

> **Why first:** All builder, AI, and dashboard phases depend on the correct data model being in place. Do this before touching any UI.

### Files
- Create: `src/services/supabaseSchema.sql` — SQL migration script (reference, run in Supabase dashboard)
- Modify: `src/services/resumeService.js` — update all queries to match new columns
- Modify: `src/context/ResumeContext.jsx` — update default resume shape

---

### Task 1.1: Add Missing Columns to `resumes` Table

The `resumes` table needs career objective fields, template selection, ATS score, and wizard progress tracking.

- [ ] **Step 1: Write the SQL migration**

Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query):

```sql
-- Add to resumes table
ALTER TABLE resumes
  ADD COLUMN IF NOT EXISTS target_job_title VARCHAR(200),
  ADD COLUMN IF NOT EXISTS target_industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS seniority_level VARCHAR(20) CHECK (seniority_level IN ('entry', 'mid', 'senior', 'executive')),
  ADD COLUMN IF NOT EXISTS job_description_text TEXT,
  ADD COLUMN IF NOT EXISTS job_description_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS resume_format VARCHAR(20) DEFAULT 'chronological' CHECK (resume_format IN ('chronological', 'functional', 'hybrid')),
  ADD COLUMN IF NOT EXISTS resume_length VARCHAR(20) DEFAULT 'one_page' CHECK (resume_length IN ('one_page', 'two_page')),
  ADD COLUMN IF NOT EXISTS template_id VARCHAR(50) DEFAULT 'modern',
  ADD COLUMN IF NOT EXISTS ats_score DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'complete')),
  ADD COLUMN IF NOT EXISTS current_step SMALLINT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_exported_at TIMESTAMPTZ;
```

- [ ] **Step 2: Verify the migration ran without errors**

In Supabase Table Editor → `resumes` → check the new columns appear.

- [ ] **Step 3: Update the default resume shape in `ResumeContext.jsx`**

Open `src/context/ResumeContext.jsx`. Find the initial state object (the shape returned from `createResume` or the default value). Add the new fields:

```js
// In the default/initial resume object
target_job_title: '',
target_industry: '',
seniority_level: 'entry',
job_description_text: '',
job_description_url: '',
resume_format: 'chronological',
resume_length: 'one_page',
template_id: 'modern',
ats_score: null,
status: 'draft',
current_step: 1,
last_exported_at: null,
```

- [ ] **Step 4: Commit**
```bash
git add src/context/ResumeContext.jsx
git commit -m "feat: add career objective + template + ATS fields to resume schema"
```

---

### Task 1.2: Enhance `education` Table

- [ ] **Step 1: Run migration**

```sql
ALTER TABLE education
  ADD COLUMN IF NOT EXISTS currently_enrolled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gpa DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS honors_awards TEXT,
  ADD COLUMN IF NOT EXISTS relevant_coursework TEXT,
  ADD COLUMN IF NOT EXISTS thesis_title VARCHAR(500),
  ADD COLUMN IF NOT EXISTS display_order SMALLINT DEFAULT 0;
```

- [ ] **Step 2: Verify in Supabase table editor**

Check that all 6 new columns are present on the `education` table.

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: add education enhancement fields — gpa, enrolled, coursework, thesis, order"
```

---

### Task 1.3: Enhance `work_experience` Table + Create `bullet_points` Table

The spec stores bullet points separately (raw text + AI version + toggle flag) instead of as a JSON array on the experience row.

- [ ] **Step 1: Run migration**

```sql
-- Enhance work_experience
ALTER TABLE work_experience
  ADD COLUMN IF NOT EXISTS is_remote BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS job_description_raw TEXT,
  ADD COLUMN IF NOT EXISTS display_order SMALLINT DEFAULT 0;

-- Create bullet_points table
CREATE TABLE IF NOT EXISTS bullet_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experience_id UUID NOT NULL REFERENCES work_experience(id) ON DELETE CASCADE,
  raw_text TEXT NOT NULL,
  ai_text TEXT,
  is_using_ai BOOLEAN DEFAULT TRUE,
  display_order SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_bullets_exp ON bullet_points(experience_id, display_order);
```

- [ ] **Step 2: Verify both tables in Supabase**

Check `work_experience` has the 3 new columns. Check `bullet_points` table exists with all columns.

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: add bullet_points table + work experience remote/raw fields"
```

---

### Task 1.4: Create Additional Content Tables

- [ ] **Step 1: Run migration**

```sql
-- volunteer_experience
CREATE TABLE IF NOT EXISTS volunteer_experience (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  organization_name VARCHAR(200) NOT NULL,
  role VARCHAR(200) NOT NULL,
  start_date DATE,
  end_date DATE,
  description TEXT,
  display_order SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- publications
CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  publication_title VARCHAR(500) NOT NULL,
  authors JSONB DEFAULT '[]',
  publication_name VARCHAR(200),
  year SMALLINT,
  doi_url VARCHAR(500),
  display_order SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- awards
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  award_name VARCHAR(200) NOT NULL,
  awarding_body VARCHAR(200),
  date_received DATE,
  description TEXT,
  display_order SMALLINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- professional_summary (1:1 with resume)
CREATE TABLE IF NOT EXISTS professional_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL UNIQUE REFERENCES resumes(id) ON DELETE CASCADE,
  summary_text TEXT NOT NULL,
  is_ai_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] **Step 2: Verify all 4 tables in Supabase table editor**

- [ ] **Step 3: Commit**
```bash
git commit -m "feat: add volunteer_experience, publications, awards, professional_summary tables"
```

---

### Task 1.5: Create AI Processing Tables

- [ ] **Step 1: Run migration**

```sql
-- ATS scores cache
CREATE TABLE IF NOT EXISTS ats_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_description_hash VARCHAR(64),
  overall_score DECIMAL(5,2),
  keyword_score DECIMAL(5,2),
  format_score DECIMAL(5,2),
  impact_score DECIMAL(5,2),
  completeness_score DECIMAL(5,2),
  missing_keywords JSONB DEFAULT '[]',
  suggestions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job description analyses
CREATE TABLE IF NOT EXISTS job_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  job_description_text TEXT NOT NULL,
  job_title VARCHAR(200),
  seniority_level VARCHAR(20),
  required_skills JSONB DEFAULT '[]',
  preferred_skills JSONB DEFAULT '[]',
  keywords JSONB DEFAULT '[]',
  culture_signals JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Export history
CREATE TABLE IF NOT EXISTS export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  format VARCHAR(10) CHECK (format IN ('pdf', 'docx', 'txt', 'html')),
  language VARCHAR(10) DEFAULT 'en',
  template_id VARCHAR(50),
  file_url VARCHAR(1000),
  file_size_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ats_resume ON ats_scores(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_analyses_resume ON job_analyses(resume_id);
```

- [ ] **Step 2: Verify tables in Supabase**

- [ ] **Step 3: Update `resumeService.js` to export helpers for new tables**

In `src/services/resumeService.js`, add these functions at the bottom of the file:

```js
// ATS Scores
export const saveATSScore = async (resumeId, scoreData) => {
  const { data, error } = await supabase
    .from('ats_scores')
    .upsert({
      resume_id: resumeId,
      job_description_hash: scoreData.jdHash,
      overall_score: scoreData.overall,
      keyword_score: scoreData.keyword,
      format_score: scoreData.format,
      impact_score: scoreData.impact,
      completeness_score: scoreData.completeness,
      missing_keywords: scoreData.missingKeywords,
      suggestions: scoreData.suggestions,
    }, { onConflict: 'resume_id' });
  if (error) throw error;
  return data;
};

export const getATSScore = async (resumeId) => {
  const { data, error } = await supabase
    .from('ats_scores')
    .select('*')
    .eq('resume_id', resumeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// Export history
export const saveExportRecord = async (resumeId, format, templateId, language = 'en') => {
  const { data, error } = await supabase
    .from('export_history')
    .insert({ resume_id: resumeId, format, template_id: templateId, language });
  if (error) throw error;
  return data;
};

// Professional summary
export const saveProfessionalSummary = async (resumeId, summaryText, isAiGenerated = false) => {
  const { data, error } = await supabase
    .from('professional_summary')
    .upsert({ resume_id: resumeId, summary_text: summaryText, is_ai_generated: isAiGenerated }, { onConflict: 'resume_id' });
  if (error) throw error;
  return data;
};

export const getProfessionalSummary = async (resumeId) => {
  const { data, error } = await supabase
    .from('professional_summary')
    .select('*')
    .eq('resume_id', resumeId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data;
};
```

- [ ] **Step 4: Commit**
```bash
git add src/services/resumeService.js
git commit -m "feat: create AI processing tables and service helpers"
```

---

## PHASE 2 — Resume Builder Restructure (7-Step Alignment)

> **Why:** The spec defines a specific 7-step flow where Step 2 is Career Objective (with job description input — the critical ATS anchor), Steps 3-6 collect content, and Step 7 is Review & Optimize with live ATS scoring. Our current flow has 8 steps in the wrong order.

**Target step order:**
| Step | Component | Key Change |
|------|-----------|------------|
| 1 | PersonalInfoStep | Already correct |
| 2 | CareerObjectiveStep | Move to Step 2; add JD input, industry dropdown, seniority radio |
| 3 | EducationStep | Add currently_enrolled, GPA, coursework, thesis, drag-and-drop |
| 4 | WorkExperienceStep | Add is_remote, job_description_raw, AI bullet accept/reject |
| 5 | SkillsStep | Full category UI (5 categories + proficiency) |
| 6 | AdditionalInfoStep | NEW: merge Projects + Certs + Volunteer + Publications + Awards |
| 7 | ReviewOptimizeStep | NEW: live preview + ATS score panel + summary generator |

### Files
- Modify: `src/pages/resume-builder/ResumeBuilderPage.jsx` — step array reorder
- Modify: `src/pages/resume-builder/CareerObjectiveStep.jsx` — add JD fields
- Modify: `src/pages/resume-builder/EducationStep.jsx` — add missing fields + dnd
- Modify: `src/pages/resume-builder/WorkExperienceStep.jsx` — is_remote + AI bullets
- Modify: `src/pages/resume-builder/SkillsStep.jsx` — full category UI
- Create: `src/pages/resume-builder/AdditionalInfoStep.jsx` — collapsible merged step
- Create: `src/pages/resume-builder/ReviewOptimizeStep.jsx` — Step 7
- Delete: `src/pages/resume-builder/ProjectsStep.jsx` — merged into AdditionalInfo
- Delete: `src/pages/resume-builder/CertificationsStep.jsx` — merged into AdditionalInfo
- Delete: `src/pages/resume-builder/SummaryStep.jsx` — merged into ReviewOptimize

---

### Task 2.1: Reorder Steps in `ResumeBuilderPage.jsx`

- [ ] **Step 1: Read the current step configuration**

Open `src/pages/resume-builder/ResumeBuilderPage.jsx` and find the STEPS array or step routing logic.

- [ ] **Step 2: Reorder the STEPS array**

Replace the current steps array with:

```js
import PersonalInfoStep from './PersonalInfoStep';
import CareerObjectiveStep from './CareerObjectiveStep';
import EducationStep from './EducationStep';
import WorkExperienceStep from './WorkExperienceStep';
import SkillsStep from './SkillsStep';
import AdditionalInfoStep from './AdditionalInfoStep';
import ReviewOptimizeStep from './ReviewOptimizeStep';

const STEPS = [
  { id: 1, label: 'Personal Info',    component: PersonalInfoStep },
  { id: 2, label: 'Career Objective', component: CareerObjectiveStep },
  { id: 3, label: 'Education',        component: EducationStep },
  { id: 4, label: 'Experience',       component: WorkExperienceStep },
  { id: 5, label: 'Skills',           component: SkillsStep },
  { id: 6, label: 'Additional Info',  component: AdditionalInfoStep },
  { id: 7, label: 'Review & Optimize', component: ReviewOptimizeStep },
];
```

- [ ] **Step 3: Auto-save current step number to Supabase**

In the step navigation handler (wherever `currentStep` changes), add:

```js
// After updating currentStep state:
await supabase
  .from('resumes')
  .update({ current_step: newStep })
  .eq('id', resumeId);
```

- [ ] **Step 4: Commit**
```bash
git add src/pages/resume-builder/ResumeBuilderPage.jsx
git commit -m "refactor: reorder builder to 7-step spec flow"
```

---

### Task 2.2: Enhance `CareerObjectiveStep.jsx` (Step 2)

This step must capture the job description — it's the anchor for all AI features.

- [ ] **Step 1: Install industry list constant**

In `src/utils/constants.js`, add:

```js
export const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'Education', 'Marketing',
  'Consulting', 'Legal', 'Engineering', 'Design', 'Sales',
  'Operations', 'Human Resources', 'Research', 'Non-Profit', 'Government',
  'Media & Entertainment', 'Real Estate', 'Retail', 'Manufacturing', 'Other'
];

export const SENIORITY_LEVELS = [
  { value: 'entry', label: 'Entry Level' },
  { value: 'mid', label: 'Mid Level' },
  { value: 'senior', label: 'Senior' },
  { value: 'executive', label: 'Executive' },
];
```

- [ ] **Step 2: Rewrite `CareerObjectiveStep.jsx`**

```jsx
import React from 'react';
import { useFormContext } from 'react-hook-form';
import { INDUSTRIES, SENIORITY_LEVELS } from '../../utils/constants';

export default function CareerObjectiveStep({ resumeData, onUpdate }) {
  const { register, watch, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Career Objective</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tell us your target role. This powers ATS optimization across your entire resume.
        </p>
      </div>

      {/* Target Job Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Job Title <span className="text-red-500">*</span>
        </label>
        <input
          {...register('target_job_title', { required: 'Target job title is required' })}
          type="text"
          placeholder="e.g. Software Engineer, Product Manager"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
        />
        {errors.target_job_title && (
          <p className="text-red-500 text-xs mt-1">{errors.target_job_title.message}</p>
        )}
      </div>

      {/* Target Industry */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Industry <span className="text-red-500">*</span>
        </label>
        <select
          {...register('target_industry', { required: 'Industry is required' })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select industry...</option>
          {INDUSTRIES.map(ind => (
            <option key={ind} value={ind}>{ind}</option>
          ))}
        </select>
        {errors.target_industry && (
          <p className="text-red-500 text-xs mt-1">{errors.target_industry.message}</p>
        )}
      </div>

      {/* Seniority Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seniority Level <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-4 flex-wrap">
          {SENIORITY_LEVELS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={value}
                {...register('seniority_level', { required: 'Select a seniority level' })}
                className="text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
        {errors.seniority_level && (
          <p className="text-red-500 text-xs mt-1">{errors.seniority_level.message}</p>
        )}
      </div>

      {/* Job Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Paste Job Description{' '}
          <span className="text-gray-400 font-normal">(optional but recommended)</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Pasting the full JD enables AI keyword matching, bullet rewriting, and ATS scoring.
        </p>
        <textarea
          {...register('job_description_text')}
          rows={8}
          maxLength={10000}
          placeholder="Paste the full job description here..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 resize-y"
        />
        <p className="text-xs text-gray-400 text-right mt-1">
          {watch('job_description_text')?.length || 0} / 10,000 characters
        </p>
      </div>

      {/* Job Description URL (alternative) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Or Job Posting URL
        </label>
        <input
          {...register('job_description_url')}
          type="url"
          placeholder="https://..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add src/pages/resume-builder/CareerObjectiveStep.jsx src/utils/constants.js
git commit -m "feat: enhance CareerObjectiveStep — JD input, industry, seniority fields"
```

---

### Task 2.3: Enhance `EducationStep.jsx` (Step 3)

- [ ] **Step 1: Install @dnd-kit**
```bash
cd /Users/sk_hga/ScopusResume/scopus && npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

- [ ] **Step 2: Verify install**
```bash
cat package.json | grep dnd-kit
```
Expected: `"@dnd-kit/core"` version shown.

- [ ] **Step 3: Add new fields to the education entry form**

In `src/pages/resume-builder/EducationStep.jsx`, inside the entry render/form (within the repeatable section), add after the existing `graduation_date` field:

```jsx
{/* Currently Enrolled */}
<label className="flex items-center gap-2 cursor-pointer mt-2">
  <input
    type="checkbox"
    {...register(`education.${index}.currently_enrolled`)}
    className="text-brand-600 focus:ring-brand-500"
  />
  <span className="text-sm text-gray-700">Currently enrolled (Expected graduation)</span>
</label>

{/* GPA — only show if >= 3.5 */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">GPA</label>
  <input
    {...register(`education.${index}.gpa`, {
      min: { value: 0, message: 'GPA cannot be negative' },
      max: { value: 4.0, message: 'GPA cannot exceed 4.0' },
    })}
    type="number"
    step="0.01"
    min="0"
    max="4.0"
    placeholder="e.g. 3.8 (only shown on resume if ≥ 3.5)"
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
  />
  <p className="text-xs text-gray-400 mt-1">Only displayed on resume if 3.5 or above</p>
</div>

{/* Honors & Awards */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Honors & Awards</label>
  <input
    {...register(`education.${index}.honors_awards`)}
    type="text"
    placeholder="e.g. Dean's List, Cum Laude, Magna Cum Laude"
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
  />
</div>

{/* Relevant Coursework */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Relevant Coursework</label>
  <input
    {...register(`education.${index}.relevant_coursework`)}
    type="text"
    placeholder="e.g. Data Structures, Algorithms, Machine Learning (comma-separated)"
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
  />
</div>

{/* Thesis Title */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Thesis / Capstone Title <span className="text-gray-400 text-xs">(graduate degrees)</span>
  </label>
  <input
    {...register(`education.${index}.thesis_title`)}
    type="text"
    placeholder="Enter thesis or capstone project title"
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500"
  />
</div>
```

- [ ] **Step 4: Add drag-and-drop reordering with @dnd-kit**

At the top of `EducationStep.jsx`, add imports:

```js
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

Wrap the education entries list in `DndContext` and `SortableContext`. Each education card becomes a `useSortable` item. On `onDragEnd`, call `arrayMove` and `replace` (from `useFieldArray`).

Full wrapper pattern:
```jsx
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

const handleDragEnd = (event) => {
  const { active, over } = event;
  if (active.id !== over?.id) {
    const oldIndex = fields.findIndex(f => f.id === active.id);
    const newIndex = fields.findIndex(f => f.id === over.id);
    move(oldIndex, newIndex); // useFieldArray's move()
  }
};

// In JSX:
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
    {fields.map((field, index) => (
      <SortableEducationCard key={field.id} id={field.id} index={index} ... />
    ))}
  </SortableContext>
</DndContext>
```

- [ ] **Step 5: Commit**
```bash
git add src/pages/resume-builder/EducationStep.jsx package.json package-lock.json
git commit -m "feat: enhance EducationStep — GPA, enrolled, coursework, thesis, dnd reorder"
```

---

### Task 2.4: Enhance `WorkExperienceStep.jsx` — AI Bullet Rewriting (Step 4)

- [ ] **Step 1: Add `is_remote` and `job_description_raw` fields to the experience form**

In `src/pages/resume-builder/WorkExperienceStep.jsx`, inside each experience entry:

```jsx
{/* Is Remote */}
<label className="flex items-center gap-2 cursor-pointer">
  <input
    type="checkbox"
    {...register(`work_experience.${index}.is_remote`)}
    className="text-brand-600"
  />
  <span className="text-sm text-gray-700">Remote position</span>
</label>

{/* Raw Job Description for AI */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Describe your responsibilities{' '}
    <span className="text-brand-600 text-xs font-medium">✦ AI will rewrite these</span>
  </label>
  <textarea
    {...register(`work_experience.${index}.job_description_raw`)}
    rows={4}
    placeholder="Describe what you did in plain language, e.g. 'I managed a team and improved our sales numbers...'"
    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 resize-y"
  />
</div>
```

- [ ] **Step 2: Add AI rewrite button and accept/reject UI**

Below the `job_description_raw` textarea, add:

```jsx
{/* AI Rewrite Section */}
{watch(`work_experience.${index}.job_description_raw`) && (
  <div className="mt-3">
    <button
      type="button"
      onClick={() => handleAIRewrite(index)}
      disabled={rewritingIndex === index}
      className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
    >
      {rewritingIndex === index ? (
        <><span className="animate-spin">⟳</span> Rewriting...</>
      ) : (
        <><span>✦</span> AI Rewrite Bullets</>
      )}
    </button>

    {/* Show generated bullets with accept/reject per bullet */}
    {aiBullets[index]?.map((bullet, bIdx) => (
      <div key={bIdx} className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-gray-800">{bullet}</p>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => acceptBullet(index, bIdx, bullet)}
            className="text-xs px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            ✓ Accept
          </button>
          <button
            type="button"
            onClick={() => rejectBullet(index, bIdx)}
            className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            ✗ Reject
          </button>
        </div>
      </div>
    ))}
  </div>
)}
```

- [ ] **Step 3: Add `handleAIRewrite` handler**

In the component body (before return), add:

```js
const [rewritingIndex, setRewritingIndex] = useState(null);
const [aiBullets, setAiBullets] = useState({});
const [acceptedBullets, setAcceptedBullets] = useState({});

const handleAIRewrite = async (index) => {
  const rawText = getValues(`work_experience.${index}.job_description_raw`);
  if (!rawText) return;

  setRewritingIndex(index);
  try {
    const response = await fetch('/api/rewrite-bullets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText,
        jobTitle: getValues(`work_experience.${index}.job_title`),
        targetJobTitle: getValues('target_job_title') || '',
        targetIndustry: getValues('target_industry') || '',
        jobDescriptionText: getValues('job_description_text') || '',
      }),
    });
    const { bullets } = await response.json();
    setAiBullets(prev => ({ ...prev, [index]: bullets }));
  } catch (err) {
    console.error('AI rewrite failed:', err);
  } finally {
    setRewritingIndex(null);
  }
};

const acceptBullet = (expIndex, bulletIdx, text) => {
  setAcceptedBullets(prev => ({
    ...prev,
    [expIndex]: [...(prev[expIndex] || []), text],
  }));
  setAiBullets(prev => ({
    ...prev,
    [expIndex]: prev[expIndex].filter((_, i) => i !== bulletIdx),
  }));
};

const rejectBullet = (expIndex, bulletIdx) => {
  setAiBullets(prev => ({
    ...prev,
    [expIndex]: prev[expIndex].filter((_, i) => i !== bulletIdx),
  }));
};
```

- [ ] **Step 4: Commit**
```bash
git add src/pages/resume-builder/WorkExperienceStep.jsx
git commit -m "feat: add AI bullet rewriting with per-bullet accept/reject to WorkExperienceStep"
```

---

### Task 2.5: Enhance `SkillsStep.jsx` — Full Category UI (Step 5)

Per spec F-BUILD-005: 5 categories, languages have proficiency levels.

- [ ] **Step 1: Add proficiency levels constant to `src/utils/constants.js`**

```js
export const PROFICIENCY_LEVELS = [
  { value: 'native', label: 'Native' },
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'basic', label: 'Basic' },
];
```

- [ ] **Step 2: Rewrite `SkillsStep.jsx` with 5 category sections**

Each section uses tag-input pattern (type + Enter to add, × to remove):

```jsx
import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { PROFICIENCY_LEVELS } from '../../utils/constants';

// TagInput: type text, press Enter to add tag, click × to remove
function TagInput({ value = [], onChange, placeholder, suggestions = [] }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  );

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput('');
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg min-h-[44px] focus-within:ring-2 focus-within:ring-brand-500 bg-white">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-brand-100 text-brand-700 rounded-md text-sm">
            {tag}
            <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} className="text-brand-400 hover:text-brand-700">×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag(input))}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] text-sm outline-none bg-transparent"
        />
      </div>
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-auto">
          {filteredSuggestions.slice(0, 8).map(s => (
            <li key={s} onMouseDown={() => addTag(s)} className="px-3 py-2 text-sm hover:bg-brand-50 cursor-pointer">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PROGRAMMING_SUGGESTIONS = ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'SQL', 'R', 'Scala'];
const TOOLS_SUGGESTIONS = ['Excel', 'Figma', 'JIRA', 'Salesforce', 'AWS', 'Docker', 'Kubernetes', 'Git', 'Tableau', 'Power BI', 'Slack', 'Notion'];

export default function SkillsStep({ resumeData, onUpdate }) {
  const { watch, setValue } = useFormContext();

  const technicalSkills = watch('skills.technical') || [];
  const programmingLanguages = watch('skills.programming_languages') || [];
  const tools = watch('skills.tools') || [];
  const languages = watch('skills.languages') || [];
  const domainSkills = watch('skills.domain_specific') || [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Skills</h2>
        <p className="text-sm text-gray-500 mt-1">Add your skills by category. AI will suggest missing skills based on your target job description.</p>
      </div>

      {/* Technical Skills */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Technical Skills</label>
        <p className="text-xs text-gray-400 mb-2">e.g. Data Analysis, Project Management, SEO, Financial Modeling</p>
        <TagInput value={technicalSkills} onChange={v => setValue('skills.technical', v)} placeholder="Type a skill and press Enter..." />
      </div>

      {/* Programming Languages */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Programming Languages</label>
        <p className="text-xs text-gray-400 mb-2">e.g. Python, JavaScript, SQL, Java</p>
        <TagInput value={programmingLanguages} onChange={v => setValue('skills.programming_languages', v)} placeholder="Type or select..." suggestions={PROGRAMMING_SUGGESTIONS} />
      </div>

      {/* Tools & Software */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Tools & Software</label>
        <p className="text-xs text-gray-400 mb-2">e.g. Excel, Figma, JIRA, Salesforce, AWS</p>
        <TagInput value={tools} onChange={v => setValue('skills.tools', v)} placeholder="Type or select..." suggestions={TOOLS_SUGGESTIONS} />
      </div>

      {/* Languages (with proficiency) */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Languages</label>
        <div className="space-y-2">
          {(languages).map((lang, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="text"
                value={lang.name}
                onChange={e => {
                  const updated = [...languages];
                  updated[i] = { ...updated[i], name: e.target.value };
                  setValue('skills.languages', updated);
                }}
                placeholder="Language name"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
              <select
                value={lang.proficiency}
                onChange={e => {
                  const updated = [...languages];
                  updated[i] = { ...updated[i], proficiency: e.target.value };
                  setValue('skills.languages', updated);
                }}
                className="border border-gray-300 rounded-lg px-2 py-2 text-sm"
              >
                {PROFICIENCY_LEVELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <button type="button" onClick={() => setValue('skills.languages', languages.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 text-lg">×</button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setValue('skills.languages', [...languages, { name: '', proficiency: 'professional' }])}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            + Add Language
          </button>
        </div>
      </div>

      {/* Domain-Specific */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Domain-Specific Skills</label>
        <p className="text-xs text-gray-400 mb-2">e.g. HIPAA Compliance, Agile/Scrum, IFRS, Six Sigma</p>
        <TagInput value={domainSkills} onChange={v => setValue('skills.domain_specific', v)} placeholder="Type a domain skill and press Enter..." />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add src/pages/resume-builder/SkillsStep.jsx src/utils/constants.js
git commit -m "feat: rewrite SkillsStep — 5 categories, tag inputs, language proficiency"
```

---

### Task 2.6: Create `AdditionalInfoStep.jsx` (Step 6 — Merged Collapsible Sections)

This replaces the separate ProjectsStep and CertificationsStep with one unified step with collapsible sub-sections.

- [ ] **Step 1: Create the file**

Create `src/pages/resume-builder/AdditionalInfoStep.jsx`:

```jsx
import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';

function CollapsibleSection({ title, badge, description, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {badge && <span className="text-xs px-2 py-0.5 bg-brand-100 text-brand-700 rounded-full">{badge}</span>}
        </div>
        <span className="text-gray-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="p-4 border-t border-gray-200">
          {description && <p className="text-xs text-gray-500 mb-4">{description}</p>}
          {children}
        </div>
      )}
    </div>
  );
}

export default function AdditionalInfoStep() {
  const { register, control, watch } = useFormContext();

  // Projects
  const { fields: projects, append: addProject, remove: removeProject } = useFieldArray({ control, name: 'projects' });
  // Certifications
  const { fields: certs, append: addCert, remove: removeCert } = useFieldArray({ control, name: 'certifications' });
  // Volunteer
  const { fields: volunteer, append: addVolunteer, remove: removeVolunteer } = useFieldArray({ control, name: 'volunteer_experience' });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Additional Information</h2>
        <p className="text-sm text-gray-500 mt-1">All sections are optional. Expand the ones that apply to you.</p>
      </div>

      {/* Projects — featured for fresh graduates */}
      <CollapsibleSection title="Projects" badge="Recommended for new grads" description="Showcase academic, personal, or open-source projects. These significantly strengthen applications for entry-level roles." defaultOpen>
        {projects.map((field, i) => (
          <div key={field.id} className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Project {i + 1}</span>
              <button type="button" onClick={() => removeProject(i)} className="text-red-400 text-sm hover:text-red-600">Remove</button>
            </div>
            <input {...register(`projects.${i}.project_title`)} placeholder="Project Title *" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <textarea {...register(`projects.${i}.description`)} rows={2} placeholder="Brief description of what you built and why" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y" />
            <input {...register(`projects.${i}.technologies_used`)} placeholder="Technologies used (e.g. React, Python, AWS)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input {...register(`projects.${i}.outcome`)} placeholder="Outcome or impact (e.g. 500+ users, won hackathon)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input {...register(`projects.${i}.project_url`)} type="url" placeholder="GitHub / Demo URL (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        ))}
        <button type="button" onClick={() => addProject({ project_title: '', description: '', technologies_used: '', outcome: '', project_url: '' })} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Project</button>
      </CollapsibleSection>

      {/* Certifications */}
      <CollapsibleSection title="Certifications & Licenses" description="Professional certifications, licenses, or accreditations.">
        {certs.map((field, i) => (
          <div key={field.id} className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Certification {i + 1}</span>
              <button type="button" onClick={() => removeCert(i)} className="text-red-400 text-sm hover:text-red-600">Remove</button>
            </div>
            <input {...register(`certifications.${i}.certification_name`)} placeholder="Certification Name *" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input {...register(`certifications.${i}.issuing_body`)} placeholder="Issuing Organization (e.g. AWS, Google, PMI)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input {...register(`certifications.${i}.date_obtained`)} type="month" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <input {...register(`certifications.${i}.credential_id`)} placeholder="Credential ID (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => addCert({ certification_name: '', issuing_body: '', date_obtained: '', credential_id: '' })} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Certification</button>
      </CollapsibleSection>

      {/* Volunteer Experience — featured for international students */}
      <CollapsibleSection title="Volunteer Experience" badge="Recommended for international students" description="Community involvement and volunteer work demonstrates soft skills and cultural integration.">
        {volunteer.map((field, i) => (
          <div key={field.id} className="space-y-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Volunteer Role {i + 1}</span>
              <button type="button" onClick={() => removeVolunteer(i)} className="text-red-400 text-sm hover:text-red-600">Remove</button>
            </div>
            <input {...register(`volunteer_experience.${i}.organization_name`)} placeholder="Organization Name *" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <input {...register(`volunteer_experience.${i}.role`)} placeholder="Your Role / Title *" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input {...register(`volunteer_experience.${i}.start_date`)} type="month" placeholder="Start Date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <input {...register(`volunteer_experience.${i}.end_date`)} type="month" placeholder="End Date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <textarea {...register(`volunteer_experience.${i}.description`)} rows={2} placeholder="Describe your contributions and impact" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y" />
          </div>
        ))}
        <button type="button" onClick={() => addVolunteer({ organization_name: '', role: '', start_date: '', end_date: '', description: '' })} className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add Volunteer Experience</button>
      </CollapsibleSection>

      {/* Awards */}
      <CollapsibleSection title="Awards & Honors" description="Academic awards, professional recognition, scholarships.">
        <p className="text-sm text-gray-500">Awards section — uses same pattern as above. Add award_name, awarding_body, date_received, description fields with useFieldArray named 'awards'.</p>
      </CollapsibleSection>
    </div>
  );
}
```

- [ ] **Step 2: Delete the standalone step files that are now merged**
```bash
git rm src/pages/resume-builder/ProjectsStep.jsx
git rm src/pages/resume-builder/CertificationsStep.jsx
git rm src/pages/resume-builder/SummaryStep.jsx
```

- [ ] **Step 3: Commit**
```bash
git add src/pages/resume-builder/AdditionalInfoStep.jsx
git commit -m "feat: create AdditionalInfoStep — collapsible projects, certs, volunteer, awards"
```

---

### Task 2.7: Create `ReviewOptimizeStep.jsx` (Step 7 — Live ATS Scoring)

- [ ] **Step 1: Create `src/pages/resume-builder/ReviewOptimizeStep.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import ScoreGauge from '../../components/common/ScoreGauge';
import { saveATSScore, saveProfessionalSummary, getProfessionalSummary } from '../../services/resumeService';

export default function ReviewOptimizeStep({ resumeId, resumeData }) {
  const { watch, getValues } = useFormContext();
  const [atsData, setAtsData] = useState(null);
  const [scoring, setScoring] = useState(false);
  const [summary, setSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // Calculate ATS score when component mounts
  useEffect(() => {
    calculateATSScore();
    loadSummary();
  }, []);

  const calculateATSScore = async () => {
    setScoring(true);
    try {
      const formData = getValues();
      const response = await fetch('/api/ats-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeData: formData,
          jobDescriptionText: formData.job_description_text || '',
        }),
      });
      const data = await response.json();
      setAtsData(data);
      if (resumeId) {
        await saveATSScore(resumeId, {
          jdHash: data.jdHash,
          overall: data.overall_score,
          keyword: data.keyword_score,
          format: data.format_score,
          impact: data.impact_score,
          completeness: data.completeness_score,
          missingKeywords: data.missing_keywords,
          suggestions: data.suggestions,
        });
      }
    } catch (err) {
      console.error('ATS scoring failed:', err);
    } finally {
      setScoring(false);
    }
  };

  const loadSummary = async () => {
    if (!resumeId) return;
    const data = await getProfessionalSummary(resumeId);
    if (data) setSummary(data.summary_text);
  };

  const generateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const formData = getValues();
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeData: formData }),
      });
      const { summary: generated } = await response.json();
      setSummary(generated);
      if (resumeId) {
        await saveProfessionalSummary(resumeId, generated, true);
      }
    } catch (err) {
      console.error('Summary generation failed:', err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const scoreColor = (score) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: ATS Score Panel */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Review & Optimize</h2>
          <p className="text-sm text-gray-500 mt-1">Your resume's ATS compatibility score and optimization suggestions.</p>
        </div>

        {scoring ? (
          <div className="flex items-center justify-center h-32 text-brand-600">
            <span className="animate-pulse text-sm">Analyzing your resume...</span>
          </div>
        ) : atsData ? (
          <div className="space-y-4">
            {/* Overall Score */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <ScoreGauge score={atsData.overall_score} />
              <p className={`text-2xl font-bold mt-2 ${scoreColor(atsData.overall_score)}`}>
                {Math.round(atsData.overall_score)}/100
              </p>
              <p className="text-sm text-gray-500">
                {atsData.overall_score >= 75 ? 'Good — Should pass most ATS systems' :
                 atsData.overall_score >= 60 ? 'Fair — Some improvements recommended' :
                 'Needs Work — Significant optimization required'}
              </p>
            </div>

            {/* Score Breakdown */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Score Breakdown</h3>
              {[
                { label: 'Keyword Match', score: atsData.keyword_score, weight: '40%' },
                { label: 'Impact Score', score: atsData.impact_score, weight: '25%' },
                { label: 'Format Compliance', score: atsData.format_score, weight: '20%' },
                { label: 'Completeness', score: atsData.completeness_score, weight: '15%' },
              ].map(({ label, score, weight }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{label} <span className="text-gray-400">({weight})</span></span>
                    <span className={scoreColor(score)}>{Math.round(score)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${score >= 75 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Missing Keywords */}
            {atsData.missing_keywords?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-700 mb-2">Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {atsData.missing_keywords.map(kw => (
                    <span key={kw} className="text-xs px-2 py-1 bg-white border border-red-300 text-red-600 rounded-md">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {atsData.suggestions?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-blue-700 mb-2">Improvement Suggestions</h3>
                <ul className="space-y-1">
                  {atsData.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-blue-800">• {s}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={calculateATSScore}
              className="w-full py-2 text-sm text-brand-600 border border-brand-300 rounded-lg hover:bg-brand-50"
            >
              ↻ Recalculate Score
            </button>
          </div>
        ) : (
          <button type="button" onClick={calculateATSScore} className="w-full py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700">
            Calculate ATS Score
          </button>
        )}

        {/* Professional Summary Generator */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-700">Professional Summary</h3>
            <button
              type="button"
              onClick={generateSummary}
              disabled={generatingSummary}
              className="text-xs px-3 py-1 bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
            >
              {generatingSummary ? 'Generating...' : summary ? '↻ Regenerate' : '✦ Generate with AI'}
            </button>
          </div>
          <textarea
            value={summary}
            onChange={e => setSummary(e.target.value)}
            onBlur={() => resumeId && saveProfessionalSummary(resumeId, summary, false)}
            rows={4}
            placeholder="Your professional summary will appear here. Click 'Generate with AI' or write your own."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Right: Optimization Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">Optimization Settings</h3>
        {/* Resume Format */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Resume Format</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="chronological">Chronological (most common)</option>
            <option value="functional">Functional (skills-based)</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        {/* Resume Length */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Resume Length</label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="resume_length" value="one_page" defaultChecked className="text-brand-600" />
              <span className="text-sm">1 Page</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="resume_length" value="two_page" className="text-brand-600" />
              <span className="text-sm">2 Pages</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add src/pages/resume-builder/ReviewOptimizeStep.jsx
git commit -m "feat: create ReviewOptimizeStep — live ATS score panel + summary generator"
```

---

## PHASE 3 — Vercel API Functions

> The `api/` folder holds Vercel serverless functions. `api/tailor.js` and `api/analyze.js` already exist. We need to add the remaining AI endpoints.

### Files
- Existing: `api/_anthropic.js`, `api/tailor.js`, `api/analyze.js`
- Create: `api/rewrite-bullets.js`
- Create: `api/ats-score.js`
- Create: `api/generate-summary.js`
- Create: `api/suggest-keywords.js`
- Create: `api/translate.js`

---

### Task 3.1: Create `api/rewrite-bullets.js`

- [ ] **Step 1: Read `api/_anthropic.js` to understand the helper pattern**

Open `api/_anthropic.js` and note the `callAnthropic(prompt, systemPrompt)` function signature used by `tailor.js`.

- [ ] **Step 2: Create `api/rewrite-bullets.js`**

```js
const { callAnthropic } = require('./_anthropic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { rawText, jobTitle, targetJobTitle, targetIndustry, jobDescriptionText } = req.body;

  if (!rawText) return res.status(400).json({ error: 'rawText is required' });

  const systemPrompt = `You are a professional resume writer following Harvard Resume Guide principles.
Transform plain-language job descriptions into 3-5 action-verb-led achievement bullets.
Rules:
1. Start every bullet with a strong action verb (Led, Developed, Implemented, Achieved, Orchestrated)
2. Quantify results wherever possible (percentages, dollar amounts, headcount, time saved)
3. Focus on achievements and measurable impact, not duties
4. Keep each bullet to 1-2 lines maximum
5. Incorporate relevant keywords from the job description without keyword stuffing
6. Eliminate weak verbs: helped, assisted, was responsible for, participated in
Return ONLY a JSON array of strings: ["bullet 1", "bullet 2", ...]`;

  const userPrompt = `Job Title: ${jobTitle || 'Not specified'}
Target Role: ${targetJobTitle || 'Not specified'}
Target Industry: ${targetIndustry || 'Not specified'}
Job Description Keywords: ${jobDescriptionText ? jobDescriptionText.substring(0, 500) : 'None provided'}

Plain language input:
${rawText}

Rewrite this into 3-5 achievement-focused bullet points.`;

  try {
    const raw = await callAnthropic(userPrompt, systemPrompt);
    // Parse JSON from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const bullets = jsonMatch ? JSON.parse(jsonMatch[0]) : [raw];
    res.status(200).json({ bullets });
  } catch (err) {
    console.error('rewrite-bullets error:', err);
    res.status(500).json({ error: 'AI rewriting failed', details: err.message });
  }
};
```

- [ ] **Step 3: Test the endpoint manually**
```bash
curl -X POST http://localhost:3002/api/rewrite-bullets \
  -H "Content-Type: application/json" \
  -d '{"rawText":"I managed a team and improved sales numbers","jobTitle":"Sales Manager","targetJobTitle":"Sales Director","targetIndustry":"Finance","jobDescriptionText":""}'
```
Expected: `{"bullets": ["Led cross-functional team...", "Drove ...", ...]}`

- [ ] **Step 4: Commit**
```bash
git add api/rewrite-bullets.js
git commit -m "feat: add /api/rewrite-bullets — AI bullet point rewriting (F-AI-001)"
```

---

### Task 3.2: Create `api/ats-score.js`

- [ ] **Step 1: Create `api/ats-score.js`**

```js
const { callAnthropic } = require('./_anthropic');
const crypto = require('crypto');

// Simple TF-IDF-like keyword extraction
function extractKeywords(text) {
  if (!text) return [];
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'we', 'you', 'they', 'i', 'it', 'he', 'she']);
  return text.toLowerCase()
    .replace(/[^a-z0-9\s+#]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function cosineSimilarity(textA, textB) {
  const wordsA = extractKeywords(textA);
  const wordsB = extractKeywords(textB);
  const allWords = [...new Set([...wordsA, ...wordsB])];
  if (allWords.length === 0) return 0;

  const freqA = Object.fromEntries(allWords.map(w => [w, wordsA.filter(x => x === w).length]));
  const freqB = Object.fromEntries(allWords.map(w => [w, wordsB.filter(x => x === w).length]));

  const dot = allWords.reduce((sum, w) => sum + (freqA[w] || 0) * (freqB[w] || 0), 0);
  const magA = Math.sqrt(Object.values(freqA).reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(Object.values(freqB).reduce((s, v) => s + v * v, 0));

  return magA && magB ? dot / (magA * magB) : 0;
}

function calculateFormatScore(resumeData) {
  let score = 100;
  // Deduct for missing standard sections
  if (!resumeData.personal_info?.full_name) score -= 20;
  if (!resumeData.personal_info?.professional_email) score -= 15;
  if (!resumeData.work_experience?.length) score -= 20;
  if (!resumeData.skills?.technical?.length && !resumeData.skills?.programming_languages?.length) score -= 15;
  return Math.max(0, score);
}

function calculateCompletenessScore(resumeData) {
  let score = 0;
  const checks = [
    [resumeData.personal_info?.full_name, 15],
    [resumeData.personal_info?.professional_email, 15],
    [resumeData.personal_info?.phone_number, 10],
    [resumeData.work_experience?.length > 0, 20],
    [resumeData.education?.length > 0, 15],
    [resumeData.skills?.technical?.length > 0 || resumeData.skills?.programming_languages?.length > 0, 15],
    [resumeData.target_job_title, 10],
  ];
  for (const [condition, points] of checks) {
    if (condition) score += points;
  }
  return Math.min(100, score);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeData, jobDescriptionText } = req.body;
  if (!resumeData) return res.status(400).json({ error: 'resumeData is required' });

  // Build resume text blob for comparison
  const resumeText = [
    resumeData.personal_info?.full_name,
    resumeData.target_job_title,
    ...(resumeData.work_experience || []).map(e => `${e.job_title} ${e.company_name} ${e.job_description_raw || ''}`),
    ...(resumeData.skills?.technical || []),
    ...(resumeData.skills?.programming_languages || []),
    ...(resumeData.skills?.tools || []),
    ...(resumeData.skills?.domain_specific || []),
  ].filter(Boolean).join(' ');

  // 1. Keyword Match Score (40%)
  const keywordScore = jobDescriptionText
    ? Math.round(cosineSimilarity(resumeText, jobDescriptionText) * 100 * 2.5) // scale to 0-100
    : 50; // no JD = neutral

  // 2. Format Compliance Score (20%)
  const formatScore = calculateFormatScore(resumeData);

  // 3. Completeness Score (15%)
  const completenessScore = calculateCompletenessScore(resumeData);

  // 4. Impact Score (25%) — AI-evaluated
  let impactScore = 50;
  let missingKeywords = [];
  let suggestions = [];

  try {
    const aiPrompt = `Analyze these resume bullet points for impact quality.
Score 0-100 based on: action verbs used, quantified results, achievement vs duty focus.
Also identify missing keywords from the job description.
Return JSON: { "impact_score": number, "missing_keywords": string[], "suggestions": string[] }

Resume bullets:
${(resumeData.work_experience || []).flatMap(e => e.bullet_points || [e.job_description_raw]).filter(Boolean).join('\n')}

Job Description keywords to check against:
${jobDescriptionText ? jobDescriptionText.substring(0, 800) : 'None provided'}`;

    const aiRaw = await callAnthropic(aiPrompt, 'You are an ATS resume analyzer. Return only valid JSON.');
    const jsonMatch = aiRaw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiData = JSON.parse(jsonMatch[0]);
      impactScore = Math.min(100, Math.max(0, aiData.impact_score || 50));
      missingKeywords = aiData.missing_keywords || [];
      suggestions = aiData.suggestions || [];
    }
  } catch (err) {
    console.error('AI impact scoring failed, using default:', err.message);
  }

  const overallScore = (
    (keywordScore * 0.40) +
    (formatScore * 0.20) +
    (impactScore * 0.25) +
    (completenessScore * 0.15)
  );

  const jdHash = crypto.createHash('md5').update(jobDescriptionText || '').digest('hex');

  res.status(200).json({
    overall_score: Math.round(overallScore),
    keyword_score: Math.min(100, Math.round(keywordScore)),
    format_score: Math.round(formatScore),
    impact_score: Math.round(impactScore),
    completeness_score: Math.round(completenessScore),
    missing_keywords: missingKeywords.slice(0, 15),
    suggestions: suggestions.slice(0, 5),
    jdHash,
  });
};
```

- [ ] **Step 2: Commit**
```bash
git add api/ats-score.js
git commit -m "feat: add /api/ats-score — 4-factor weighted ATS scoring engine (F-AI-002)"
```

---

### Task 3.3: Create `api/generate-summary.js`

- [ ] **Step 1: Create `api/generate-summary.js`**

```js
const { callAnthropic } = require('./_anthropic');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeData } = req.body;
  if (!resumeData) return res.status(400).json({ error: 'resumeData is required' });

  const yearsOfExperience = (() => {
    const jobs = resumeData.work_experience || [];
    if (!jobs.length) return 0;
    const years = jobs.map(j => j.start_year).filter(Boolean);
    return years.length ? new Date().getFullYear() - Math.min(...years) : 0;
  })();

  const topSkills = [
    ...(resumeData.skills?.programming_languages || []),
    ...(resumeData.skills?.technical || []),
    ...(resumeData.skills?.tools || []),
  ].slice(0, 6).join(', ');

  const systemPrompt = `You are an expert resume writer. Generate a concise, compelling 3-4 sentence professional summary.
The summary should:
- Open with years of experience and target role
- Highlight 2-3 top skills relevant to the target job
- Include a notable achievement or differentiator
- Close with value proposition for the employer
- Use professional but confident tone
- NOT use phrases like "results-driven", "dynamic", "passionate", "team player"
Return ONLY the summary text, no quotes, no preamble.`;

  const userPrompt = `Target Job Title: ${resumeData.target_job_title || 'Not specified'}
Target Industry: ${resumeData.target_industry || 'Not specified'}
Seniority Level: ${resumeData.seniority_level || 'mid'}
Years of Experience: ${yearsOfExperience}
Top Skills: ${topSkills || 'Not listed'}
Most Recent Role: ${resumeData.work_experience?.[0]?.job_title || 'Not provided'} at ${resumeData.work_experience?.[0]?.company_name || ''}
Education: ${resumeData.education?.[0]?.degree_type || ''} in ${resumeData.education?.[0]?.field_of_study || ''} from ${resumeData.education?.[0]?.institution_name || ''}
Job Description Keywords: ${resumeData.job_description_text ? resumeData.job_description_text.substring(0, 400) : 'None'}

Generate a 3-4 sentence professional summary.`;

  try {
    const summary = await callAnthropic(userPrompt, systemPrompt);
    res.status(200).json({ summary: summary.trim() });
  } catch (err) {
    console.error('generate-summary error:', err);
    res.status(500).json({ error: 'Summary generation failed', details: err.message });
  }
};
```

- [ ] **Step 2: Commit**
```bash
git add api/generate-summary.js
git commit -m "feat: add /api/generate-summary — AI professional summary generator (F-AI-003)"
```

---

### Task 3.4: Create `api/translate.js` (French Translation — F-EXP-003)

- [ ] **Step 1: Create `api/translate.js`**

```js
// Uses Claude as translation engine (spec calls for DeepL; Claude is our LLM — equivalent quality)
const { callAnthropic } = require('./_anthropic');

const FRENCH_SECTION_HEADERS = {
  'Experience': 'Expérience Professionnelle',
  'Education': 'Formation',
  'Skills': 'Compétences',
  'Projects': 'Projets',
  'Certifications': 'Certifications',
  'Languages': 'Langues',
  'Volunteer': 'Bénévolat',
  'Awards': 'Prix et Distinctions',
  'Summary': 'Résumé Professionnel',
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { resumeData } = req.body;
  if (!resumeData) return res.status(400).json({ error: 'resumeData is required' });

  const systemPrompt = `You are a professional French translator specializing in business and resume documents.
Translate the provided resume content to professional French.
Rules:
- Use professional French business terminology
- Localize job titles (Software Engineer → Ingénieur Logiciel)
- Convert date formats (January 2024 → Janvier 2024)
- Keep technical terms in English if they are industry standard (Machine Learning, JavaScript, etc.)
- Use formal "vous" register in summary text
- Return the translated content as a JSON object with the same structure as input.`;

  try {
    const userPrompt = `Translate this resume content to French:\n${JSON.stringify(resumeData, null, 2).substring(0, 8000)}`;
    const raw = await callAnthropic(userPrompt, systemPrompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const translated = jsonMatch ? JSON.parse(jsonMatch[0]) : resumeData;

    res.status(200).json({
      translated,
      sectionHeaders: FRENCH_SECTION_HEADERS,
    });
  } catch (err) {
    console.error('translate error:', err);
    res.status(500).json({ error: 'Translation failed', details: err.message });
  }
};
```

- [ ] **Step 2: Commit**
```bash
git add api/translate.js
git commit -m "feat: add /api/translate — French resume translation (F-EXP-003)"
```

---

## PHASE 4 — Dashboard Improvements

### Files
- Modify: `src/pages/dashboard/DashboardPage.jsx` — ATS score badge, duplicate, card actions
- Modify: `src/services/resumeService.js` — add duplicateResume function
- Create: `src/hooks/useAutoSave.js` — 1-second debounced save hook

---

### Task 4.1: Wire ATS Score Badge on Resume Cards

- [ ] **Step 1: Update dashboard to fetch ATS score per resume**

In `src/pages/dashboard/DashboardPage.jsx`, after fetching resumes, also query `ats_scores` for each resume:

```js
// After fetching resumes array:
const resumesWithScores = await Promise.all(
  resumes.map(async (resume) => {
    const { data: scoreData } = await supabase
      .from('ats_scores')
      .select('overall_score')
      .eq('resume_id', resume.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    return { ...resume, ats_score: scoreData?.overall_score ?? null };
  })
);
```

- [ ] **Step 2: Add ATS score badge to resume card JSX**

Find the resume card render in `DashboardPage.jsx` and add:

```jsx
{/* ATS Score Badge */}
<div className="flex items-center gap-1">
  {resume.ats_score !== null ? (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
      resume.ats_score >= 75 ? 'bg-green-100 text-green-700' :
      resume.ats_score >= 60 ? 'bg-yellow-100 text-yellow-700' :
      'bg-red-100 text-red-700'
    }`}>
      ATS {Math.round(resume.ats_score)}
    </span>
  ) : (
    <span className="text-xs text-gray-400 px-2 py-0.5 rounded-full border border-gray-200">
      Not scored
    </span>
  )}
</div>
```

- [ ] **Step 3: Add Resume Status badge (Draft / Complete)**

```jsx
<span className={`text-xs px-2 py-0.5 rounded-full ${
  resume.status === 'complete' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'
}`}>
  {resume.status === 'complete' ? 'Complete' : 'Draft'}
</span>
```

- [ ] **Step 4: Add card action buttons (Edit, Duplicate, Export, Delete)**

Below the card content:

```jsx
<div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
  <button
    onClick={() => navigate(`/app/builder/${resume.id}`)}
    className="flex-1 text-xs py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-center"
  >
    Edit
  </button>
  <button
    onClick={() => handleDuplicate(resume.id)}
    className="flex-1 text-xs py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
  >
    Duplicate
  </button>
  <button
    onClick={() => navigate(`/app/export/${resume.id}`)}
    className="flex-1 text-xs py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-center"
  >
    Export
  </button>
  <button
    onClick={() => handleDelete(resume.id)}
    className="text-xs py-1.5 px-2 text-red-500 hover:bg-red-50 rounded-lg"
  >
    Delete
  </button>
</div>
```

- [ ] **Step 5: Add `handleDuplicate` handler**

In the component body:

```js
const handleDuplicate = async (resumeId) => {
  try {
    const { data: original } = await supabase
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single();

    const { data: copy } = await supabase
      .from('resumes')
      .insert({
        ...original,
        id: undefined,
        title: `${original.title} (Copy)`,
        created_at: undefined,
        updated_at: undefined,
        ats_score: null,
        status: 'draft',
      })
      .select()
      .single();

    toast.success('Resume duplicated!');
    fetchResumes(); // refresh the list
  } catch (err) {
    toast.error('Failed to duplicate resume');
  }
};
```

- [ ] **Step 6: Commit**
```bash
git add src/pages/dashboard/DashboardPage.jsx
git commit -m "feat: add ATS score badge, status badge, and card actions to dashboard"
```

---

### Task 4.2: Auto-Save Hook (`useAutoSave.js`)

- [ ] **Step 1: Create `src/hooks/useAutoSave.js`**

```js
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../services/api';

/**
 * Auto-saves form data to Supabase with a 1-second debounce.
 * Shows save indicator states: 'idle' | 'saving' | 'saved' | 'error'
 */
export function useAutoSave(resumeId, watchedValues, tableName = 'resumes') {
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const timerRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!resumeId || !watchedValues) return;

    // Debounce: cancel previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    setSaveStatus('saving');
    timerRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from(tableName)
          .update({ ...watchedValues, updated_at: new Date().toISOString() })
          .eq('id', resumeId);
        if (error) throw error;
        setSaveStatus('saved');
        // Reset to idle after 2 seconds
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, 1000);

    return () => clearTimeout(timerRef.current);
  }, [JSON.stringify(watchedValues)]);

  return saveStatus;
}
```

- [ ] **Step 2: Create `SaveIndicator` component in `src/components/common/SaveIndicator.jsx`**

```jsx
export default function SaveIndicator({ status }) {
  if (status === 'idle') return null;
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
      status === 'saving' ? 'text-gray-400' :
      status === 'saved'  ? 'text-green-600' :
      'text-red-500'
    }`}>
      {status === 'saving' && <><span className="animate-spin">⟳</span> Saving...</>}
      {status === 'saved'  && <><span>✓</span> Saved</>}
      {status === 'error'  && <><span>✗</span> Save failed</>}
    </div>
  );
}
```

- [ ] **Step 3: Wire into `ResumeBuilderPage.jsx`**

In `ResumeBuilderPage.jsx`:

```js
import { useAutoSave } from '../../hooks/useAutoSave';
import SaveIndicator from '../../components/common/SaveIndicator';

// Inside component:
const watchedValues = watch(); // watch all form fields
const saveStatus = useAutoSave(resumeId, watchedValues);

// In the JSX header/nav area of the builder:
<SaveIndicator status={saveStatus} />
```

- [ ] **Step 4: Commit**
```bash
git add src/hooks/useAutoSave.js src/components/common/SaveIndicator.jsx src/pages/resume-builder/ResumeBuilderPage.jsx
git commit -m "feat: add auto-save with 1s debounce and save indicator (F-DASH-003)"
```

---

## PHASE 5 — Resume Templates (4 Templates)

> Spec requires 4 ATS-safe templates: Modern (existing), Classic, Minimal, Professional.

### Files
- Modify: `src/components/resume/ResumeTemplate.jsx` — add template prop + 4 variants
- Modify: `src/pages/export/ExportPage.jsx` — add template selection UI

---

### Task 5.1: Add 3 Additional Templates to `ResumeTemplate.jsx`

- [ ] **Step 1: Read current `src/components/resume/ResumeTemplate.jsx`**

Understand the current template structure (how sections are rendered, what props it accepts).

- [ ] **Step 2: Add `template` prop and switch between styles**

Wrap the existing template in a `templateConfig` object. Add 3 new visual variants using Tailwind classes only (no tables, no images in content area — ATS-safe):

```jsx
// Template style configs
const TEMPLATE_STYLES = {
  modern: {
    headerBg: 'bg-brand-700',
    headerText: 'text-white',
    headingColor: 'text-brand-700',
    headingBorder: 'border-brand-700',
    font: 'font-sans',
    accentColor: 'text-brand-600',
  },
  classic: {
    headerBg: 'bg-gray-900',
    headerText: 'text-white',
    headingColor: 'text-gray-900',
    headingBorder: 'border-gray-900',
    font: 'font-serif',
    accentColor: 'text-gray-700',
  },
  minimal: {
    headerBg: 'bg-white',
    headerText: 'text-gray-900',
    headingColor: 'text-gray-700',
    headingBorder: 'border-gray-300',
    font: 'font-sans',
    accentColor: 'text-gray-500',
  },
  professional: {
    headerBg: 'bg-slate-700',
    headerText: 'text-white',
    headingColor: 'text-slate-700',
    headingBorder: 'border-slate-400',
    font: 'font-sans',
    accentColor: 'text-slate-600',
  },
};

export default function ResumeTemplate({ resumeData, template = 'modern' }) {
  const styles = TEMPLATE_STYLES[template] || TEMPLATE_STYLES.modern;
  // ... use styles.headerBg, styles.headingColor etc. throughout the template JSX
}
```

- [ ] **Step 3: Commit**
```bash
git add src/components/resume/ResumeTemplate.jsx
git commit -m "feat: add Classic, Minimal, Professional templates to ResumeTemplate (F-EXP-002)"
```

---

### Task 5.2: Template Selection UI in `ExportPage.jsx`

- [ ] **Step 1: Add template selector before the export buttons in `ExportPage.jsx`**

```jsx
const TEMPLATES = [
  { id: 'modern', name: 'Modern', description: 'Clean lines, color accents', bestFor: 'Tech, Startups' },
  { id: 'classic', name: 'Classic', description: 'Traditional, serif fonts', bestFor: 'Finance, Law' },
  { id: 'minimal', name: 'Minimal', description: 'Maximum whitespace', bestFor: 'Academia, Research' },
  { id: 'professional', name: 'Professional', description: 'Balanced, modern-classic', bestFor: 'Healthcare, Business' },
];

const [selectedTemplate, setSelectedTemplate] = useState('modern');

// In JSX:
<div>
  <h3 className="text-sm font-semibold text-gray-700 mb-3">Choose Template</h3>
  <div className="grid grid-cols-2 gap-3">
    {TEMPLATES.map(t => (
      <button
        key={t.id}
        type="button"
        onClick={() => setSelectedTemplate(t.id)}
        className={`p-3 rounded-xl border-2 text-left transition-all ${
          selectedTemplate === t.id ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        <p className="text-sm font-semibold text-gray-800">{t.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
        <p className="text-xs text-brand-600 mt-1">Best for: {t.bestFor}</p>
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 2: Pass `selectedTemplate` to `ResumeTemplate` and PDF export**

Pass `template={selectedTemplate}` to the `ResumeTemplate` component used in the preview section of ExportPage.

- [ ] **Step 3: Save selected template to resume record**

When template changes:
```js
await supabase.from('resumes').update({ template_id: selectedTemplate }).eq('id', resumeId);
```

- [ ] **Step 4: Commit**
```bash
git add src/pages/export/ExportPage.jsx
git commit -m "feat: add 4-template selection UI to ExportPage (F-EXP-002)"
```

---

## PHASE 6 — Auth & GDPR Compliance

### Files
- Modify: `src/pages/auth/SignInPage.jsx` — wire Google OAuth button
- Modify: `src/pages/auth/AccountSettingsPage.jsx` — add data export + account deletion

---

### Task 6.1: Wire Google OAuth (Supabase)

- [ ] **Step 1: Enable Google OAuth in Supabase Dashboard**

Go to Supabase Dashboard → Authentication → Providers → Google → Enable.
Add Google OAuth Client ID and Secret (from Google Cloud Console).

- [ ] **Step 2: Wire the Sign In with Google button**

In `src/pages/auth/SignInPage.jsx`, find the existing Google button (which currently does nothing) and add:

```js
import { supabase } from '../../services/api';

const handleGoogleSignIn = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/app/dashboard`,
    },
  });
  if (error) toast.error(error.message);
};

// On the button:
<button onClick={handleGoogleSignIn} type="button" className="...existing classes...">
  <img src="/google-icon.svg" alt="Google" className="w-4 h-4" />
  Continue with Google
</button>
```

- [ ] **Step 3: Wire the same handler to `SignUpPage.jsx`**

Same code as Step 2, applied to the Google button in SignUpPage.

- [ ] **Step 4: Commit**
```bash
git add src/pages/auth/SignInPage.jsx src/pages/auth/SignUpPage.jsx
git commit -m "feat: wire Google OAuth via Supabase signInWithOAuth (F-AUTH-001)"
```

---

### Task 6.2: GDPR Data Export + Account Deletion

- [ ] **Step 1: Add Data Export button to `AccountSettingsPage.jsx`**

```jsx
const handleDataExport = async () => {
  const userId = user.id;
  // Fetch all user data
  const [resumesRes, profileRes] = await Promise.all([
    supabase.from('resumes').select('*, education(*), work_experience(*), skills(*), certifications(*), projects(*), professional_summary(*)').eq('user_id', userId),
    supabase.from('profiles').select('*').eq('id', userId).single(),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: profileRes.data,
    resumes: resumesRes.data,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scopusresume-data-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Your data has been downloaded.');
};
```

- [ ] **Step 2: Add Account Deletion with soft-delete**

```jsx
const handleDeleteAccount = async () => {
  const confirmed = window.confirm(
    'Are you sure you want to delete your account? You have 30 days to recover it before all data is permanently deleted.'
  );
  if (!confirmed) return;

  const { error } = await supabase
    .from('profiles')
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    toast.error('Failed to delete account. Please contact support.');
    return;
  }

  toast.success('Account deletion scheduled. You have 30 days to recover it.');
  await supabase.auth.signOut();
  navigate('/');
};
```

- [ ] **Step 3: Add the UI in AccountSettingsPage.jsx — Danger Zone section**

```jsx
{/* GDPR / Data Section */}
<div className="border border-red-200 rounded-xl p-4 space-y-3">
  <h3 className="text-sm font-semibold text-red-700">Data & Privacy</h3>
  <div className="flex justify-between items-center">
    <div>
      <p className="text-sm text-gray-700">Export Your Data</p>
      <p className="text-xs text-gray-500">Download all your resume data as JSON (GDPR)</p>
    </div>
    <button onClick={handleDataExport} className="text-sm px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
      Export JSON
    </button>
  </div>
  <hr className="border-gray-200" />
  <div className="flex justify-between items-center">
    <div>
      <p className="text-sm text-gray-700">Delete Account</p>
      <p className="text-xs text-gray-500">30-day grace period before permanent deletion</p>
    </div>
    <button onClick={handleDeleteAccount} className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
      Delete Account
    </button>
  </div>
</div>
```

- [ ] **Step 4: Commit**
```bash
git add src/pages/auth/AccountSettingsPage.jsx
git commit -m "feat: add GDPR data export and soft-delete account deletion (F-AUTH-004)"
```

---

## PHASE 7 — Update `tasks/todo.md`

### Task 7.1: Replace todo.md with spec-aligned tracking

- [ ] **Step 1: Update `tasks/todo.md` to reflect the new plan structure**

Replace the current Sprint 4 section with the phased plan from this document. Mark all previously completed items as done and organize remaining work by phase.

- [ ] **Step 2: Commit**
```bash
git add tasks/todo.md
git commit -m "docs: update todo.md with spec-aligned 6-phase plan"
```

---

## SELF-REVIEW CHECKLIST

### Spec Coverage Check
| Spec Requirement | Task Covered |
|-----------------|--------------|
| F-BUILD-002: Career Objective with JD input | Task 2.2 ✅ |
| F-BUILD-003: Education with GPA, enrolled, coursework, dnd | Task 2.3 ✅ |
| F-BUILD-004: Work Experience with AI bullet rewriting | Task 2.4 ✅ |
| F-BUILD-005: Skills 5 categories + proficiency | Task 2.5 ✅ |
| F-BUILD-006: Additional Info collapsible | Task 2.6 ✅ |
| F-BUILD-007: Review & Optimize live ATS | Task 2.7 ✅ |
| F-AI-001: Bullet Point Rewriting | Task 3.1 ✅ |
| F-AI-002: ATS Scoring Engine 4-factor | Task 3.2 ✅ |
| F-AI-003: Professional Summary Generator | Task 3.3 ✅ |
| F-EXP-002: 4 Template Library | Task 5.1 + 5.2 ✅ |
| F-EXP-003: French Translation | Task 3.4 ✅ |
| F-DASH-001: Dashboard with ATS score badge | Task 4.1 ✅ |
| F-DASH-002: Resume card with all actions | Task 4.1 ✅ |
| F-DASH-003: Auto-save 1s debounce | Task 4.2 ✅ |
| F-AUTH-001: Google OAuth | Task 6.1 ✅ |
| F-AUTH-004: GDPR data export + deletion | Task 6.2 ✅ |
| DB: bullet_points table | Task 1.3 ✅ |
| DB: volunteer_experience, publications, awards, professional_summary | Task 1.4 ✅ |
| DB: ats_scores, job_analyses, export_history | Task 1.5 ✅ |

### Known Adaptations from Spec
- Using **Supabase** (Postgres + Auth) instead of MySQL + JWT custom backend — functionally equivalent
- Using **Anthropic Claude** instead of OpenAI GPT-4o — equivalent capability
- Using **Vercel serverless functions** instead of Express.js — equivalent API surface
- Using **html2pdf.js** instead of Puppeteer for PDF — Puppeteer unavailable in Vercel Edge; html2pdf is sufficient for MVP
- **DOCX export** deferred — requires `docx` npm package in a Vercel function, low complexity, add after core features complete
- **Publications** collapsible section in AdditionalInfo — pattern is identical to Awards, implement alongside
- **Rate limiting** — not implemented client-side; Vercel provides basic rate limiting; full Redis rate limiting requires backend deployment

---

## EXECUTION ORDER RECOMMENDATION

Work phase by phase in this exact order — each phase unblocks the next:

1. **Phase 1** (Schema) — Run SQL migrations in Supabase. No code until this is done.
2. **Phase 2** (Builder) — Longest phase. Tackle one step per session.
3. **Phase 3** (API) — Parallelize: each `api/*.js` file is independent.
4. **Phase 4** (Dashboard) — Quick wins after schema is in place.
5. **Phase 5** (Templates) — Mostly CSS/styling work.
6. **Phase 6** (Auth/GDPR) — Each task is independent.
7. **Phase 7** (Docs) — Housekeeping last.

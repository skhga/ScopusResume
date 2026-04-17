# ScopusResume — Task Tracker

> Source of Truth: CS353 Feature Specification + Technical Specification (Schiller International University)
> Full implementation plan: `docs/superpowers/plans/2026-04-16-spec-alignment-master-plan.md`

---

## Completed ✅

### Foundation
- [x] Project setup (React 19, Tailwind, React Router, React Hook Form + Zod)
- [x] Auth flow (sign up, sign in, password reset, account settings) via Supabase
- [x] Resume builder — 8-step guided form (personal info, education, work, skills, projects, certs, objective, summary)
- [x] Resume context + Supabase persistence (CRUD)
- [x] Resume preview page
- [x] Dashboard with resume list

### AI Features
- [x] AI Tailor (JD Analyzer) — diff view, apply individual or all suggestions
- [x] ATS Optimizer — keyword match score, missing keywords, voice consistency
- [x] AI Optimization page — bullet point rewriting, summary generation
- [x] Resume version snapshots (resumeVersionService)
- [x] Custom 404 / error page
- [x] Fix auth error messages
- [x] Handle email confirmation flow on signup

### Polish & Ship
- [x] Fix async bug in createResume (Dashboard)
- [x] Fix export quick action navigation
- [x] Real PDF export (html2pdf.js, A4, 2x scale)
- [x] Real TXT export (resumeToText → Blob download)
- [x] Landing page redesign (2-col hero, pain-first copy)
- [x] Vercel API proxy routes (api/tailor.js, api/analyze.js, api/_anthropic.js)
- [x] Privacy Policy page + Cookie Banner (GDPR/CCPA)

---

## PHASE 1 — Supabase Schema Migration 🗄️

> Run SQL migrations in Supabase dashboard FIRST. Everything else depends on this.

- [ ] **1.1** Add career objective + template + ATS fields to `resumes` table
- [ ] **1.2** Add `currently_enrolled`, `gpa`, `honors_awards`, `relevant_coursework`, `thesis_title`, `display_order` to `education` table
- [ ] **1.3** Add `is_remote`, `job_description_raw`, `display_order` to `work_experience`; create `bullet_points` table
- [ ] **1.4** Create new tables: `volunteer_experience`, `publications`, `awards`, `professional_summary`
- [ ] **1.5** Create AI processing tables: `ats_scores`, `job_analyses`, `export_history`
- [ ] **1.6** Update `resumeService.js` with helpers for new tables

---

## PHASE 2 — Resume Builder Restructure (7-Step Spec Alignment) 🏗️

> Target: PersonalInfo → CareerObjective → Education → WorkExperience → Skills → AdditionalInfo → ReviewOptimize

- [ ] **2.1** Reorder STEPS array in `ResumeBuilderPage.jsx` to 7-step spec flow
- [ ] **2.2** Enhance `CareerObjectiveStep.jsx` — add JD input (10k chars), industry dropdown, seniority radio buttons
- [ ] **2.3** Enhance `EducationStep.jsx` — add GPA (≥3.5 display), currently_enrolled, relevant_coursework (tag), thesis_title, @dnd-kit drag-and-drop reorder
- [ ] **2.4** Enhance `WorkExperienceStep.jsx` — add is_remote checkbox, job_description_raw textarea, AI bullet rewriting with per-bullet accept/reject UI
- [ ] **2.5** Rewrite `SkillsStep.jsx` — 5 categories (Technical tag, Programming Languages tag+suggestions, Tools tag+suggestions, Languages+proficiency dropdown, Domain-Specific tag)
- [ ] **2.6** Create `AdditionalInfoStep.jsx` — collapsible sections for Projects, Certifications, Volunteer Experience, Awards (replaces ProjectsStep + CertificationsStep)
- [ ] **2.7** Create `ReviewOptimizeStep.jsx` — live ATS score panel + professional summary generator + optimization settings (replaces SummaryStep)

---

## PHASE 3 — Vercel API Functions 🤖

> Each file is independent — can be built in parallel.

- [ ] **3.1** Create `api/rewrite-bullets.js` — Harvard-style AI bullet rewriting (F-AI-001)
- [ ] **3.2** Create `api/ats-score.js` — 4-factor weighted ATS scoring: keyword match 40%, format 20%, impact 25%, completeness 15% (F-AI-002)
- [ ] **3.3** Create `api/generate-summary.js` — 3-4 sentence professional summary generator (F-AI-003)
- [ ] **3.4** Create `api/translate.js` — French resume translation via Claude (F-EXP-003)
- [ ] **3.5** Create `api/suggest-keywords.js` — identify missing JD keywords (F-AI-004)

---

## PHASE 4 — Dashboard & UX 📊

- [ ] **4.1** Wire ATS score badge on resume cards (fetch from `ats_scores` table, color-coded green/yellow/red)
- [ ] **4.2** Add Resume Status badge (Draft / Complete) on cards
- [ ] **4.3** Add card action buttons: Edit, Duplicate, Export, Delete with confirmation (F-DASH-002)
- [ ] **4.4** Implement Duplicate Resume functionality
- [ ] **4.5** Create `useAutoSave` hook (1s debounce, saves to Supabase) + `SaveIndicator` component (F-DASH-003)
- [ ] **4.6** Wire auto-save into `ResumeBuilderPage.jsx`

---

## PHASE 5 — Templates & Export 🎨

- [ ] **5.1** Add Classic, Minimal, Professional template variants to `ResumeTemplate.jsx` (currently only Modern) (F-EXP-002)
- [ ] **5.2** Add template selection grid UI to `ExportPage.jsx`
- [ ] **5.3** Save selected template to `resumes.template_id` in Supabase
- [ ] **5.4** Add French translation export option in `ExportPage.jsx` (calls `/api/translate`) (F-EXP-003)
- [ ] **5.5** DOCX export — `docx` npm package in a Vercel function

---

## PHASE 6 — Auth & GDPR 🔐

- [ ] **6.1** Wire Google OAuth button in `SignInPage.jsx` and `SignUpPage.jsx` via `supabase.auth.signInWithOAuth` (F-AUTH-001)
- [ ] **6.2** GDPR data export — download all user data as JSON from `AccountSettingsPage.jsx` (F-AUTH-004)
- [ ] **6.3** Account deletion — soft-delete with `is_deleted=true` + `deleted_at` timestamp, then sign out (F-AUTH-004)

---

## Backlog (Post-MVP)

- [ ] Publications and Awards collapsible sections in AdditionalInfoStep (pattern identical to Volunteer)
- [ ] Resume import (upload existing PDF/DOCX and parse via Affinda API)
- [ ] LinkedIn OAuth (Phase 2 per spec)
- [ ] Application tracker (job applications + status)
- [ ] Mobile PWA
- [ ] PostHog analytics integration
- [ ] Pricing page + Stripe billing

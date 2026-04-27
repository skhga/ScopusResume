# ScopusResume — New User Journey Diagram (Design Spec)

**Date:** 2026-04-28
**Author:** Shomer A. Kayit (Schiller International University, CS353 Integrative Project III)
**Output artifacts:**
- FigJam board (URL added after generation)
- Companion markdown: `~/Documents/Shiller International University /School Work /Integrative Project III /ScopusResume_User_Journey_Diagram.md`

---

## 1. Purpose

Produce a single visual diagram, plus a companion reference document, that communicates:

1. The end-to-end journey of a **new user** from landing on the site to **exporting** a finished resume.
2. How the **job description (JD)** captured in the wizard connects to AI analysis and the final ATS score.
3. That the user can **navigate back and forth** between the 8 wizard steps without losing data.
4. Which phases are **MVP** (academic submission scope) vs **Phase 2** (planned, not in MVP).
5. The **DB tables** written at each phase and the **AI API endpoints** called.

The diagram is the academic deliverable; the markdown is the reference appendix that holds the full payload shapes, table columns, and SQL examples. Together they answer every prompt question.

## 2. Color Legend

- 🟩 **MVP (Green)** — in scope for the academic submission. Includes auth, dashboard, all 8 wizard step UIs and their persistence, PDF export.
- 🟧 **Phase 2 (Orange)** — planned but out of MVP. Includes JD analysis, AI bullet rewriting, AI skill suggestions, AI summary generation, ATS scoring engine, DOCX export, French translation.

## 3. Diagram Structure

### Format
- **FigJam board** generated via the Figma MCP `generate_diagram` tool.
- **Layout:** 4 horizontal swim lanes × 14 vertical phase columns.
- **Look-and-feel:** clean rectangles for steps, cylinders for DB writes, cloud icons for AI API calls.

### Swim Lanes (top → bottom)

| Lane | Contents |
|------|---------|
| **User** | Actions: clicks, form fills, paste JD, click Export |
| **Frontend (React)** | Pages and components: `LandingPage`, `SignUpPage`, `EmailVerificationPage`, `Dashboard`, `PersonalInfoStep`, `CareerObjectiveStep`, `EducationStep`, `WorkExperienceStep`, `SkillsStep`, `ProjectsStep`, `CertificationsStep`, `SummaryStep`, `ReviewOptimizePage`, `ExportPage` |
| **Supabase (Postgres + Auth)** | Table writes — see Section 5 |
| **AI API (OpenAI via Vercel /api/*)** | Endpoint calls — see Section 6 |

### Phase Columns (left → right)

| # | Phase | MVP/Phase 2 |
|---|-------|-------------|
| 1 | Landing page | 🟩 |
| 2 | Sign Up (Google OAuth) | 🟩 |
| 3 | Email verification | 🟩 |
| 4 | Dashboard → "Create New Resume" | 🟩 |
| 5 | **Step 1** — Personal Info | 🟩 |
| 6 | **Step 2** — Career Objective + JD paste | 🟩 (UI/storage); 🟧 (analysis) |
| 7 | **Step 3** — Education | 🟩 |
| 8 | **Step 4** — Work Experience + bullets | 🟩 (UI/storage); 🟧 (AI rewrite) |
| 9 | **Step 5** — Skills | 🟩 (UI/storage); 🟧 (AI suggestions) |
| 10 | **Step 6** — Projects | 🟩 |
| 11 | **Step 7** — Certifications | 🟩 |
| 12 | **Step 8** — Summary | 🟩 (UI/storage); 🟧 (AI generation) |
| 13 | Review & Optimize | 🟩 (preview); 🟧 (ATS scoring) |
| 14 | Export PDF (+ greyed Phase 2 branches: DOCX, French) | 🟩 (PDF); 🟧 (DOCX, FR) |

### Arrows
- **Bidirectional** between wizard steps 5–12 — represents back navigation.
- **One-way** for the auth flow (1 → 2 → 3 → 4) and the export flow (13 → 14).
- **Dotted callout** spanning Step 2 → Review/Optimize, labeled *"JD analysis fuels AI suggestions throughout & final ATS score"*.

### Annotation block
*"Auto-save: every field change persists within 1 second (debounced via `useAutoSave`). Back navigation never loses data — `resumes.current_step` tracks position."*

## 4. The JD ↔ AI Connection (the diagram's headline)

The diagram visually answers: **"How is the CV connected to the analysis of the job offer?"**

1. **JD enters at Step 2 (Career Objective).** User pastes the job description into a textarea (max 10,000 chars). MVP captures the raw text into `resumes.job_description_text`. 🟩
2. **JD is analyzed (Phase 2).** On blur/save, the frontend calls `POST /api/analyze` with `{jd_text}`. The endpoint returns structured data (required skills, preferred skills, keywords with frequency, seniority signals, culture hints) and writes to `job_analyses`. 🟧
3. **JD analysis powers AI suggestions across later steps:**
   - At **Step 4 (Work Experience)**, `job_analyses.keywords` are passed into `POST /api/rewrite-bullets` so suggested bullets contain JD-relevant keywords. 🟧
   - At **Step 5 (Skills)**, `job_analyses.required_skills` are passed into `POST /api/suggest-keywords` to suggest missing skills. 🟧
   - At **Step 8 (Summary)**, `job_analyses` data + the resume context feeds `POST /api/generate-summary`. 🟧
4. **JD drives the final ATS score at Step 13.** `POST /api/ats-score` reads the resume + the cached `job_analyses` row (matched via `jd_hash`) and returns a 4-factor weighted score. 🟧

**Visual treatment:** one bold dotted line spans the top of the diagram from Step 2's JD textarea all the way to Step 13's ATS panel, with the label *"JD → analysis → drives AI suggestions → final ATS score"*. Three smaller dotted offshoots from `job_analyses` feed Steps 4, 5, and 13.

This makes the academic point sharp: **the JD field itself is MVP, but every piece of intelligence that uses it is Phase 2.**

## 5. Database Reference (Supabase / Postgres)

Tables touched in the journey (subset of the 18-table schema):

| Table | Purpose | Written at phase |
|-------|---------|-----------------|
| `auth.users` (Supabase managed) | User accounts, OAuth identities, email_verified | 2, 3 |
| `resumes` | Top-level resume row, `current_step`, `status` (draft/complete), `target_*`, `job_description_text`, `template_id`, `ats_score` | 4, 5–13 (UPDATE) |
| `personal_info` | 1:1 with resume — contact, links | 5 |
| `education` | Repeatable — institution, degree, dates, GPA, honors | 7 |
| `work_experience` | Repeatable — company, role, dates, raw description | 8 |
| `bullet_points` | FK to experience — `raw_text`, `ai_text`, `is_using_ai` | 8 |
| `skills` | FK to resume — category enum, name, proficiency | 9 |
| `projects` | Repeatable | 10 |
| `certifications` | Repeatable | 11 |
| `professional_summary` | 1:1 with resume — `summary_text`, `is_ai_generated` | 12 |
| `job_analyses` 🟧 | Structured JD parse — `required_skills`, `preferred_skills`, `keywords`, `culture_signals` | 6 |
| `ats_scores` 🟧 | Score per `(resume_id, jd_hash)` — `keyword_score`, `format_score`, `impact_score`, `completeness_score`, `missing_keywords`, `suggestions` | 13 |
| `export_history` | One row per export — `format` enum (pdf/docx/txt/html), `language`, `template_id` | 14 |

The companion markdown will include 3–4 representative SQL snippets:
- Initial resume creation at phase 4
- A `bullet_points` upsert with both raw + AI text at phase 8
- The `ats_scores` insert with the 4 sub-scores at phase 13

## 6. AI API Reference (Vercel serverless functions)

| Endpoint | Triggered at | MVP/Phase 2 | Request | Response |
|----------|-------------|-------------|---------|----------|
| `POST /api/analyze` | Phase 6 (Step 2 JD blur) | 🟧 | `{jd_text}` | `{required_skills[], preferred_skills[], keywords[{term,count}], seniority, culture_signals[]}` |
| `POST /api/rewrite-bullets` | Phase 8 (Step 4, on demand) | 🟧 | `{raw_description, jd_keywords[]}` | `{bullets: [3-5 strings]}` |
| `POST /api/suggest-keywords` | Phase 9 (Step 5, on demand) | 🟧 | `{current_skills[], jd_required_skills[]}` | `{suggested_skills[]}` |
| `POST /api/generate-summary` | Phase 12 (Step 8, on demand) | 🟧 | `{experience_summary, top_skills[], target_role}` | `{summary_text}` (3–4 sentences) |
| `POST /api/ats-score` | Phase 13 (Review) | 🟧 | `{resume_id, jd_hash}` | `{keyword_score, format_score, impact_score, completeness_score, total, missing_keywords[], suggestions[]}` |
| `POST /api/translate` | Phase 14 (Phase 2 export branch) | 🟧 | `{resume_id, target_lang:"fr"}` | `{translated_resume}` |

All endpoints use the OpenAI Chat Completions API via the shared `api/_openai.js` helper (env var `OPENAI_KEY`). Rate limit: 20/min per user.

## 7. Back Navigation & Auto-save

- The wizard renders inside `ResumeBuilderPage`, which routes between the 8 step components based on `resumes.current_step`.
- Every field change is debounced 1s (via `useAutoSave`) and persisted to its respective table.
- A user clicking "Back" simply decrements the route — no destructive transition. The previous step's data is rehydrated from Supabase.
- Visualized in the diagram by **bidirectional arrows** between phases 5–12 plus a single annotation block above the wizard row.

## 8. Out of Scope (mentioned for completeness, not drawn)

- Account settings page (profile edits, password change, GDPR data export)
- Password reset flow
- Resume list management on the dashboard (duplicate, delete, rename)
- Returning-user journey (the diagram is explicitly the **new user** flow)

## 9. Implementation Plan (next step)

After this design is approved, the implementation plan will:

1. Generate the FigJam board via Figma MCP `generate_diagram` (Mermaid-style flowchart input describing the swim lanes, phases, arrows, and color tokens).
2. Capture the returned FigJam URL.
3. Write the companion markdown file to `~/Documents/Shiller International University /School Work /Integrative Project III /ScopusResume_User_Journey_Diagram.md` with the full content sketched in Sections 4–8 above plus the FigJam URL.
4. No code in the ScopusResume repo will be modified — this is a documentation-only deliverable.

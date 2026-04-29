# Ocean Boil — Complete Feature Implementation

**Date:** 2026-04-29
**Strategy:** Approach C — Phased Parallel with Sequential Gates
**Goal:** Implement every remaining feature from the CS353 spec, fix all open issues, and deliver a polished, tested, documented product.

---

## Scope

### Open Issues (Phase 1)
- **ISSUE-002:** Duplicate React key warnings on builder load (cosmetic, needs React DevTools)
- **ISSUE-001:** Email validation rejects non-standard TLDs (Supabase config or client-side fix)
- **Account Settings:** Password change form is non-functional (`onSubmit` is `e.preventDefault()`), account delete only signs out

### New Features (Phase 2)

| Stream | Feature | Spec Ref |
|--------|---------|-----------|
| A | DOCX Export (server-side via Vercel function + `docx` npm) | F-EXP-001 |
| B | JD Parser + Match Comparison + One-Click Optimize | F-JDA-001, F-JDA-002, F-JDA-003 |
| C | French Translation (DeepL API) + LinkedIn OAuth | F-EXP-003, F-AUTH-001 |
| D | Template Library polish (4 distinct layouts) | F-EXP-002 |

### Polish (Phase 3)
- Cross-feature QA, visual audit, console sweep, test expansion, documentation

---

## Phase 1 — Foundation

**Goal:** Clear the deck before parallel feature work.

| Task | Details |
|------|---------|
| Fix ISSUE-002 | Add React DevTools profiling, identify duplicate key source, fix |
| Fix ISSUE-001 | Fix client-side Zod email validation to not pre-reject before Supabase, OR configure Supabase auth TLD allowlist |
| Wire Account Settings | Password change → `supabase.auth.updateUser({ password })`. Delete → set `deleted_at` on profiles table (soft delete with 30-day grace per spec) |
| Test baseline | Run full suite, confirm 90/90, fix any regressions |
| .gitignore | Add `.superpowers/` |

**Exit gate:** All tests passing, zero console warnings, Account Settings fully functional.

---

## Phase 2 — Feature Build (4 Parallel Streams)

Each stream runs in its own git worktree with an independent sub-agent. No stream touches another's files. Merge only after tests pass.

### Stream A: DOCX Export

**Server:** New Vercel serverless function at `/api/export-docx`:
- Uses `docx` npm package (Document, Paragraph, TextRun, Table, etc.)
- Input: resume JSON object
- Output: `.docx` Blob with proper MIME type
- Template-aware styling (colors, fonts, spacing from template ID)
- Target: <500KB, <10s generation

**Frontend changes (`ExportPage.jsx`):**
- Replace `alert('DOCX export requires a server-side component...')` with actual fetch
- `POST /api/export-docx` with `{ resume, templateId }` → receive Blob → trigger download
- Loading state with progress indicator during generation

**Mapping (resume data → DOCX structure):**
- Personal Info → document properties + header
- Professional Summary → introductory paragraph
- Work Experience → bullet-pointed sections with date ranges
- Education → structured entries with degree/field/GPA
- Skills → categorized lists
- Projects, Volunteer, Awards → additional sections (conditional)

### Stream B: JD Analyzer (Full)

**F-JDA-001 — JD Parser:**
- New `parseJobDescription(jdText)` in `aiService.js`
- Extracts: `{ requiredSkills[], preferredSkills[], keywords[{word, count}], senioritySignals, cultureHints, roleTitle }`
- New UI component: `JDParserPanel` — keyword frequency bars, categorized skill lists, seniority badge

**F-JDA-002 — Match Comparison:**
- New `compareResumeToJD(resume, jdText)` in `aiService.js`
- Returns: `{ overallMatch%, skillMatch%, experienceMatch%, educationMatch%, matchedSkills[], missingKeywords[], gapAnalysis[], suggestions[] }`
- New UI component: `MatchComparisonPanel` — side-by-side view, green/red indicators, percentage gauges per category, gap analysis with suggestions

**F-JDA-003 — One-Click Optimize:**
- Builds on existing `tailorResume()` + `DiffView` components
- Adds: before/after side-by-side preview, individual diff accept/reject checkboxes, "Apply All" with confirmation modal, real-time ATS score recalculation after apply

**UI restructure (`JDAnalyzerPage.jsx`):**
- 3-tab interface: Parse → Compare → Optimize
- Step progress indicator (1 → 2 → 3)
- Shared resume selector and JD text at top (persists across tabs)
- Each tab has its own loading/empty/error states

### Stream C: French Translation + LinkedIn OAuth

**DeepL Translation:**
- New Vercel proxy: `POST /api/translate` → DeepL API
- New `translateResume(resume, targetLang)` in `aiService.js`
- Translates per spec: section headers, job titles, date formats, action verbs
- UI: language selector on Export page ("English" / "Français"), translate button with loading, translated preview before export

**LinkedIn OAuth:**
- Configure LinkedIn provider in Supabase Auth dashboard
- Add "Continue with LinkedIn" button to `SignInPage.jsx` and `SignUpPage.jsx`
- `supabase.auth.signInWithOAuth({ provider: 'linkedin' })` with redirect
- Handle callback → create/update user profile
- Button styling consistent with existing auth page design

### Stream D: Template Library Polish

**4 Distinct Layouts (not just color swaps):**

| Template | Character | Layout |
|----------|-----------|--------|
| Modern | Tech/startups | 2-column, teal accent, tight spacing, skills sidebar |
| Classic | Finance/law | Single column, serif, centered header, traditional |
| Minimal | Academia/research | Maximum whitespace, thin separators, understated |
| Professional | Healthcare/business | Compact, dense, content-maximizing |

**`ResumeTemplate.jsx` changes:**
- Each template gets its own render path (not just style object swap)
- Modern: 2-column layout with skills sidebar
- Classic: Centered name/title, single-column with traditional dividers
- Minimal: Generous whitespace, subtle typography hierarchy
- Professional: Compact layout, multi-column skills, tight margins

**Export page changes:**
- Template selector shows visual thumbnail cards (mini preview of actual template)
- Not text-only buttons

**Exit gate:** Each stream's tests pass independently, merge to main without conflicts, integration test passes on merged main.

---

## Phase 3 — Polish & Ship

| Step | Details |
|------|---------|
| Cross-feature QA | Full user journey: sign up → builder (7 steps) → JD analyze → optimize → translate → export (PDF, DOCX, TXT) → account settings → delete |
| Visual polish | Consistent spacing, loading/empty/error states, responsive audit (768px tablet, 375px mobile) |
| Console sweep | Zero errors/warnings on full user journey |
| Test suite | Add tests for new services: `docxMapping.test.js`, `translateResume.test.js`, `parseJD.test.js`, `compareResumeToJD.test.js`. Target: 100+ passing |
| Documentation | Update CLAUDE.md, README with new features, env vars (DEEPL_API_KEY, LINKEDIN_CLIENT_ID), API routes |

**Exit gate:** A stranger can clone the repo, set env vars, and have the full product running.

---

## Architecture

```
Browser ──→ Vercel Edge Functions
│              /api/export-docx  → docx npm → Blob → download
│              /api/translate    → DeepL API → translated JSON
│              /api/analyze      → (exists) OpenAI → JD analysis
│              /api/tailor       → (exists) OpenAI → diffs
│
Supabase Auth ──→ LinkedIn OAuth provider (new)
Supabase DB   ──→ resumes, profiles (soft-delete column)
```

All AI, translation, and document generation goes through Vercel proxies — no API keys exposed to the client.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| DOCX generation failure | Toast "Export failed, try PDF instead" with retry button |
| DeepL quota exceeded | Toast "Translation unavailable at this time" |
| LinkedIn OAuth error | Standard Supabase error display (existing auth error pattern) |
| JD Analyzer LLM failure | Existing error panel pattern, retry button |
| All features | Loading states during async, disabled buttons during operations |

---

## Testing Strategy

**Unit tests (new):**
- `services/docxMapping.test.js` — resume → DOCX structure mapping
- `services/translateResume.test.js` — DeepL proxy request/response
- `services/parseJD.test.js` — JD parser output shape validation
- `services/compareResumeToJD.test.js` — match comparison logic

**Integration tests (new):**
- Full builder → export flow (all 3 formats)
- Auth flow with LinkedIn provider
- JD Analyzer: parse → compare → optimize full cycle

**Component tests:**
- Template rendering for all 4 templates (visual regression)
- JD Analyzer tab navigation and state persistence
- Export page format/template selection

---

## Sub-Agent Dispatch Plan

Phase 2 launches 4 sub-agents simultaneously, each in its own worktree:

| Stream | Worktree Branch | Agent Type | Primary Files |
|--------|----------------|------------|---------------|
| A — DOCX | `feat/docx-export` | general-purpose | `api/export-docx.js`, `ExportPage.jsx`, `docxMapping.js` |
| B — JD Analyzer | `feat/jd-analyzer` | general-purpose | `JDAnalyzerPage.jsx`, `aiService.js`, new panel components |
| C — Translate + LinkedIn | `feat/translate-auth` | general-purpose | `api/translate.js`, `ExportPage.jsx`, `SignInPage.jsx`, `SignUpPage.jsx`, `aiService.js` |
| D — Templates | `feat/templates` | general-purpose | `ResumeTemplate.jsx`, `ExportPage.jsx`, `templates.js` |

Streams that share files (B+C touch `aiService.js`, A+C+D touch `ExportPage.jsx`) must use different sections of those files and merge carefully. The worktree isolation + sequential merge order prevents conflicts.

**Merge order after all streams pass:** A → B → C → D (least to most cross-cutting).

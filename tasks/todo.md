# ScopusResume - Task Tracker

## Completed

### Sprint 1 — Foundation
- [x] Project setup (React 19, Tailwind, React Router, React Hook Form + Zod)
- [x] Auth flow (sign up, sign in, password reset, account settings)
- [x] Resume builder — 8-step guided form (personal info, education, work, skills, projects, certs, objective, summary)
- [x] Resume context + Supabase persistence (CRUD)
- [x] Resume preview page
- [x] Dashboard with resume list

### Sprint 2 — AI Features
- [x] AI Tailor (JD Analyzer) — diff view, apply individual or all suggestions
- [x] ATS Optimizer — keyword match score, missing keywords, voice consistency
- [x] AI Optimization page — bullet point rewriting, summary generation
- [x] Resume version snapshots (resumeVersionService)
- [x] Custom 404 / error page (NotFoundPage + router errorElement)
- [x] Fix auth error messages (surface real Supabase errors)
- [x] Handle email confirmation flow on signup

### Sprint 3 — Ship It
- [x] Fix async bug in createResume (Dashboard)
- [x] Fix export quick action navigation
- [x] Real PDF export (html2pdf.js, A4, 2x scale)
- [x] Real TXT export (resumeToText → Blob download)
- [x] Landing page redesign (2-col hero, pain-first copy, no AI slop)

---

## Sprint 4 — Production Readiness

- [ ] Vercel API proxy routes (`/api/tailor`, `/api/analyze`) — aiService calls these in prod but the files don't exist yet
- [ ] Environment variable setup for production (ANTHROPIC_KEY server-side only)
- [ ] DOCX export — requires server-side generation (docx or similar library in an API route)
- [ ] Resume builder: add missing Summary step to the route/flow (SummaryStep.jsx exists but may not be wired)
- [ ] Dashboard ATS score badge — currently shows "Not scanned" for all resumes; wire up last scan result
- [ ] Resume card: add Export and ATS quick-action buttons directly on each card

---

## Backlog (future sprints)

- [ ] Google OAuth (button exists, not wired)
- [ ] Pricing page
- [ ] Account deletion (currently just signs out; needs service-role Edge Function)
- [ ] Resume import (upload existing PDF/DOCX and parse)
- [ ] Multiple resume templates (Classic, Modern, Minimal)
- [ ] Multilingual export (translation via AI)
- [ ] Application tracker (job applications + status)
- [ ] Mobile app / PWA

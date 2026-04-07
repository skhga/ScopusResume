# TODOS

## Auth data migration strategy
**What:** When real Supabase auth lands, localStorage resumes (saved without userId) will be stranded. Need either a migration prompt ("import existing resumes from local?") or clear data on first real login.
**Why:** Real users will lose resume data silently on first real login if not handled.
**Pros:** Preserves data from development/testing phase.
**Cons:** Adds UX complexity to first-login flow.
**Context:** Current mock auth stores all data in localStorage keyed by no user ID. Supabase rows will have a real UUID. The two systems are incompatible without a merge step. Captured during /plan-eng-review on 2026-04-07.
**Depends on:** Supabase integration

## PDF export strategy
**What:** ExportPage currently ends in `alert('Export complete! ... this would generate an actual file.')`. Vercel Edge Functions cannot run Puppeteer. Need a decision on approach.
**Why:** Export is likely the second-most-requested user action after resume building. Can't market it without a working implementation.
**Pros of resolving:** Closes the most obvious product gap.
**Options:**
- html2pdf.js (client-side, free, lower quality)
- Browserless/Puppeteer Cloud (paid, high quality)
- wkhtmltopdf on a separate server
**Context:** Captured during /plan-eng-review on 2026-04-07. Vercel Edge runtime limitation makes server-side Puppeteer not straightforward.
**Depends on:** Deployment decision (Vercel vs. separate backend)

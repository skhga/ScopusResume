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

## Landing page: hero copy and product screenshot
**What:** Current hero headline "Build ATS-Optimized Resumes with AI" is generic. No product screenshot in the hero. Both are conversion-rate issues.
**Why:** First impression is the product's best sales tool. Current hero doesn't communicate the unique value (diff view + feedback loop). Visitors are asked to sign up without seeing the product.
**Pros of resolving:** Higher landing page conversion. Differentiates from other resume AI tools.
**Options:**
- Rewrite hero copy to lead with user pain ("You apply. You wait. You never hear why.")
- Add a screenshot of the diff view / resume builder in the hero section (can be a static image first)
**Context:** Captured during /design-review on 2026-04-07. AI Slop finding #9 (generic copy) + FINDING-014 (no product screenshot). The design doc's core thesis — "submit hoping for the best" — should be in the headline.
**Depends on:** Diff view UI being built (so there's something worth screenshotting)

## Landing page: feature grid and section rhythm
**What:** Features section uses the #2 AI Slop pattern (icon-in-circle cards). Section rhythm is cookie-cutter (hero → features → how-it-works → testimonials → CTA at identical heights).
**Why:** Makes the product look AI-generated to recruiters and technical users — undermining credibility for a tool aimed at AI-skeptical hiring managers.
**Pros of resolving:** Looks more like a real product studio built it.
**Options:**
- Collapse features + how-it-works into one focused section
- Use asymmetric layout for one section (e.g., feature + screenshot side-by-side)
- Remove 3 of the 6 features and go deeper on 3 (less is more)
**Context:** Captured during /design-review on 2026-04-07. FINDING-001, FINDING-003. The icon-circle grid was partially fixed (changed to 2-col left-aligned list) but the overall section rhythm and copy remain template-like.
**Depends on:** Product direction decision (which 3-4 features to lead with)

## Demo mode banner for unauthenticated app users
**What:** Users can access /app/dashboard, /app/jd-analyzer etc. without signing in. No indication that data isn't being saved to a real account.
**Why:** Silent data loss risk — users may build resumes thinking they're saved, then lose everything when they close the browser or sign in for the first time.
**Pros of resolving:** Reduces data loss confusion. Creates a natural sign-up prompt at the right moment.
**Options:**
- Add a `DemoModeBanner` component that appears when user is not authenticated
- Redirect unauthenticated users to /signin (harder, breaks "try before you sign up" flow)
**Context:** Captured during /design-review on 2026-04-07. FINDING-008. Depends on Supabase auth being wired in — currently mock auth has no concept of "not authenticated."
**Depends on:** Supabase integration

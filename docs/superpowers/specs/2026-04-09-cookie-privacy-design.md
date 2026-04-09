# Cookie Banner & Privacy Policy — Design Spec
**Date:** 2026-04-09
**Status:** Approved

## Overview

Add GDPR + CCPA compliance to ScopusResume's public landing page: a dismissible cookie notice banner and a standalone `/privacy` page. The site currently uses only strictly necessary auth session cookies — no analytics, no ad pixels. No consent gate is required; the banner is informational.

## Scope

Two deliverables, tightly related (banner links to policy):
1. `CookieBanner.jsx` — dismissible bottom bar on the landing page
2. `PrivacyPolicy.jsx` — standalone `/privacy` route

---

## Component 1: CookieBanner

**File:** `src/components/common/CookieBanner.jsx`

### Behavior

- Renders only when `localStorage` key `cookie-consent` is **not** set to `"dismissed"`
- On mount: slides up from the bottom using Framer Motion (`y: 80 → 0`, `opacity: 0 → 1`, spring physics)
- On dismiss ("Got it" button): animates out (`y: 80`, `opacity: 0`), then sets `localStorage.setItem('cookie-consent', 'dismissed')`
- Does NOT block page interaction — purely informational

### Visual

- Fixed to bottom of viewport, full-width, `z-40` (below navbar's `z-50`)
- White background (`bg-white`), top border (`border-t border-gray-200`), subtle shadow (`shadow-lg`)
- Single row layout (desktop): text left, "Learn more" link + "Got it" button right
- Stacks to two rows on mobile

### Copy

> "We use cookies to keep you signed in and your session secure."
> `[Learn more]` → `/privacy` | `[Got it]` button

### Integration

Mounted once in `LandingPage.jsx`, after `<LandingNavbar />`, before `<GeometricHero>`.

---

## Component 2: PrivacyPolicy Page

**File:** `src/pages/legal/PrivacyPolicy.jsx`

### Route

`/privacy` — public, no auth required. Added to `App.jsx` alongside other public routes.

### Layout

- Minimal header: logo (links to `/`) only — no full navbar
- `Footer` at the bottom
- Single-column prose layout: `max-w-3xl mx-auto px-4 py-16`
- Typography: `prose` style via Tailwind utility classes (no `@tailwindcss/typography` plugin required — hand-styled headings and paragraphs)
- "Last updated: April 9, 2026" subtitle under the page title

### Sections

1. **Introduction** — What ScopusResume is, who operates it, effective date
2. **Information We Collect**
   - Account data: email address, name (provided at signup)
   - Resume content: text entered in the resume builder (stored to provide the service)
   - Session cookies: strictly necessary, set on login, expire on logout or after 7 days
3. **How We Use Your Information**
   - To operate and secure the service
   - We do not sell, rent, or share personal data with third parties for marketing
4. **Cookies**
   - Type: strictly necessary session cookies only
   - Purpose: maintain authenticated sessions
   - How to remove: browser settings → clear cookies for this domain
5. **Your Rights — GDPR** (applies to EU residents)
   - Right to access, rectify, erase, and port your data
   - Right to withdraw consent (not applicable — no consent-based processing)
   - Contact: privacy@scopusresume.com for requests; 30-day response window
6. **Your Rights — CCPA** (applies to California residents)
   - Right to know what personal information is collected
   - Right to delete personal information
   - **We do not sell your personal information**
   - To exercise rights: email privacy@scopusresume.com
7. **Data Retention**
   - Data retained while your account is active
   - Deleted within 30 days of account deletion request
8. **Security**
   - Industry-standard encryption in transit (HTTPS) and at rest
9. **Contact**
   - privacy@scopusresume.com

---

## Integration Points

| File | Change |
|------|--------|
| `src/App.jsx` | Add `<Route path="/privacy" element={<PrivacyPolicy />} />` in public routes |
| `src/pages/landing/LandingPage.jsx` | Import and mount `<CookieBanner />` |
| `src/components/layout/Footer.jsx` | Add "Privacy Policy" link → `/privacy` |

---

## Out of Scope

- Cookie preference manager / consent modal (no non-essential cookies yet)
- Terms of Service page
- Cookie consent for authenticated app routes
- "Do Not Sell" opt-out toggle (not applicable — no selling occurs)

# Cookie Banner & Privacy Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a GDPR + CCPA compliant cookie notice banner and a `/privacy` policy page to ScopusResume.

**Architecture:** Three independent tasks — create `CookieBanner.jsx`, create `PrivacyPolicy.jsx`, then wire both into `router.jsx`, `LandingPage.jsx`, and `Footer.jsx`. The banner mounts only on the landing page and uses `localStorage` to track dismissal. The privacy page is a public route with a minimal header and full footer.

**Tech Stack:** React 19, Framer Motion (already installed), React Router 7 (`Link`), TailwindCSS, Plus Jakarta Sans (project font), brand teal `#0d9488` (`brand-600`)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/common/CookieBanner.jsx` | Dismissible slide-up bar, localStorage state, Framer Motion animation |
| Create | `src/pages/legal/PrivacyPolicy.jsx` | Full privacy policy page with minimal header + Footer |
| Modify | `src/router.jsx` | Add `/privacy` public route |
| Modify | `src/pages/landing/LandingPage.jsx` | Mount `<CookieBanner />` |
| Modify | `src/components/layout/Footer.jsx` | Change `href="#privacy"` anchor to `<Link to="/privacy">` |

---

## Task 1: Create `CookieBanner.jsx`

**Files:**
- Create: `src/components/common/CookieBanner.jsx`

### What it does
- Reads `localStorage.getItem('cookie-consent')` on mount
- If value is `"dismissed"`, renders nothing
- Otherwise: slides up from the bottom, shows notice text, "Learn more" link → `/privacy`, "Got it" button
- On dismiss: animates out, then sets `localStorage.setItem('cookie-consent', 'dismissed')`

- [ ] **Step 1: Create the component file**

```jsx
// src/components/common/CookieBanner.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function CookieBanner() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem('cookie-consent') !== 'dismissed'
  );

  function dismiss() {
    setVisible(false);
    localStorage.setItem('cookie-consent', 'dismissed');
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 40 }}
          className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 shadow-lg"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-600 text-center sm:text-left">
              We use cookies to keep you signed in and your session secure.{' '}
              <Link
                to="/privacy"
                className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
              >
                Learn more
              </Link>
            </p>
            <button
              onClick={dismiss}
              className="shrink-0 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify no import errors**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm run build 2>&1 | grep -E "ERROR|error TS|CookieBanner"
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/components/common/CookieBanner.jsx
git commit -m "feat: add CookieBanner — GDPR/CCPA dismissible notice with localStorage"
```

---

## Task 2: Create `PrivacyPolicy.jsx`

**Files:**
- Create: `src/pages/legal/PrivacyPolicy.jsx`

### What it does
- Standalone page at `/privacy`
- Minimal header: logo + site name linking back to `/`
- Full `<Footer />` at the bottom
- Single-column prose layout, all 9 sections from the spec

- [ ] **Step 1: Create the component file**

```jsx
// src/pages/legal/PrivacyPolicy.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../../components/layout/Footer';
import logo from '../../assets/logo.png';

const logoStyle = {
  height: '28px', width: '26px',
  backgroundImage: `url(${logo})`,
  backgroundSize: '90px 90px',
  backgroundPosition: '-10px -32px',
  backgroundRepeat: 'no-repeat',
  flexShrink: 0,
};

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
      <div className="text-gray-600 leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Minimal header */}
      <header className="border-b border-gray-100 px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2">
            <div style={logoStyle} role="img" aria-label="ScopusResume logo" />
            <span className="text-base font-extrabold text-gray-900">
              Scopus<span className="text-brand-600">Resume</span>
            </span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-16">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: April 9, 2026</p>

        <Section title="Introduction">
          <p>
            ScopusResume ("we", "us", or "our") operates the ScopusResume resume
            builder service. This Privacy Policy explains how we collect, use, and
            protect your personal information when you use our service.
          </p>
          <p>
            By using ScopusResume, you agree to the collection and use of information
            in accordance with this policy.
          </p>
        </Section>

        <Section title="Information We Collect">
          <p>We collect the following information when you use ScopusResume:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>
              <span className="font-medium text-gray-800">Account data</span> — your
              email address and name, provided when you sign up.
            </li>
            <li>
              <span className="font-medium text-gray-800">Resume content</span> — the
              text and information you enter into the resume builder. This is stored
              solely to provide the service to you.
            </li>
            <li>
              <span className="font-medium text-gray-800">Session cookies</span> —
              strictly necessary cookies set when you log in. These expire on logout
              or after 7 days of inactivity.
            </li>
          </ul>
        </Section>

        <Section title="How We Use Your Information">
          <p>We use your information only to operate and improve ScopusResume:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>To authenticate you and maintain your session</li>
            <li>To store and retrieve your resume data</li>
            <li>To provide AI-powered resume tailoring features</li>
          </ul>
          <p>
            We do <span className="font-medium text-gray-800">not</span> sell, rent,
            or share your personal data with third parties for marketing or advertising
            purposes.
          </p>
        </Section>

        <Section title="Cookies">
          <p>
            ScopusResume uses only <span className="font-medium text-gray-800">strictly
            necessary</span> session cookies. These cookies are required for the service
            to function — they keep you logged in between page visits.
          </p>
          <p>
            We do not use analytics cookies, advertising cookies, or any third-party
            tracking scripts.
          </p>
          <p>
            To remove cookies, open your browser settings and clear cookies for{' '}
            <span className="font-medium text-gray-800">scopusresume.com</span>. This
            will sign you out of the service.
          </p>
        </Section>

        <Section title="Your Rights — GDPR (EU Residents)">
          <p>If you are located in the European Union, you have the following rights:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><span className="font-medium text-gray-800">Access</span> — request a copy of the personal data we hold about you</li>
            <li><span className="font-medium text-gray-800">Rectification</span> — request correction of inaccurate data</li>
            <li><span className="font-medium text-gray-800">Erasure</span> — request deletion of your personal data</li>
            <li><span className="font-medium text-gray-800">Portability</span> — request your data in a machine-readable format</li>
          </ul>
          <p>
            To exercise any of these rights, email us at{' '}
            <a href="mailto:privacy@scopusresume.com" className="text-brand-600 hover:text-brand-700 underline underline-offset-2">
              privacy@scopusresume.com
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Section title="Your Rights — CCPA (California Residents)">
          <p>If you are a California resident, you have the following rights:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><span className="font-medium text-gray-800">Right to know</span> — request information about the personal data we collect and how we use it</li>
            <li><span className="font-medium text-gray-800">Right to delete</span> — request deletion of your personal data</li>
          </ul>
          <p className="font-medium text-gray-800">
            We do not sell your personal information.
          </p>
          <p>
            To exercise your rights under CCPA, email{' '}
            <a href="mailto:privacy@scopusresume.com" className="text-brand-600 hover:text-brand-700 underline underline-offset-2">
              privacy@scopusresume.com
            </a>
            .
          </p>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your personal data for as long as your account is active. If you
            delete your account, we will delete your personal data within 30 days of
            your request.
          </p>
        </Section>

        <Section title="Security">
          <p>
            We protect your data using industry-standard encryption in transit (HTTPS)
            and at rest. While we take reasonable steps to secure your information, no
            method of transmission over the internet is 100% secure.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            For privacy-related questions or requests, contact us at:
          </p>
          <p>
            <a
              href="mailto:privacy@scopusresume.com"
              className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
            >
              privacy@scopusresume.com
            </a>
          </p>
        </Section>
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Verify no import errors**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm run build 2>&1 | grep -E "ERROR|error TS|PrivacyPolicy"
```
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/pages/legal/PrivacyPolicy.jsx
git commit -m "feat: add PrivacyPolicy page — GDPR + CCPA, /privacy route"
```

---

## Task 3: Wire into router, LandingPage, and Footer

**Files:**
- Modify: `src/router.jsx`
- Modify: `src/pages/landing/LandingPage.jsx`
- Modify: `src/components/layout/Footer.jsx`

- [ ] **Step 1: Add `/privacy` route to `router.jsx`**

In `src/router.jsx`, add the import after the existing page imports:

```jsx
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
```

Then add the route inside the `children` array, after the `'/'` landing route:

```jsx
{ path: '/', element: <LandingPage /> },
{ path: '/privacy', element: <PrivacyPolicy /> },
```

Full updated routes block for reference:
```jsx
children: [
  { path: '/', element: <LandingPage /> },
  { path: '/privacy', element: <PrivacyPolicy /> },

  {
    element: <AuthLayout />,
    children: [
      { path: '/signup', element: <SignUpPage /> },
      { path: '/signin', element: <SignInPage /> },
      { path: '/reset-password', element: <PasswordResetPage /> },
    ],
  },
  // ... rest unchanged
]
```

- [ ] **Step 2: Mount `CookieBanner` in `LandingPage.jsx`**

In `src/pages/landing/LandingPage.jsx`, add the import at the top:

```jsx
import CookieBanner from '../../components/common/CookieBanner';
```

Then add `<CookieBanner />` as the very first child inside the outer `<div>`:

```jsx
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <CookieBanner />
      <LandingNavbar />
      {/* ... rest unchanged */}
    </div>
  );
}
```

- [ ] **Step 3: Fix Footer privacy link**

In `src/components/layout/Footer.jsx`, add the `Link` import and replace the `href="#privacy"` anchor.

Add import at the top:
```jsx
import { Link } from 'react-router-dom';
```

Replace:
```jsx
<a href="#privacy" className="hover:text-gray-900 px-3 py-2.5 min-h-[44px] inline-flex items-center rounded hover:bg-gray-50 transition">Privacy</a>
```
with:
```jsx
<Link to="/privacy" className="hover:text-gray-900 px-3 py-2.5 min-h-[44px] inline-flex items-center rounded hover:bg-gray-50 transition">Privacy Policy</Link>
```

- [ ] **Step 4: Build and verify**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm run build 2>&1 | tail -5
```
Expected:
```
The build folder is ready to be deployed.
```

- [ ] **Step 5: Commit**

```bash
git add src/router.jsx src/pages/landing/LandingPage.jsx src/components/layout/Footer.jsx
git commit -m "feat: wire CookieBanner and PrivacyPolicy into app — route, landing, footer"
```

---

## Done

Verify at `http://localhost:3000`:
1. Cookie banner slides up from the bottom on first visit
2. "Got it" dismisses it — refresh the page — banner stays gone
3. "Learn more" navigates to `/privacy`
4. `/privacy` renders all sections, logo links back to `/`
5. Footer "Privacy Policy" link navigates to `/privacy`
6. Open DevTools → Application → Local Storage → `cookie-consent: dismissed` is set after dismissal

# Landing Navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page's generic Navbar with a floating pill navbar that starts transparent over the dark hero and shrinks into a white pill with blur/shadow on scroll.

**Architecture:** New `LandingNavbar.jsx` component using Framer Motion's `useScroll` + `useMotionValueEvent` for scroll-reactive animation. `LandingPage.jsx` swaps the import and gains anchor IDs on key sections. The authenticated app `Navbar.jsx` is untouched.

**Tech Stack:** React 19, Framer Motion (already installed), React Router `Link`, Lucide React, TailwindCSS, Plus Jakarta Sans (project font)

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/layout/LandingNavbar.jsx` | Floating pill navbar — scroll state, desktop links, mobile drawer |
| Modify | `src/pages/landing/LandingPage.jsx` | Swap Navbar import; add `id` anchors to BentoFeatures, About stub, Pricing stub |

---

## Task 1: Create `LandingNavbar.jsx`

**Files:**
- Create: `src/components/layout/LandingNavbar.jsx`

### What it does
- Transparent + full-width at scroll 0 (links are white, visible over dark hero)
- Past 80px scroll: animates to white/90 background, backdrop-blur, border, shadow, shrinks width to ~85%, pill border-radius, dark text links
- Desktop: logo left, links center, CTAs right
- Mobile: hamburger toggles `AnimatePresence` drawer

- [ ] **Step 1: Create the component file**

```jsx
// src/components/layout/LandingNavbar.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import logo from '../../assets/logo.png';

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'What You Get', href: '#features' },
  { label: 'About Us',     href: '#about' },
  { label: 'Pricing',      href: '#pricing' },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 80);
  });

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
      {/* ── Desktop bar ── */}
      <motion.nav
        animate={{
          width: scrolled ? '85%' : '100%',
          borderRadius: scrolled ? '9999px' : '0px',
          backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0)',
          borderColor: scrolled ? 'rgba(226,232,240,0.8)' : 'rgba(255,255,255,0)',
          boxShadow: scrolled
            ? '0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)'
            : 'none',
          paddingTop: scrolled ? '8px' : '0px',
          paddingBottom: scrolled ? '8px' : '0px',
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 50 }}
        style={{ backdropFilter: scrolled ? 'blur(12px)' : 'none', border: '1px solid' }}
        className="pointer-events-auto hidden md:flex items-center justify-between px-6 py-3"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div
            style={{
              height: '28px', width: '26px',
              backgroundImage: `url(${logo})`,
              backgroundSize: '90px 90px',
              backgroundPosition: '-10px -32px',
              backgroundRepeat: 'no-repeat',
              flexShrink: 0,
            }}
          />
          <span
            className="text-lg font-extrabold"
            style={{ color: scrolled ? '#0f172a' : '#ffffff' }}
          >
            Scopus<span className="text-brand-400">Resume</span>
          </span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className="px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
              style={{ color: scrolled ? '#475569' : 'rgba(255,255,255,0.85)' }}
              onMouseEnter={e => { e.currentTarget.style.color = scrolled ? '#0f172a' : '#fff'; e.currentTarget.style.background = scrolled ? '#f8fafc' : 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = scrolled ? '#475569' : 'rgba(255,255,255,0.85)'; e.currentTarget.style.background = 'transparent'; }}
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-2">
          <Link
            to="/signin"
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-150 min-h-[36px] inline-flex items-center"
            style={{
              color: scrolled ? '#475569' : 'rgba(255,255,255,0.85)',
              border: '1px solid',
              borderColor: scrolled ? '#e2e8f0' : 'rgba(255,255,255,0.25)',
              background: 'transparent',
            }}
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-600 text-white hover:bg-brand-700 transition-colors duration-150 min-h-[36px] inline-flex items-center shadow-sm"
          >
            Get Started
          </Link>
        </div>
      </motion.nav>

      {/* ── Mobile bar ── */}
      <div className="pointer-events-auto md:hidden w-full">
        <motion.div
          animate={{
            backgroundColor: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0)',
            borderColor: scrolled ? 'rgba(226,232,240,0.8)' : 'rgba(255,255,255,0)',
            boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.08)' : 'none',
            borderRadius: scrolled ? '16px' : '0px',
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 50 }}
          style={{ backdropFilter: scrolled ? 'blur(12px)' : 'none', border: '1px solid' }}
          className="flex items-center justify-between px-4 py-3"
        >
          <Link to="/" className="flex items-center gap-2">
            <div
              style={{
                height: '28px', width: '26px',
                backgroundImage: `url(${logo})`,
                backgroundSize: '90px 90px',
                backgroundPosition: '-10px -32px',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <span
              className="text-base font-extrabold"
              style={{ color: scrolled ? '#0f172a' : '#ffffff' }}
            >
              Scopus<span className="text-brand-400">Resume</span>
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-lg"
            style={{ color: scrolled ? '#475569' : '#ffffff' }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </motion.div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.4, 0.25, 1] }}
              className="mt-2 bg-white/95 backdrop-blur-md border border-gray-200/60 rounded-2xl shadow-xl px-4 py-4 flex flex-col gap-1"
            >
              {NAV_LINKS.map(({ label, href }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  {label}
                </a>
              ))}
              <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
                <Link
                  to="/signin"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 text-center hover:bg-gray-50 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-bold bg-brand-600 text-white text-center hover:bg-brand-700 transition-colors"
                >
                  Get Started
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify no import errors**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm run build 2>&1 | grep -E "ERROR|error|LandingNavbar"
```
Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/LandingNavbar.jsx
git commit -m "feat: add LandingNavbar — floating pill with scroll-reactive animation"
```

---

## Task 2: Wire into `LandingPage.jsx` + add section anchors

**Files:**
- Modify: `src/pages/landing/LandingPage.jsx`

Sections that need anchor IDs:
- `BentoFeatures` → wrap in `<section id="features">`
- `#how-it-works` → already exists ✓
- `#about` → add a minimal `id="about"` to the Testimonials section (it's the closest "about the product" content)
- `#pricing` → add a thin placeholder `<section id="pricing">` just before the CTA section

- [ ] **Step 1: Swap Navbar import**

In `src/pages/landing/LandingPage.jsx`, replace line 5:
```jsx
import Navbar from '../../components/layout/Navbar';
```
with:
```jsx
import LandingNavbar from '../../components/layout/LandingNavbar';
```

- [ ] **Step 2: Replace `<Navbar />` with `<LandingNavbar />`**

Replace:
```jsx
<Navbar />
```
with:
```jsx
<LandingNavbar />
```

- [ ] **Step 3: Add `id="features"` to BentoFeatures wrapper**

Replace:
```jsx
      {/* Features — animated bento grid */}
      <BentoFeatures />
```
with:
```jsx
      {/* Features — animated bento grid */}
      <div id="features">
        <BentoFeatures />
      </div>
```

- [ ] **Step 4: Add `id="about"` to Testimonials section**

Replace:
```jsx
      {/* Testimonials — infinite marquee */}
      <section className="py-20 bg-white overflow-hidden">
```
with:
```jsx
      {/* Testimonials — infinite marquee */}
      <section id="about" className="py-20 bg-white overflow-hidden">
```

- [ ] **Step 5: Add `id="pricing"` placeholder before CTA**

Replace:
```jsx
      {/* CTA */}
      <section className="py-20 bg-brand-700">
```
with:
```jsx
      {/* Pricing placeholder anchor */}
      <div id="pricing" />

      {/* CTA */}
      <section className="py-20 bg-brand-700">
```

- [ ] **Step 6: Remove top padding from hero since navbar is now fixed/floating**

The hero currently has `pt-16 lg:pt-24`. With a floating navbar (not in document flow) the hero content needs a bit of top padding to clear the navbar height (~64px). Change:
```jsx
<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 lg:pt-24 lg:pb-28">
```
to:
```jsx
<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 lg:pt-32 lg:pb-28">
```

- [ ] **Step 7: Build and verify**

```bash
cd /Users/sk_hga/ScopusResume/scopus && npm run build 2>&1 | tail -8
```
Expected output ends with:
```
The build folder is ready to be deployed.
```

- [ ] **Step 8: Commit**

```bash
git add src/pages/landing/LandingPage.jsx
git commit -m "feat: wire LandingNavbar into landing page, add section anchor IDs"
```

---

## Done

Verify at `http://localhost:3000`:
1. At top of page → navbar is transparent, links are white, visible over dark hero
2. Scroll down ~100px → bar springs into white pill with blur and shadow
3. Mobile width → hamburger present, tap opens drawer with all links + CTA buttons
4. Clicking "How It Works" / "What You Get" / "About Us" / "Pricing" smooth-scrolls to the correct section

# Landing Navbar — Design Spec
**Date:** 2026-04-09
**Status:** Approved

## Overview

A floating pill navbar for the public landing page. Starts transparent and full-width above the dark hero, shrinks into a pill shape with blur + shadow on scroll. Separate from the authenticated app `Navbar.jsx`.

## Component

**File:** `src/components/layout/LandingNavbar.jsx`

New component. The existing `Navbar.jsx` remains unchanged — it serves the authenticated app routes.

## Nav Links

| Label | Target |
|-------|--------|
| How It Works | `#how-it-works` |
| What You Get | `#features` |
| About Us | `#about` |
| Pricing | `#pricing` |

**CTAs:**
- **Sign In** — ghost button → `/signin`
- **Get Started** — teal filled button → `/signup`

## Behavior

**Scroll-reactive (Framer Motion):**
- At scroll position 0: transparent background, full-width, no border/shadow, white text links (visible over dark hero)
- Past 80px: animates to white/80 background with `backdrop-blur-md`, `border border-gray-200/60`, soft shadow, dark text links — springs into a horizontally-shrunk pill shape centered on screen

**Animation:** `useScroll` + `useMotionValueEvent` from Framer Motion (already in project). Spring physics: `stiffness: 200, damping: 50`.

## Mobile

Hamburger icon (visible below `md`). Tap opens a full-width slide-down drawer with:
- All four nav links (stacked)
- Sign In + Get Started buttons (stacked, full width)

Drawer animates in with `AnimatePresence` fade + slide.

## Integration

`LandingPage.jsx`: replace `<Navbar />` import with `<LandingNavbar />`.

The `#how-it-works`, `#features`, `#about`, `#pricing` anchor IDs need to be added to the corresponding sections in `LandingPage.jsx`.

## Out of Scope

- Dropdown/mega menus
- Active link highlighting (landing page, not router-driven)
- Pricing section content (anchor only)
- About Us section content (anchor only)

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import logo from '../../assets/logo.png';

const NAV_LINKS = [
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'What You Get', href: '#features' },
  { label: 'About Us',     href: '#about' },
];

const logoStyle = {
  height: '28px', width: '26px',
  backgroundImage: `url(${logo})`,
  backgroundSize: '90px 90px',
  backgroundPosition: '-10px -32px',
  backgroundRepeat: 'no-repeat',
  flexShrink: 0,
};

function NavLogo({ scrolled, textSize = 'text-lg' }) {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <div style={logoStyle} role="img" aria-label="ScopusResume logo" />
      <span
        className={`${textSize} font-extrabold`}
        style={{ color: scrolled ? '#0f172a' : '#ffffff' }}
      >
        Scopus<span className="text-brand-400">Resume</span>
      </span>
    </Link>
  );
}

function NavLink({ label, href, scrolled }) {
  const [hovered, setHovered] = useState(false);
  const base = scrolled ? '#475569' : 'rgba(255,255,255,0.85)';
  const hover = scrolled ? '#0f172a' : '#fff';
  const hoverBg = scrolled ? '#f8fafc' : 'rgba(255,255,255,0.08)';

  return (
    <a
      href={href}
      className="px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150"
      style={{
        color: hovered ? hover : base,
        background: hovered ? hoverBg : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </a>
  );
}

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
          backdropFilter: scrolled ? 'blur(12px)' : 'blur(0px)',
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 50 }}
        style={{ border: '1px solid' }}
        className="pointer-events-auto hidden md:flex items-center justify-between px-6 py-3"
      >
        <NavLogo scrolled={scrolled} />

        {/* Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ label, href }) => (
            <NavLink key={href} label={label} href={href} scrolled={scrolled} />
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
            backdropFilter: scrolled ? 'blur(12px)' : 'blur(0px)',
          }}
          transition={{ type: 'spring', stiffness: 200, damping: 50 }}
          style={{ border: '1px solid' }}
          className="flex items-center justify-between px-4 py-3"
        >
          <NavLogo scrolled={scrolled} textSize="text-base" />
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="p-2 rounded-lg"
            style={{ color: scrolled ? '#475569' : '#ffffff' }}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
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

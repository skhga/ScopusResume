// src/components/common/CookieBanner.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function CookieBanner() {
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined'
      ? localStorage.getItem('cookie-consent') !== 'dismissed'
      : false
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
          role="dialog"
          aria-modal="false"
          aria-label="Cookie consent"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-gray-600 text-center sm:text-left">
              We use cookies to keep you signed in and your session secure.{' '}
              <Link
                to="/privacy"
                className="text-brand-600 hover:text-brand-700 font-medium underline underline-offset-2"
                aria-label="Learn more about our cookie and privacy policy"
              >
                Learn more
              </Link>
            </p>
            <button
              onClick={dismiss}
              className="shrink-0 px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
              aria-label="Dismiss cookie banner"
              type="button"
              autoFocus
            >
              Got it
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

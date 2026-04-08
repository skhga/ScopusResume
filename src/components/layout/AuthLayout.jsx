import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import logo from '../../assets/logo.png';

const PANEL_COPY = {
  '/signup': {
    heading: 'Land more interviews.',
    body: 'Join job seekers who use ScopusResume to build ATS-optimized resumes and get more callbacks.',
  },
  default: {
    heading: 'Your resume is waiting.',
    body: 'Sign in to pick up where you left off — your resumes, scores, and tailored applications in one place.',
  },
};

export default function AuthLayout() {
  const { pathname } = useLocation();
  const copy = PANEL_COPY[pathname] || PANEL_COPY.default;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <img src={logo} alt="ScopusResume" className="h-10 w-auto mb-6" style={{ filter: 'brightness(0) invert(1)' }} />
          <h1 className="text-3xl font-bold mb-4">{copy.heading}</h1>
          <p className="text-brand-100 text-lg">{copy.body}</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <img src={logo} alt="ScopusResume" className="h-8 w-auto" />
            <span className="text-lg font-bold text-gray-900">Scopus<span className="text-brand-600">Resume</span></span>
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import logo from '../../assets/logo.png';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <img src={logo} alt="ScopusResume" className="h-10 w-auto mb-6" style={{ filter: 'brightness(0) invert(1)' }} />
          <h1 className="text-3xl font-bold mb-4">Your resume is waiting.</h1>
          <p className="text-brand-100 text-lg">Sign in to pick up where you left off — your resumes, scores, and tailored applications in one place.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center mb-8 lg:hidden">
            <img src={logo} alt="ScopusResume" className="h-8 w-auto" />
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

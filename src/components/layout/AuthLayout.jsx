import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { FileText } from 'lucide-react';

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-600 items-center justify-center p-12">
        <div className="max-w-md text-white">
          <FileText className="h-12 w-12 mb-6" />
          <h1 className="text-3xl font-bold mb-4">Build ATS-Optimized Resumes with AI</h1>
          <p className="text-brand-100 text-lg">Join thousands of job seekers who land more interviews with ScopusResume.</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center space-x-2 mb-8 lg:hidden">
            <FileText className="h-7 w-7 text-brand-600" />
            <span className="text-xl font-bold">Scopus<span className="text-brand-600">Resume</span></span>
          </Link>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

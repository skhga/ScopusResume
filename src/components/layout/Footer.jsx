import React from 'react';
import logo from '../../assets/logo.png';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center gap-2">
            <img src={logo} alt="ScopusResume" className="h-6 w-auto" />
            <span className="text-sm font-bold text-gray-900">Scopus<span className="text-brand-600">Resume</span></span>
          </div>
          <div className="flex space-x-2 text-sm text-gray-500">
            <a href="#about" className="hover:text-gray-900 px-3 py-2.5 min-h-[44px] inline-flex items-center rounded hover:bg-gray-50 transition">About</a>
            <a href="#privacy" className="hover:text-gray-900 px-3 py-2.5 min-h-[44px] inline-flex items-center rounded hover:bg-gray-50 transition">Privacy</a>
            <a href="#terms" className="hover:text-gray-900 px-3 py-2.5 min-h-[44px] inline-flex items-center rounded hover:bg-gray-50 transition">Terms</a>
          </div>
          <p className="text-sm text-gray-400">&copy; 2026 ScopusResume. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

import React from 'react';
import { FileText } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-brand-600" />
            <span className="font-semibold text-gray-900">ScopusResume</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-500">
            <a href="#about" className="hover:text-gray-900">About</a>
            <a href="#privacy" className="hover:text-gray-900">Privacy</a>
            <a href="#terms" className="hover:text-gray-900">Terms</a>
          </div>
          <p className="text-sm text-gray-400">&copy; 2026 ScopusResume. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

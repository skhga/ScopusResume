import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, FileText, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const navLinks = [
    { to: '/app/dashboard', label: 'Dashboard' },
    { to: '/app/builder', label: 'Build Resume' },
    { to: '/app/jd-analyzer', label: 'Optimize' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <FileText className="h-7 w-7 text-brand-600" />
              <span className="text-xl font-bold text-gray-900">Scopus<span className="text-brand-600">Resume</span></span>
            </Link>
            {isAuthenticated && (
              <div className="hidden md:flex ml-10 space-x-1">
                {navLinks.map(l => (
                  <NavLink key={l.to} to={l.to} className={({ isActive }) => `px-3 py-2 rounded-lg text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>{l.label}</NavLink>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50">
                  <div className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-sm font-medium">{user?.name?.charAt(0) || 'U'}</div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    <Link to="/app/settings" onClick={() => setDropdownOpen(false)} className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><Settings className="h-4 w-4 mr-2" />Settings</Link>
                    <button onClick={() => { logout(); setDropdownOpen(false); }} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><LogOut className="h-4 w-4 mr-2" />Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/signin" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</Link>
                <Link to="/signup" className="btn-primary text-sm">Get Started</Link>
              </>
            )}
            <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
          </div>
        </div>
      </div>
      {mobileOpen && isAuthenticated && (
        <div className="md:hidden border-t border-gray-200 px-4 py-3 space-y-1">
          {navLinks.map(l => <NavLink key={l.to} to={l.to} onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">{l.label}</NavLink>)}
        </div>
      )}
    </nav>
  );
}

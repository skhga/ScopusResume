import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, PenTool, Search } from 'lucide-react';

const links = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/builder', icon: PenTool, label: 'Resume Builder' },
  { to: '/app/jd-analyzer', icon: Search, label: 'AI Tailor' },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}>
            <Icon className="h-5 w-5 mr-3" />{label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

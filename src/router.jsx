import React from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ResumeProvider } from './context/ResumeContext';

import AuthLayout from './components/layout/AuthLayout';
import AppLayout from './components/layout/AppLayout';
import RequireAuth from './components/auth/RequireAuth';

import LandingPage from './pages/landing/LandingPage';
import SignUpPage from './pages/auth/SignUpPage';
import SignInPage from './pages/auth/SignInPage';
import PasswordResetPage from './pages/auth/PasswordResetPage';
import AccountSettingsPage from './pages/auth/AccountSettingsPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ResumeBuilderPage from './pages/resume-builder/ResumeBuilderPage';
import ResumePreviewPage from './pages/preview/ResumePreviewPage';
import JDAnalyzerPage from './pages/optimizer/JDAnalyzerPage';
import AIOptimizationPage from './pages/optimizer/AIOptimizationPage';
import ATSOptimizerPage from './pages/optimizer/ATSOptimizerPage';
import ExportPage from './pages/export/ExportPage';

function RootLayout() {
  return (
    <AuthProvider>
      <ResumeProvider>
        <Outlet />
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      </ResumeProvider>
    </AuthProvider>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <LandingPage /> },

      {
        element: <AuthLayout />,
        children: [
          { path: '/signup', element: <SignUpPage /> },
          { path: '/signin', element: <SignInPage /> },
          { path: '/reset-password', element: <PasswordResetPage /> },
        ],
      },

      {
        path: '/app',
        element: <RequireAuth><AppLayout /></RequireAuth>,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'builder', element: <ResumeBuilderPage /> },
          { path: 'builder/:id', element: <ResumeBuilderPage /> },
          { path: 'preview/:id', element: <ResumePreviewPage /> },
          { path: 'jd-analyzer', element: <JDAnalyzerPage /> },
          { path: 'optimize/:id', element: <AIOptimizationPage /> },
          { path: 'ats/:id', element: <ATSOptimizerPage /> },
          { path: 'export/:id', element: <ExportPage /> },
          { path: 'settings', element: <AccountSettingsPage /> },
        ],
      },
    ],
  },
]);

export default router;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import Button from '../../components/common/Button';

export default function SignUpPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const handleGoogleSignIn = async () => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app/dashboard` },
    });
    if (oauthError) setErrors({ general: oauthError.message });
  };

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Name is required';
    if (!form.email) e.email = 'Email is required';
    if (form.password.length < 8) e.password = 'Min 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { session } = await register(form);
      if (session) {
        navigate('/app/dashboard');
      } else {
        // Supabase email confirmation is enabled — no session until user confirms
        setAwaitingConfirmation(true);
      }
    } catch (err) {
      setErrors({ general: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  if (awaitingConfirmation) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your inbox</h2>
        <p className="text-gray-600 mb-2">
          We sent a confirmation email to <strong>{form.email}</strong>.
        </p>
        <p className="text-gray-500 text-sm mb-6">
          Click the link in the email to activate your account, then sign in.
        </p>
        <Link to="/signin" className="inline-flex items-center px-5 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition">
          Go to Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
      <p className="text-gray-600 mb-8">Start building ATS-optimized resumes today.</p>
      {errors.general && <p className="text-red-600 text-sm mb-4">{errors.general}</p>}
      <button type="button" onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 mb-6">
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
      </button>
      <button
        type="button"
        onClick={async () => {
          const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'linkedin',
            options: { redirectTo: `${window.location.origin}/app/dashboard` },
          });
          if (oauthError) setErrors({ general: oauthError.message });
        }}
        className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 mb-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0A66C2">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        Continue with LinkedIn
      </button>
      <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or</span></div></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={`input-field ${errors.name ? 'border-red-500' : ''}`} placeholder="John Doe" />{errors.name && <p className="text-red-600 text-xs mt-1">{errors.name}</p>}</div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={`input-field ${errors.email ? 'border-red-500' : ''}`} placeholder="john@example.com" />{errors.email && <p className="text-red-600 text-xs mt-1">{errors.email}</p>}</div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className={`input-field ${errors.password ? 'border-red-500' : ''}`} placeholder="Min 8 characters" />{errors.password && <p className="text-red-600 text-xs mt-1">{errors.password}</p>}</div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label><input type="password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} className={`input-field ${errors.confirmPassword ? 'border-red-500' : ''}`} placeholder="Repeat password" />{errors.confirmPassword && <p className="text-red-600 text-xs mt-1">{errors.confirmPassword}</p>}</div>
        <Button type="submit" loading={loading} className="w-full">Create Account</Button>
      </form>
      <p className="text-center text-sm text-gray-600 mt-6">Already have an account? <Link to="/signin" className="text-brand-600 font-medium hover:underline min-h-[44px] inline-flex items-center px-1">Sign In</Link></p>
    </div>
  );
}

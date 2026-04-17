import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';
import Button from '../../components/common/Button';

export default function SignInPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/app/dashboard` },
    });
    if (oauthError) setError(oauthError.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('All fields required'); return; }
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      const from = location.state?.from?.pathname || '/app/dashboard';
      navigate(from, { replace: true });
    }
    catch (err) { setError(err.message || 'Invalid credentials'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back</h2>
      <p className="text-gray-600 mb-8">Sign in to continue building your resume.</p>
      {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
      <button type="button" onClick={handleGoogleSignIn} className="w-full flex items-center justify-center gap-2 border border-gray-300 rounded-lg py-2.5 min-h-[44px] text-sm font-medium text-gray-700 hover:bg-gray-50 mb-6">
        <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
      </button>
      <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div><div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or</span></div></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="input-field" placeholder="john@example.com" /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Password</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="input-field" placeholder="Enter password" /></div>
        <div className="flex items-center justify-between">
          <label className="flex items-center text-sm"><input type="checkbox" className="rounded border-gray-300 text-brand-600 mr-2" />Remember me</label>
          <Link to="/reset-password" className="text-sm text-brand-600 hover:underline min-h-[44px] inline-flex items-center px-1">Forgot password?</Link>
        </div>
        <Button type="submit" loading={loading} className="w-full">Sign In</Button>
      </form>
      <p className="text-center text-sm text-gray-600 mt-6">Don't have an account? <Link to="/signup" className="text-brand-600 font-medium hover:underline min-h-[44px] inline-flex items-center px-1">Sign Up</Link></p>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import Button from '../../components/common/Button';
import authService from '../../services/authService';

export default function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 className="h-8 w-8 text-green-600" /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-600 mb-6">We've sent password reset instructions to <strong>{email}</strong></p>
        <Link to="/signin" className="text-brand-600 font-medium hover:underline inline-flex items-center"><ArrowLeft className="h-4 w-4 mr-1" />Back to Sign In</Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Reset your password</h2>
      <p className="text-gray-600 mb-8">Enter your email and we'll send you instructions.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input-field pl-10" placeholder="john@example.com" /></div>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        <Button type="submit" loading={loading} className="w-full">Send Reset Link</Button>
      </form>
      <p className="text-center text-sm text-gray-600 mt-6"><Link to="/signin" className="text-brand-600 font-medium hover:underline inline-flex items-center"><ArrowLeft className="h-3 w-3 mr-1" />Back to Sign In</Link></p>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Button from '../../components/common/Button';

export default function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setTimeout(() => { setSent(true); setLoading(false); }, 800);
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
        <Button type="submit" loading={loading} className="w-full">Send Reset Link</Button>
      </form>
      <p className="text-center text-sm text-gray-600 mt-6"><Link to="/signin" className="text-brand-600 font-medium hover:underline inline-flex items-center"><ArrowLeft className="h-3 w-3 mr-1" />Back to Sign In</Link></p>
    </div>
  );
}

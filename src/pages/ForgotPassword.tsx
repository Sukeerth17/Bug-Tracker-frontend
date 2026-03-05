import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { authService } from '@/services/authService';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const msg = await authService.forgotPassword(email);
      setMessage(msg);
      navigate('/verify-otp', { state: { email } });
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot Password" subtitle="Generate OTP to reset password" footerText="Remembered it?" footerLinkText="Login" footerLinkTo="/login">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="h-10 w-full rounded-md border px-3 text-sm" required />
        {message && <p className="text-xs text-emerald-600">{message}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button disabled={loading} className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">{loading ? 'Sending...' : 'Send OTP'}</button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;

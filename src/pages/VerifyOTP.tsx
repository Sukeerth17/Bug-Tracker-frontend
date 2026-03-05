import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { authService } from '@/services/authService';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>(location.state?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      await authService.verifyOtp(email, otp);
      const msg = await authService.resetPassword(email, newPassword);
      setMessage(msg);
      navigate('/login');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Verify OTP" subtitle="Enter OTP and set new password" footerText="Back to" footerLinkText="Login" footerLinkTo="/login">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="h-10 w-full rounded-md border px-3 text-sm" required />
        <input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" className="h-10 w-full rounded-md border px-3 text-sm" required />
        <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="New password (min 8)" className="h-10 w-full rounded-md border px-3 text-sm" required minLength={8} />
        {message && <p className="text-xs text-emerald-600">{message}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button disabled={loading} className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">{loading ? 'Verifying...' : 'Verify OTP & Reset'}</button>
      </form>
    </AuthLayout>
  );
};

export default VerifyOTP;

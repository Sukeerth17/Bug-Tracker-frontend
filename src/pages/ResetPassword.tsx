import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { authService } from '@/services/authService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ResetPassword = () => {
  const location = useLocation();
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', [location.search]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!token) {
      setError('Invalid reset link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const msg = await authService.resetPassword(token, password);
      setMessage(msg);
      setPassword('');
      setConfirm('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Reset Password" subtitle="Choose a new password for your account" footerText="Remembered it?" footerLinkText="Login" footerLinkTo="/login">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">New Password</label>
          <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Minimum 8 characters" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
          <Input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" placeholder="Re-enter password" required />
        </div>
        {message && (
          <p className="text-xs text-emerald-600">
            {message} <Link className="text-primary hover:underline ml-1" to="/login">Login</Link>
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Saving...' : 'Reset Password'}</Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;

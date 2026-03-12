import React, { useState } from 'react';
import AuthLayout from '@/components/AuthLayout';
import { authService } from '@/services/authService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const ForgotPassword = () => {
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
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to send credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Forgot Password" subtitle="We will email a reset link to you" footerText="Remembered it?" footerLinkText="Login" footerLinkTo="/login">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@company.com" required />
        </div>
        {message && <p className="text-xs text-emerald-600">{message}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Sending...' : 'Send Reset Link'}</Button>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { authService } from '@/services/authService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>(location.state?.email || '');
  const purpose = (location.state?.purpose === 'signup' ? 'signup' : 'reset') as 'signup' | 'reset';
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
      const verifyMsg = await authService.verifyOtp(email, otp);
      if (purpose === 'signup') {
        setMessage(verifyMsg);
        navigate('/login');
      } else {
        const msg = await authService.resetPassword(email, newPassword);
        setMessage(msg);
        navigate('/login');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Verify OTP"
      subtitle={purpose === 'signup' ? 'Enter OTP sent to your email to activate your account' : 'Enter OTP and set new password'}
      footerText="Back to"
      footerLinkText="Login"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@company.com" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">OTP</label>
          <Input value={otp} onChange={e => setOtp(e.target.value)} placeholder="6-digit OTP" required />
        </div>
        {purpose === 'reset' && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">New Password</label>
            <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="Minimum 8 characters" required minLength={8} />
          </div>
        )}
        {message && <p className="text-xs text-emerald-600">{message}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Verifying...' : purpose === 'signup' ? 'Verify OTP' : 'Verify OTP & Reset'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default VerifyOTP;

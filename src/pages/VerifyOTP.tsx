import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { authService } from '@/services/authService';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

const VerifyOTP = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const defaultEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const defaultToken = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [email, setEmail] = useState(defaultEmail);
  const [token, setToken] = useState(defaultToken);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);
    try {
      const msg = await authService.resetPassword(email, token, newPassword);
      setMessage(msg);
      navigate('/login');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Reset password failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Use the token from your email reset link"
      footerText="Back to"
      footerLinkText="Login"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@gmail.com" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Reset Token</label>
          <Input value={token} onChange={e => setToken(e.target.value)} placeholder="Paste token from reset link" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">New Password</label>
          <div className="relative">
            <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters" required minLength={8} className="pr-10" />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {message && <p className="text-xs text-emerald-600">{message}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">{loading ? 'Resetting...' : 'Reset Password'}</Button>
      </form>
    </AuthLayout>
  );
};

export default VerifyOTP;

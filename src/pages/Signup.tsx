import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('US');
  const [password, setPassword] = useState('');
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
      const msg = await signup({ name, email, avatar, password });
      setMessage(msg);
      navigate('/login');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start using the ticket system"
      footerText="Already have an account?"
      footerLinkText="Login"
      footerLinkTo="/login"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@company.com" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Avatar Initials</label>
          <Input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="SA" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Password</label>
          <div className="relative">
            <Input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters" required minLength={8} className="pr-10" />
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Create Account'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Signup;

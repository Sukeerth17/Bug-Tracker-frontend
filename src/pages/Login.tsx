import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/space/sp1/board');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Login"
      subtitle="Access your ticket workspace"
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkTo="/signup"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Email</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@company.com" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Password</label>
          <Input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Enter password" required />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
      <p className="text-xs text-center"><Link className="text-primary hover:underline" to="/forgot-password">Forgot password?</Link></p>
    </AuthLayout>
  );
};

export default Login;

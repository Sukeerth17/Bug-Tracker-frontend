import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';

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
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="h-10 w-full rounded-md border px-3 text-sm" required />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="h-10 w-full rounded-md border px-3 text-sm" required />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button disabled={loading} className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p className="text-xs text-center"><Link className="text-primary hover:underline" to="/forgot-password">Forgot password?</Link></p>
    </AuthLayout>
  );
};

export default Login;

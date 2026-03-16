import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';
import { projectApi } from '@/services/projectApi';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { getAuthUser } from '@/services/authStorage';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      const authUser = getAuthUser();
      const projects = await projectApi.getProjects();
      const firstProjectId = projects[0]?.id;
      if (authUser?.role === 'SUPER_ADMIN') {
        navigate('/recent');
      } else {
        navigate(firstProjectId ? `/space/${firstProjectId}/board` : '/for-you');
      }
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
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Gmail</label>
          <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@gmail.com" type="email" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Password</label>
          <div className="relative">
            <Input value={password} onChange={e => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Enter password" required className="pr-10" />
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
        {error && <p className="text-xs text-destructive">{error}</p>}
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          Remember me
        </label>
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Logging in...' : 'Login'}
        </Button>
      </form>
      <p className="text-xs text-center"><Link className="text-primary hover:underline" to="/forgot-password">Forgot password?</Link></p>
    </AuthLayout>
  );
};

export default Login;

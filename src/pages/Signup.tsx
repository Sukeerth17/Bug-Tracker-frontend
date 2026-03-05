import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/components/AuthLayout';
import { useAuth } from '@/contexts/AuthContext';

const Signup = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('US');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signup({ name, email, avatar, password });
      navigate('/space/sp1/board');
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
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="h-10 w-full rounded-md border px-3 text-sm" required />
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" className="h-10 w-full rounded-md border px-3 text-sm" required />
        <input value={avatar} onChange={e => setAvatar(e.target.value)} placeholder="Avatar initials (e.g. SA)" className="h-10 w-full rounded-md border px-3 text-sm" required />
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password (min 8)" className="h-10 w-full rounded-md border px-3 text-sm" required minLength={8} />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button disabled={loading} className="h-10 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  );
};

export default Signup;

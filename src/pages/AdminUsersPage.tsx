import React from 'react';
import { ticketApi } from '@/services/ticketApi';
import { User } from '@/data/models';

const AdminUsersPage = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [avatar, setAvatar] = React.useState('');
  const [error, setError] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await ticketApi.getUsers());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await ticketApi.createUser({ name: name.trim(), email: email.trim(), avatar: avatar.trim() || 'US' });
      setName('');
      setEmail('');
      setAvatar('');
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Delete this user? Tickets will be reassigned/archived by backend policy.')) return;
    setSaving(true);
    setError('');
    try {
      await ticketApi.deleteUser(userId);
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold">User Management</h1>

      <form onSubmit={handleAdd} className="bg-card rounded-xl border p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Full name" required />
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" type="email" placeholder="Gmail address" required />
          <input value={avatar} onChange={(e) => setAvatar(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Avatar initials" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">{saving ? 'Saving...' : 'Add User (Google Onboard)'}</button>
      </form>

      <div className="bg-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3">Existing Users</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email} ({user.role || 'USER'})</p>
                </div>
                {user.role !== 'SUPER_ADMIN' && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    disabled={saving}
                    className="h-8 px-3 rounded-md border text-xs text-destructive hover:bg-destructive/10"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsersPage;

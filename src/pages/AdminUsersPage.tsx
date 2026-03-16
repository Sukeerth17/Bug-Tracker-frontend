import React from 'react';
import { ticketApi } from '@/services/ticketApi';
import { User } from '@/data/models';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/sonner';
import { Eye, EyeOff } from 'lucide-react';

const AdminUsersPage = () => {
  const [users, setUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [avatar, setAvatar] = React.useState('');
  const [error, setError] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingUserId) {
        const updated = await ticketApi.updateUser(editingUserId, {
          name: name.trim(),
          email: email.trim(),
          password: password.trim() ? password : undefined,
          avatar: avatar.trim() || 'US',
        });
        setUsers((prev) => prev.map((user) => user.id === editingUserId ? updated : user));
        toast('User updated');
        setEditingUserId(null);
      } else {
        const result = await ticketApi.createUser({
          name: name.trim(),
          email: email.trim(),
          password,
          avatar: avatar.trim() || 'US',
        });
        setUsers((prev) => [result.user, ...prev]);
        toast('User created');
        if (!result.emailSent && result.warning) {
          toast(result.warning, { description: 'User was created but email delivery failed.' });
        }
      }
      setName('');
      setEmail('');
      setPassword('');
      setAvatar('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setAvatar(user.avatar || 'US');
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPassword('');
    setAvatar('');
  };

  const requestDelete = (userId: string) => {
    setPendingDeleteId(userId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setSaving(true);
    setError('');
    try {
      await ticketApi.deleteUser(pendingDeleteId);
      setUsers((prev) => prev.filter((user) => user.id !== pendingDeleteId));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete user');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold">User Management</h1>

      <form
        onSubmit={handleSave}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          handleSave(e as unknown as React.FormEvent);
        }}
        className="bg-card rounded-xl border p-4 space-y-3"
      >
        <div className="grid md:grid-cols-3 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Full name" required />
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" type="email" placeholder="Gmail or technobuild.in" required />
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 pr-8 text-sm"
              type={showPassword ? 'text' : 'password'}
              placeholder={editingUserId ? 'New password (optional)' : 'Password (min 8 chars)'}
              required={!editingUserId}
              minLength={editingUserId ? undefined : 8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <input value={avatar} onChange={(e) => setAvatar(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm md:col-span-2" placeholder="Avatar initials" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <button disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            {saving ? 'Saving...' : (editingUserId ? 'Save Changes' : 'Add User')}
          </button>
          {editingUserId && (
            <button type="button" onClick={cancelEdit} className="h-9 px-4 rounded-lg border text-sm">
              Cancel
            </button>
          )}
        </div>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(user)}
                      disabled={saving}
                      className="h-8 px-3 rounded-md border text-xs hover:bg-muted"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => requestDelete(user.id)}
                      disabled={saving}
                      className="h-8 px-3 rounded-md border text-xs text-destructive hover:bg-destructive/10"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmOpen}
        title="Delete User"
        message="Delete this user? Tickets will be reassigned/archived by backend policy."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
};

export default AdminUsersPage;

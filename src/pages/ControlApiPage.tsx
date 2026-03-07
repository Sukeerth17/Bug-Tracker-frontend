import React, { useMemo, useState } from 'react';
import { API_ENDPOINTS, getApiBaseUrl, getRequesterUserId, setApiBaseUrl, setRequesterUserId } from '@/services/controlApi';
import { useTickets } from '@/contexts/TicketContext';
import { ticketApi } from '@/services/ticketApi';

const ControlApiPage = () => {
  const { users, refreshAll } = useTickets();
  const [baseUrl, setBaseUrlLocal] = useState(getApiBaseUrl());
  const [requesterUserId, setRequesterUserIdLocal] = useState(getRequesterUserId());
  const [saving, setSaving] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserAvatar, setNewUserAvatar] = useState('');

  const endpointRows = useMemo(
    () => Object.entries(API_ENDPOINTS).map(([name, path]) => ({ name, path })),
    []
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      setApiBaseUrl(baseUrl);
      setRequesterUserId(requesterUserId);
      await refreshAll();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserAvatar.trim()) return;
    setSaving(true);
    try {
      await ticketApi.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        avatar: newUserAvatar.trim(),
      });
      setNewUserName('');
      setNewUserEmail('');
      setNewUserAvatar('');
      await refreshAll();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold">Control API</h1>

      <div className="bg-card rounded-xl border p-4 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Backend Base URL</label>
          <input
            value={baseUrl}
            onChange={(e) => setBaseUrlLocal(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="http://localhost:8080/api"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">Requester User</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
            <input
              value={requesterUserId}
              onChange={(e) => setRequesterUserIdLocal(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Enter user id (e.g. 1)"
            />
            <select
              value={requesterUserId}
              onChange={(e) => setRequesterUserIdLocal(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Select existing user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role || 'USER'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save & Reload'}
          </button>
          <a
            href="http://localhost:8080/swagger-ui/index.html"
            target="_blank"
            rel="noreferrer"
            className="h-9 px-4 rounded-lg border text-sm font-medium inline-flex items-center hover:bg-accent transition-colors"
          >
            Open Swagger
          </a>
        </div>
      </div>

      <div className="bg-card rounded-xl border p-4 space-y-3">
        <h2 className="text-sm font-semibold">Create User (Fresh Setup)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Name"
          />
          <input
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Email"
          />
          <input
            value={newUserAvatar}
            onChange={(e) => setNewUserAvatar(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="Avatar initials (e.g. SA)"
          />
        </div>
        <button
          onClick={handleCreateUser}
          disabled={saving}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          Create User
        </button>
      </div>

      <div className="bg-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3">Central API Endpoints</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Name</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">Path</th>
              </tr>
            </thead>
            <tbody>
              {endpointRows.map((row) => (
                <tr key={row.name} className="border-b">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{row.path}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ControlApiPage;


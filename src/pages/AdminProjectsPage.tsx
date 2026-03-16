import React from 'react';
import { projectApi, ProjectItem } from '@/services/projectApi';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/sonner';

const AdminProjectsPage = () => {
  const [projects, setProjects] = React.useState<ProjectItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [error, setError] = React.useState('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      setProjects(await projectApi.getProjects());
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await projectApi.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        startDate: startDate || undefined,
      });
      setName('');
      setDescription('');
      setStartDate('');
      await load();
      toast('Project saved');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  const requestDelete = (projectId: string) => {
    setPendingDeleteId(projectId);
    setConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setSaving(true);
    setError('');
    try {
      await projectApi.deleteProject(pendingDeleteId);
      await load();
      toast('Project deleted');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete project');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
      setPendingDeleteId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-semibold">Create Project</h1>
      <form
        onSubmit={handleCreate}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          handleCreate(e as unknown as React.FormEvent);
        }}
        className="bg-card rounded-xl border p-4 space-y-3"
      >
        <div className="grid md:grid-cols-2 gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" placeholder="Project name *" required />
          <input value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm" type="date" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9 rounded-md border bg-background px-3 text-sm md:col-span-2" placeholder="Description" />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button disabled={saving} className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">{saving ? 'Saving...' : 'Create Project'}</button>
      </form>

      <div className="bg-card rounded-xl border p-4">
        <h2 className="text-sm font-semibold mb-3">Existing Projects</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-2">
            {projects.map((project) => (
              <div key={project.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <p className="text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.id}</p>
                </div>
                <button
                  onClick={() => requestDelete(project.id)}
                  disabled={saving}
                  className="h-8 px-3 rounded-md border text-xs text-destructive hover:bg-destructive/10"
                >
                  Delete
                </button>
              </div>
            ))}
            {projects.length === 0 && <p className="text-sm text-muted-foreground">No projects found.</p>}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={confirmOpen}
        title="Delete Project"
        message="Delete this project permanently? All related tickets will be deleted."
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

export default AdminProjectsPage;

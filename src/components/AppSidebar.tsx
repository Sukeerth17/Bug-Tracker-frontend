import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  User, Clock,
  LayoutDashboard, List, Kanban, ChevronDown, ChevronRight, FolderPlus, Users, Plus, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProjectIdFromPathname, setActiveProjectId } from '@/services/projectControl';
import { projectApi, ProjectItem } from '@/services/projectApi';
import { featureApi, FeatureItem } from '@/services/featureApi';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from '@/components/ui/sonner';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = React.useState<ProjectItem[]>([]);
  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(new Set());
  const [featuresByProject, setFeaturesByProject] = React.useState<Record<string, FeatureItem[]>>({});
  const [expandedFeatureSections, setExpandedFeatureSections] = React.useState<Set<string>>(new Set());
  const [expandedFeatures, setExpandedFeatures] = React.useState<Set<string>>(new Set());
  const [creatingForProject, setCreatingForProject] = React.useState<string | null>(null);
  const [newFeatureName, setNewFeatureName] = React.useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<{ projectId: string; featureId: string } | null>(null);

  const parts = location.pathname.split('/');
  const currentProjectId = parts[1] === 'space' && parts[2] ? parts[2] : (projects[0]?.id || '');

  const loadProjects = React.useCallback(() => {
    projectApi.getProjects().then(setProjects).catch(() => setProjects([]));
  }, []);

  React.useEffect(() => {
    loadProjects();
  }, [loadProjects, location.pathname]);

  React.useEffect(() => {
    const handler = () => loadProjects();
    window.addEventListener('projects:changed', handler);
    return () => window.removeEventListener('projects:changed', handler);
  }, [loadProjects]);

  React.useEffect(() => {
    if (projects.length === 0) {
      setFeaturesByProject({});
      return;
    }
    Promise.all(
      projects.map(async (project) => ({
        projectId: project.id,
        features: await featureApi.getFeatures(project.id).catch(() => []),
      }))
    ).then((rows) => {
      const next: Record<string, FeatureItem[]> = {};
      rows.forEach((row) => { next[row.projectId] = row.features; });
      setFeaturesByProject(next);
    });
  }, [projects]);

  React.useEffect(() => {
    const projectId = getProjectIdFromPathname(location.pathname);
    if (projectId) {
      setActiveProjectId(projectId);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    if (!currentProjectId) return;
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.add(currentProjectId);
      return next;
    });
  }, [currentProjectId]);

  const mainNav = [
    ...(user?.role === 'SUPER_ADMIN' ? [] : [{ label: 'For You', icon: User, to: '/for-you' }]),
    { label: 'Recent', icon: Clock, to: '/recent' },
  ];

  const toggleProjectExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const toggleFeatureSection = (projectId: string) => {
    setExpandedFeatureSections((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const toggleFeatureExpanded = (featureId: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  };

  const createFeature = async (projectId: string) => {
    const name = newFeatureName.trim();
    if (!name) {
      setNewFeatureName('');
      setCreatingForProject(null);
      return;
    }
    const created = await featureApi.createFeature(projectId, name);
    setFeaturesByProject((prev) => ({
      ...prev,
      [projectId]: [created, ...(prev[projectId] || [])],
    }));
    setNewFeatureName('');
    setCreatingForProject(null);
    setExpandedFeatureSections((prev) => new Set(prev).add(projectId));
    toast('Feature saved');
  };

  const requestDeleteFeature = (projectId: string, featureId: string) => {
    setPendingDelete({ projectId, featureId });
    setConfirmDeleteOpen(true);
  };

  const confirmDeleteFeature = async () => {
    if (!pendingDelete) return;
    const { projectId, featureId } = pendingDelete;
    await featureApi.deleteFeature(projectId, featureId);
    setFeaturesByProject((prev) => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter((f) => f.id !== featureId),
    }));
    setConfirmDeleteOpen(false);
    setPendingDelete(null);
    toast('Feature deleted');
  };

  return (
    <>
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-40 transition-all duration-200 border-r border-sidebar-border',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      <div
        className={cn('flex items-center h-16 px-4 border-b border-sidebar-border cursor-pointer', collapsed && 'justify-center px-2')}
        onClick={() => navigate(currentProjectId ? `/space/${currentProjectId}/board` : (user?.role === 'SUPER_ADMIN' ? '/recent' : '/for-you'))}
      >
        {collapsed ? (
          <span className="text-2xl font-bold text-sidebar-primary">T</span>
        ) : (
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-sidebar-primary">Ticket</span>
            <span className="text-sidebar-foreground">Desk</span>
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        <div className="space-y-0.5 px-2">
          {mainNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-base transition-colors duration-150',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary'
                  : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                collapsed && 'justify-center px-2'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>

        <div className="mt-6 px-2">
          {!collapsed && (
            <p className="px-3 mb-2 text-xs font-semibold uppercase tracking-widest text-sidebar-muted">
              Projects
            </p>
          )}
          <div className="mb-1">
            {!collapsed && (
              <div className="px-2 mb-2 space-y-1">
                {projects.map(project => (
                  <div key={project.id} className="space-y-1">
                    <div className={cn(
                      'w-full flex items-center gap-1 px-1 py-1 rounded-md transition-colors',
                      project.id === currentProjectId ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}>
                      <button
                        onClick={() => toggleProjectExpanded(project.id)}
                        className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-sidebar-accent"
                        aria-label={expandedProjects.has(project.id) ? 'Collapse project' : 'Expand project'}
                      >
                        {expandedProjects.has(project.id) ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                        )}
                      </button>
                      <button
                        onClick={() => navigate(`/space/${project.id}/board`)}
                        className="flex-1 flex items-center gap-2 px-1 py-0.5 rounded text-sm text-left"
                      >
                        <span className="h-2 w-2 rounded-sm shrink-0 bg-sidebar-primary" />
                        <span className="truncate">{project.name}</span>
                      </button>
                    </div>
                    {expandedProjects.has(project.id) && (
                      <div className="ml-4 space-y-0.5">
                        <NavLink
                          to={`/space/${project.id}/summary`}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          )}
                        >
                          <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                          <span>Summary</span>
                        </NavLink>
                        <NavLink
                          to={`/space/${project.id}/board`}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          )}
                        >
                          <Kanban className="h-3.5 w-3.5 shrink-0" />
                          <span>Board</span>
                        </NavLink>
                        <NavLink
                          to={`/space/${project.id}/list`}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          )}
                        >
                          <List className="h-3.5 w-3.5 shrink-0" />
                          <span>List</span>
                        </NavLink>

                        <div className="mt-2">
                          <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-widest text-sidebar-muted">
                            <button
                              onClick={() => toggleFeatureSection(project.id)}
                              className="flex items-center gap-1 hover:text-sidebar-foreground"
                            >
                              {expandedFeatureSections.has(project.id) ? (
                                <ChevronDown className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5" />
                              )}
                              Features
                            </button>
                            <button
                              onClick={() => {
                                setCreatingForProject(project.id);
                                setExpandedFeatureSections((prev) => new Set(prev).add(project.id));
                              }}
                              className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-sidebar-accent"
                              aria-label="Add feature"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {expandedFeatureSections.has(project.id) && (
                            <div className="ml-2 space-y-1">
                              {creatingForProject === project.id && (
                                <div className="flex items-center gap-1 px-2">
                                  <input
                                    value={newFeatureName}
                                    onChange={(e) => setNewFeatureName(e.target.value)}
                                    onBlur={() => {
                                      if (!newFeatureName.trim()) {
                                        setCreatingForProject(null);
                                        setNewFeatureName('');
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        void createFeature(project.id);
                                      }
                                      if (e.key === 'Escape') {
                                        setCreatingForProject(null);
                                        setNewFeatureName('');
                                      }
                                    }}
                                    className="h-7 flex-1 rounded-md border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground"
                                    placeholder="New feature name"
                                  />
                                </div>
                              )}
                              {(featuresByProject[project.id] || []).map((feature) => (
                                  <div key={feature.id} className="space-y-1">
                                  <div className="flex items-center gap-1 px-2">
                                    <button
                                      onClick={() => toggleFeatureExpanded(feature.id)}
                                      className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-sidebar-accent"
                                      aria-label="Toggle feature"
                                    >
                                      {expandedFeatures.has(feature.id) ? (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => navigate(`/space/${project.id}/feature/${feature.id}/board`)}
                                      className="flex-1 text-left text-sm text-sidebar-muted hover:text-sidebar-foreground"
                                    >
                                      {feature.name}
                                    </button>
                                    <button
                                      onClick={() => requestDeleteFeature(project.id, feature.id)}
                                      className="h-5 w-5 inline-flex items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-muted hover:text-destructive"
                                      aria-label="Delete feature"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {expandedFeatures.has(feature.id) && (
                                    <div className="ml-6 space-y-0.5">
                                      <NavLink
                                        to={`/space/${project.id}/feature/${feature.id}/board`}
                                        className={({ isActive }) => cn(
                                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                        )}
                                      >
                                        <Kanban className="h-3.5 w-3.5 shrink-0" />
                                        <span>Board</span>
                                      </NavLink>
                                      <NavLink
                                        to={`/space/${project.id}/feature/${feature.id}/list`}
                                        className={({ isActive }) => cn(
                                          'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                                          isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                                        )}
                                      >
                                        <List className="h-3.5 w-3.5 shrink-0" />
                                        <span>List</span>
                                      </NavLink>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {user?.role === 'SUPER_ADMIN' && (
                  <>
                    <button
                      onClick={() => navigate('/admin/projects')}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      <span>Create Project</span>
                    </button>
                    <button
                      onClick={() => navigate('/admin/users')}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>User Management</span>
                    </button>
                  </>
                )}
              </div>
            )}
            {collapsed && (
              <div className="space-y-1">
                <button onClick={() => currentProjectId && navigate(`/space/${currentProjectId}/summary`)} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => currentProjectId && navigate(`/space/${currentProjectId}/board`)} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                  <Kanban className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => currentProjectId && navigate(`/space/${currentProjectId}/list`)} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                  <List className="h-3.5 w-3.5" />
                </button>
                {user?.role === 'SUPER_ADMIN' && (
                  <>
                    <button onClick={() => navigate('/admin/projects')} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                      <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => navigate('/admin/users')} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                      <Users className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </aside>
    <ConfirmationModal
      isOpen={confirmDeleteOpen}
      title="Delete Feature"
      message="Delete this feature? Tickets will remain but no longer be linked to this feature."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      variant="danger"
      onConfirm={confirmDeleteFeature}
      onCancel={() => {
        setConfirmDeleteOpen(false);
        setPendingDelete(null);
      }}
    />
    </>
  );
};

export default AppSidebar;

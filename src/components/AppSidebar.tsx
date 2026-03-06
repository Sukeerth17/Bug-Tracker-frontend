import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  User, Clock, Settings, HelpCircle,
  LayoutDashboard, List, Kanban, Plus, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addProject, getProjectIdFromPathname, getProjects, setActiveProjectId } from '@/services/projectControl';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = React.useState(getProjects());
  const [expandedProjects, setExpandedProjects] = React.useState<Set<string>>(new Set());
  const parts = location.pathname.split('/');
  const currentProjectId = parts[1] === 'space' && parts[2] ? parts[2] : (projects[0]?.id || 'sp1');

  React.useEffect(() => {
    const projectId = getProjectIdFromPathname(location.pathname);
    if (projectId) {
      setActiveProjectId(projectId);
    }
  }, [location.pathname]);

  React.useEffect(() => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.add(currentProjectId);
      return next;
    });
  }, [currentProjectId]);

  const mainNav = [
    { label: 'For You', icon: User, to: '/for-you' },
    { label: 'Recent', icon: Clock, to: '/recent' },
  ];

  const handleAddProject = () => {
    const name = window.prompt('Enter project name');
    if (!name || !name.trim()) return;
    const project = addProject(name);
    const next = getProjects();
    setProjects(next);
    navigate(`/space/${project.id}/board`);
  };

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

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-40 transition-all duration-200 border-r border-sidebar-border',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Logo — navigates to Board */}
      <div
        className={cn('flex items-center h-14 px-4 border-b border-sidebar-border cursor-pointer', collapsed && 'justify-center px-2')}
        onClick={() => navigate(`/space/${currentProjectId}/board`)}
      >
        {collapsed ? (
          <span className="text-lg font-bold text-sidebar-primary">T</span>
        ) : (
          <span className="text-lg font-bold tracking-tight">
            <span className="text-sidebar-primary">Ticket</span>
            <span className="text-sidebar-foreground">Desk</span>
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        <div className="space-y-0.5 px-2">
          {mainNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150',
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

        {/* Space section */}
        <div className="mt-6 px-2">
          {!collapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
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
                        className="flex-1 flex items-center gap-2 px-1 py-0.5 rounded text-xs text-left"
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
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors',
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          )}
                        >
                          <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
                          <span>Summary</span>
                        </NavLink>
                        <NavLink
                          to={`/space/${project.id}/board`}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors',
                            isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                          )}
                        >
                          <Kanban className="h-3.5 w-3.5 shrink-0" />
                          <span>Board</span>
                        </NavLink>
                        <NavLink
                          to={`/space/${project.id}/list`}
                          className={({ isActive }) => cn(
                            'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors',
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
                <button
                  onClick={handleAddProject}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Project</span>
                </button>
              </div>
            )}
            {collapsed && (
              <div className="space-y-1">
                <button onClick={handleAddProject} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => navigate(`/space/${currentProjectId}/summary`)} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => navigate(`/space/${currentProjectId}/board`)} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                  <Kanban className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => navigate(`/space/${currentProjectId}/list`)} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border py-2 px-2 space-y-0.5">
        <button className={cn('flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors', collapsed && 'justify-center px-2')}>
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>
        <button className={cn('flex items-center gap-3 w-full rounded-md px-3 py-2 text-sm text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors', collapsed && 'justify-center px-2')}>
          <HelpCircle className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Help</span>}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;

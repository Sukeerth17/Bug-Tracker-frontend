import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  User, Clock, Bug, Settings, HelpCircle,
  LayoutDashboard, List, Kanban, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addProject, getProjects } from '@/services/projectControl';

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AppSidebar = ({ collapsed, onToggle }: AppSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = React.useState(getProjects());
  const parts = location.pathname.split('/');
  const currentProjectId = parts[1] === 'space' && parts[2] ? parts[2] : (projects[0]?.id || 'sp1');
  const currentProject = projects.find((project) => project.id === currentProjectId) || projects[0];

  const mainNav = [
    { label: 'For You', icon: User, to: '/for-you' },
    { label: 'Recent', icon: Clock, to: '/recent' },
  ];

  const spaceNav = [
    { label: 'Summary', icon: LayoutDashboard, to: `/space/${currentProjectId}/summary` },
    { label: 'Board', icon: Kanban, to: `/space/${currentProjectId}/board` },
    { label: 'List', icon: List, to: `/space/${currentProjectId}/list` },
  ];

  const handleAddProject = () => {
    const name = window.prompt('Enter project name');
    if (!name || !name.trim()) return;
    const project = addProject(name);
    const next = getProjects();
    setProjects(next);
    navigate(`/space/${project.id}/board`);
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
              Space
            </p>
          )}
          <div className="mb-1">
            {!collapsed && (
              <div className="px-2 mb-2 space-y-1">
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => navigate(`/space/${project.id}/board`)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors',
                      project.id === currentProjectId ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )}
                  >
                    <span className="h-2 w-2 rounded-sm shrink-0 bg-sidebar-primary" />
                    <span className="truncate">{project.name}</span>
                  </button>
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
              <button onClick={handleAddProject} className="flex items-center justify-center w-full py-1 text-sidebar-muted hover:text-sidebar-foreground">
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="space-y-0.5 ml-1">
              {spaceNav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
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

const ACTIVE_PROJECT_KEY = 'ticket.activeProjectId';

export function setActiveProjectId(projectId: string) {
  if (!projectId) {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
}

export function getActiveProjectId(): string | null {
  const stored = localStorage.getItem(ACTIVE_PROJECT_KEY);
  return stored || null;
}

export function getProjectIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/space\/([^/]+)\//);
  return match?.[1] || null;
}

export function getFeatureIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/space\/[^/]+\/feature\/([^/]+)\//);
  return match?.[1] || null;
}

export function resolveProjectId(pathname: string): string {
  const fromPath = getProjectIdFromPathname(pathname);
  if (fromPath) {
    setActiveProjectId(fromPath);
    return fromPath;
  }
  return getActiveProjectId() || '';
}

export function resolveFeatureId(pathname: string): string | null {
  return getFeatureIdFromPathname(pathname);
}

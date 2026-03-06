export interface ProjectItem {
  id: string;
  name: string;
}

const PROJECTS_KEY = 'ticket.projects';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `project-${Date.now()}`;
}

export function getProjects(): ProjectItem[] {
  const raw = localStorage.getItem(PROJECTS_KEY);
  if (!raw) {
    const defaults = [{ id: 'sp1', name: 'Ticket Hub' }];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw) as ProjectItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const defaults = [{ id: 'sp1', name: 'Ticket Hub' }];
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(defaults));
      return defaults;
    }
    return parsed;
  } catch {
    const defaults = [{ id: 'sp1', name: 'Ticket Hub' }];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(defaults));
    return defaults;
  }
}

export function addProject(name: string): ProjectItem {
  const projects = getProjects();
  const cleanName = name.trim();
  const idBase = slugify(cleanName);

  let id = idBase;
  let idx = 2;
  while (projects.some((p) => p.id === id)) {
    id = `${idBase}-${idx++}`;
  }

  const project = { id, name: cleanName };
  const next = [...projects, project];
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(next));
  return project;
}

export function getFirstProjectId(): string {
  return getProjects()[0].id;
}

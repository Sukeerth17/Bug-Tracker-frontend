import React, { useEffect, useMemo, useState } from 'react';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, PriorityIcon, TypeIcon, DeptBadge } from '@/components/TicketBadges';
import { Ticket, Department, departments } from '@/data/models';
import { ticketApi } from '@/services/ticketApi';
import { projectApi, ProjectItem } from '@/services/projectApi';
import { featureApi, FeatureItem } from '@/services/featureApi';

const ForYouPage = () => {
  const { setSelectedTicket } = useTickets();
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'all'>('all');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'createdAt' | 'projectId' | 'department' | 'featureId'>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    projectApi.getProjects()
      .then(setProjects)
      .catch(() => setProjects([]));
  }, []);

  useEffect(() => {
    if (projects.length === 0) {
      setFeatures([]);
      return;
    }
    Promise.all(projects.map(async (project) => ({
      projectId: project.id,
      features: await featureApi.getFeatures(project.id).catch(() => []),
    })))
      .then((rows) => {
        const merged = rows.flatMap((row) => row.features.map((f) => ({ ...f, projectId: row.projectId })));
        setFeatures(merged);
      })
      .catch(() => setFeatures([]));
  }, [projects]);

  useEffect(() => {
    const params: { projectId?: string; featureId?: string; department?: string; sortBy?: string; sortDir?: string } = {
      sortBy,
      sortDir,
    };
    if (projectFilter !== 'all') params.projectId = projectFilter;
    if (featureFilter !== 'all') params.featureId = featureFilter;
    if (departmentFilter !== 'all') params.department = departmentFilter;

    ticketApi.getForYou(params)
      .then((res) => setMyTickets(res))
      .catch(() => setMyTickets([]));
  }, [projectFilter, featureFilter, departmentFilter, sortBy, sortDir]);

  const filteredFeatures = useMemo(() => {
    if (projectFilter === 'all') return [];
    return features.filter((feature) => feature.projectId === projectFilter);
  }, [features, projectFilter]);

  useEffect(() => {
    if (projectFilter === 'all') {
      if (featureFilter !== 'all') setFeatureFilter('all');
      return;
    }
    if (featureFilter === 'all') return;
    if (filteredFeatures.some((f) => f.id === featureFilter)) return;
    setFeatureFilter('all');
  }, [filteredFeatures, featureFilter, projectFilter]);

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold">For You</h1>
      <p className="text-sm text-muted-foreground">Tickets assigned to you ({myTickets.length})</p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          <option value="all">All Projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
        <select
          value={featureFilter}
          onChange={(e) => setFeatureFilter(e.target.value)}
          className="h-8 rounded-md border bg-background px-2 text-xs"
          disabled={projectFilter === 'all'}
        >
          <option value="all">{projectFilter === 'all' ? 'Select project for features' : 'All Features'}</option>
          {filteredFeatures.map((feature) => (
            <option key={`${feature.projectId}-${feature.id}`} value={feature.id}>
              {feature.name}
            </option>
          ))}
        </select>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value as Department | 'all')}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          <option value="updatedAt">Sort: Updated</option>
          <option value="createdAt">Sort: Created</option>
          <option value="projectId">Sort: Project</option>
          <option value="department">Sort: Department</option>
          <option value="featureId">Sort: Feature</option>
        </select>
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
          className="h-8 rounded-md border bg-background px-2 text-xs"
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>
      <div className="space-y-2">
        {myTickets.map((ticket) => (
          <button
            key={ticket.id}
            onClick={() => setSelectedTicket(ticket)}
            className="w-full flex items-center gap-3 bg-card border rounded-lg p-3 hover:shadow-md transition-all text-left"
          >
            <TypeIcon type={ticket.type} />
            <span className="font-mono text-xs text-muted-foreground">{ticket.id}</span>
            <span className="text-sm font-medium flex-1 truncate">{ticket.title}</span>
            <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {ticket.projectId}
            </span>
            {ticket.featureName && (
              <span className="inline-flex items-center rounded-full border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                {ticket.featureName}
              </span>
            )}
            <DeptBadge department={ticket.department} />
            <PriorityIcon priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </button>
        ))}
        {myTickets.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">No tickets assigned to you.</p>}
      </div>
    </div>
  );
};

export default ForYouPage;

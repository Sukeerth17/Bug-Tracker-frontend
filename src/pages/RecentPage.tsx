import React, { useEffect, useMemo, useState } from 'react';
import { useTickets } from '@/contexts/TicketContext';
import { StatusBadge, TypeIcon, DeptBadge } from '@/components/TicketBadges';
import { formatDistanceToNow } from 'date-fns';
import { Ticket, Department, departments, TicketType, User } from '@/data/models';
import { ticketApi } from '@/services/ticketApi';
import { projectApi, ProjectItem } from '@/services/projectApi';
import { featureApi, FeatureItem } from '@/services/featureApi';
import { useSearchParams } from 'react-router-dom';
import TypeFilterPopover from '@/components/TypeFilterPopover';
import AssigneeFilterPopover from '@/components/AssigneeFilterPopover';
import TerraformFilterSelect from '@/components/TerraformFilterSelect';

const RecentPage = () => {
  const { setSelectedTicket } = useTickets();
  const [searchParams, setSearchParams] = useSearchParams();
  const [recent, setRecent] = useState<Ticket[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [featureFilter, setFeatureFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<TicketType[]>(searchParams.get('types')?.split(',').filter(Boolean) as TicketType[] || []);
  const [terraformFilter, setTerraformFilter] = useState<string>(searchParams.get('terraform') || 'all');
  const [terraformOptions, setTerraformOptions] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<{ assigneeIds: string[]; unassigned: boolean }>({
    assigneeIds: searchParams.get('assigneeIds')?.split(',').filter(Boolean) || [],
    unassigned: searchParams.get('unassigned') === 'true',
  });
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
    const params: { projectId?: string; featureId?: string; department?: string; assigneeIds?: number[]; unassigned?: boolean; types?: TicketType[]; terraform?: string; sortBy?: string; sortDir?: string } = {
      sortBy,
      sortDir,
    };
    if (projectFilter !== 'all') params.projectId = projectFilter;
    if (featureFilter !== 'all') params.featureId = featureFilter;
    if (departmentFilter !== 'all') params.department = departmentFilter;
    if (typeFilter.length > 0) params.types = typeFilter;
    if (terraformFilter !== 'all') params.terraform = terraformFilter;
    if (assigneeFilter.assigneeIds.length > 0) params.assigneeIds = assigneeFilter.assigneeIds.map(Number);
    if (assigneeFilter.unassigned) params.unassigned = true;

    ticketApi.getRecent(params)
      .then((res) => setRecent(res))
      .catch(() => setRecent([]));
  }, [projectFilter, featureFilter, departmentFilter, typeFilter, terraformFilter, assigneeFilter, sortBy, sortDir]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (typeFilter.length > 0) next.set('types', typeFilter.join(','));
    else next.delete('types');
    if (assigneeFilter.assigneeIds.length > 0) next.set('assigneeIds', assigneeFilter.assigneeIds.join(','));
    else next.delete('assigneeIds');
    if (assigneeFilter.unassigned) next.set('unassigned', 'true');
    else next.delete('unassigned');
    if (terraformFilter !== 'all') next.set('terraform', terraformFilter);
    else next.delete('terraform');
    setSearchParams(next, { replace: true });
  }, [typeFilter, assigneeFilter, terraformFilter, searchParams, setSearchParams]);

  const filteredFeatures = useMemo(() => {
    if (projectFilter === 'all') return [];
    return features.filter((feature) => feature.projectId === projectFilter);
  }, [features, projectFilter]);

  useEffect(() => {
    const params: { projectId?: string; featureId?: string; department?: string; types?: TicketType[]; terraform?: string; sortBy?: string; sortDir?: string } = {
      sortBy,
      sortDir,
    };
    if (projectFilter !== 'all') params.projectId = projectFilter;
    if (featureFilter !== 'all') params.featureId = featureFilter;
    if (departmentFilter !== 'all') params.department = departmentFilter;
    if (typeFilter.length > 0) params.types = typeFilter;
    if (terraformFilter !== 'all') params.terraform = terraformFilter;

    ticketApi.getRecent(params)
      .then((rows) => {
        const users = new Map<string, User>();
        rows.forEach((ticket) => {
          ticket.assignees.forEach((assignee) => users.set(assignee.id, assignee));
        });
        setAvailableUsers(Array.from(users.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })));
      })
      .catch(() => setAvailableUsers([]));
  }, [projectFilter, featureFilter, departmentFilter, typeFilter, terraformFilter, sortBy, sortDir]);

  useEffect(() => {
    ticketApi.getTerraformOptions(projectFilter === 'all' ? undefined : projectFilter)
      .then(setTerraformOptions)
      .catch(() => setTerraformOptions([]));
  }, [projectFilter]);

  useEffect(() => {
    if (projectFilter === 'all') {
      if (featureFilter !== 'all') setFeatureFilter('all');
      return;
    }
    if (featureFilter === 'all') return;
    if (filteredFeatures.some((f) => f.id === featureFilter)) return;
    setFeatureFilter('all');
  }, [filteredFeatures, featureFilter, projectFilter]);

  const sortedRecent = useMemo(() => {
    const rows = [...recent];
    if (sortBy === 'updatedAt' || sortBy === 'createdAt') {
      rows.sort((a, b) => {
        const left = new Date(a[sortBy]).getTime();
        const right = new Date(b[sortBy]).getTime();
        return sortDir === 'asc' ? left - right : right - left;
      });
    }
    return rows;
  }, [recent, sortBy, sortDir]);

  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold">Recent</h1>
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
        <TypeFilterPopover value={typeFilter} onApply={setTypeFilter} />
        <TerraformFilterSelect value={terraformFilter} options={terraformOptions} onChange={setTerraformFilter} />
        <AssigneeFilterPopover users={availableUsers} value={assigneeFilter} onApply={setAssigneeFilter} />
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
          <option value="desc">Newest First</option>
          <option value="asc">Oldest First</option>
        </select>
      </div>
      <div className="space-y-2">
        {sortedRecent.map((ticket) => (
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
            <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}</span>
            <StatusBadge status={ticket.status} />
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentPage;

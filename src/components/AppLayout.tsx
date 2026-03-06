import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import TopHeader from '@/components/TopHeader';
import NewTicketModal from '@/components/NewTicketModal';
import TicketDetailPanel from '@/components/TicketDetailPanel';
import { cn } from '@/lib/utils';
import { TicketStatus } from '@/data/models';

const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newTicketDefaultStatus, setNewTicketDefaultStatus] = useState<TicketStatus>('todo');

  React.useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: TicketStatus }>).detail;
      setNewTicketDefaultStatus(detail?.status || 'todo');
      setNewTicketOpen(true);
    };
    window.addEventListener('ticket:new', handler);
    return () => window.removeEventListener('ticket:new', handler);
  }, []);

  const openNewTicket = (status: TicketStatus = 'todo') => {
    setNewTicketDefaultStatus(status);
    setNewTicketOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <TopHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewTicket={() => openNewTicket('todo')}
      />
      <main className={cn('transition-all duration-200', sidebarCollapsed ? 'ml-[60px]' : 'ml-[240px]')}>
        <Outlet />
      </main>
      <NewTicketModal open={newTicketOpen} onClose={() => setNewTicketOpen(false)} defaultStatus={newTicketDefaultStatus} />
      <TicketDetailPanel />
    </div>
  );
};

export default AppLayout;

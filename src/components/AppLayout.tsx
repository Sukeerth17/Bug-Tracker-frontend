import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from '@/components/AppSidebar';
import TopHeader from '@/components/TopHeader';
import NewTicketModal from '@/components/NewTicketModal';
import TicketDetailPanel from '@/components/TicketDetailPanel';
import { cn } from '@/lib/utils';

const AppLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newTicketOpen, setNewTicketOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
      <TopHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onNewTicket={() => setNewTicketOpen(true)}
      />
      <main className={cn('transition-all duration-200', sidebarCollapsed ? 'ml-[60px]' : 'ml-[240px]')}>
        <Outlet />
      </main>
      <NewTicketModal open={newTicketOpen} onClose={() => setNewTicketOpen(false)} />
      <TicketDetailPanel />
    </div>
  );
};

export default AppLayout;

import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Bell, X, User, Settings, LogOut } from 'lucide-react';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTickets } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, DeptBadge } from '@/components/TicketBadges';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface TopHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onNewTicket: () => void;
}

const TopHeader = ({ sidebarCollapsed, onToggleSidebar, onNewTicket }: TopHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tickets, setSelectedTicket, currentUser } = useTickets();
  const { logout } = useAuth();
  const parts = location.pathname.split('/');
  const currentProjectId = parts[1] === 'space' && parts[2] ? parts[2] : 'sp1';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [readNotificationKeys, setReadNotificationKeys] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const notificationStorageKey = `ticket.notifications.read.${currentUser.id}.${currentProjectId}`;

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search results: active tickets, or done only if exact ID match
  const searchResults = searchQuery.trim()
    ? tickets.filter(t => {
        const q = searchQuery.toLowerCase();
        const matchesQuery = t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
        if (!matchesQuery) return false;
        if (t.status === 'done') return t.id.toLowerCase() === q;
        return true;
      })
    : [];

  // For You tickets
  const myTickets = tickets.filter(t => t.assignee?.id === currentUser.id);
  const getNotificationKey = (ticketId: string, updatedAt: string) => `${ticketId}:${updatedAt}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(notificationStorageKey);
      if (!raw) {
        setReadNotificationKeys(new Set());
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      setReadNotificationKeys(new Set(Array.isArray(parsed) ? parsed : []));
    } catch {
      setReadNotificationKeys(new Set());
    }
  }, [notificationStorageKey]);

  useEffect(() => {
    localStorage.setItem(notificationStorageKey, JSON.stringify(Array.from(readNotificationKeys)));
  }, [notificationStorageKey, readNotificationKeys]);

  const unreadTickets = myTickets.filter((ticket) => !readNotificationKeys.has(getNotificationKey(ticket.id, ticket.updatedAt)));

  const markTicketNotificationRead = (ticketId: string, updatedAt: string) => {
    const key = getNotificationKey(ticketId, updatedAt);
    setReadNotificationKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  return (
    <header
      className={cn(
        'h-14 border-b bg-card flex items-center px-4 gap-4 sticky top-0 z-30 shadow-sm transition-all duration-200',
        sidebarCollapsed ? 'ml-[60px]' : 'ml-[240px]'
      )}
    >
      <button onClick={onToggleSidebar} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
        {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xl relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tickets…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            className="w-full h-9 pl-9 pr-16 rounded-lg bg-muted/60 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-background border rounded px-1.5 py-0.5">⌘K</kbd>
        </div>

        {searchOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-xl max-h-80 overflow-y-auto z-50">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No active tickets found.</p>
            ) : (
              searchResults.map(t => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTicket(t);
                    setSearchOpen(false);
                    setSearchQuery('');
                    navigate(`/space/${currentProjectId}/list`);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-accent/50 transition-colors text-left border-b last:border-b-0"
                >
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">{t.id}</span>
                  <span className="text-sm truncate flex-1">{t.title}</span>
                  <StatusBadge status={t.status} />
                  <DeptBadge department={t.department} />
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onNewTicket}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>

        {/* Notification bell */}
        <div className="relative" ref={notifRef}>
          <button onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }} className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
            <Bell className="h-5 w-5" />
            {unreadTickets.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">{unreadTickets.length}</span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-card border rounded-xl shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">For You</span>
                  <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">{unreadTickets.length}</span>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {unreadTickets.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No unread notifications.</p>
                ) : (
                  unreadTickets.map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        markTicketNotificationRead(t.id, t.updatedAt);
                        setSelectedTicket(t);
                        setNotifOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{t.id}</span>
                        <span className="text-sm font-medium truncate flex-1">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <DeptBadge department={t.department} />
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">Assigned to you</span>
                        <span className="text-[11px] text-muted-foreground">Updated {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: false })} ago</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="border-t px-4 py-2">
                <button onClick={() => { navigate('/for-you'); setNotifOpen(false); }} className="text-xs text-primary hover:underline">View all</button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setUserMenuOpen(!userMenuOpen); setNotifOpen(false); }}
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all"
          >
            {currentUser.avatar}
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border rounded-xl shadow-xl z-50 py-1">
              <div className="px-4 py-3 border-b">
                <p className="text-sm font-semibold">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              </div>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent/50 transition-colors">
                <User className="h-4 w-4 text-muted-foreground" />
                Profile Settings
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent/50 transition-colors">
                <Settings className="h-4 w-4 text-muted-foreground" />
                Preferences
              </button>
              <div className="border-t my-1" />
              <button
                onClick={() => { setUserMenuOpen(false); logout(); navigate('/login'); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;

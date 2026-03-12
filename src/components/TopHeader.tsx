import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, Bell, LogOut, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTickets } from '@/contexts/TicketContext';
import type { Ticket } from '@/data/models';
import { useAuth } from '@/contexts/AuthContext';
import { StatusBadge, DeptBadge } from '@/components/TicketBadges';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { notificationApi, NotificationItem } from '@/services/notificationApi';
import { ticketApi } from '@/services/ticketApi';
import ConfirmationModal from '@/components/ConfirmationModal';

interface TopHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onNewTicket: () => void;
}

const TopHeader = ({ sidebarCollapsed, onToggleSidebar, onNewTicket }: TopHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSelectedTicket, currentUser } = useTickets();
  const { logout } = useAuth();
  const parts = location.pathname.split('/');
  const currentProjectId = parts[1] === 'space' && parts[2] ? parts[2] : 'sp1';
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const isMac = useMemo(() => {
    if (typeof navigator === 'undefined') return false;
    return /Mac|iPhone|iPad/.test(navigator.platform);
  }, []);

  useEffect(() => {
    const openSearch = () => {
      setSearchOpen(true);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    };
    const handler = (e: KeyboardEvent) => {
      const key = e.key?.toLowerCase();
      const isShortcut = (e.metaKey || e.ctrlKey) && (key === 'k' || e.code === 'KeyK' || e.keyCode === 75);
      if (isShortcut) {
        e.preventDefault();
        e.stopPropagation();
        openSearch();
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setNotifOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handler, { capture: true });
    document.addEventListener('keydown', handler, { capture: true });
    return () => {
      window.removeEventListener('keydown', handler, true);
      document.removeEventListener('keydown', handler, true);
    };
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim() || !currentProjectId) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    const handler = setTimeout(() => {
      ticketApi.queryTickets(currentProjectId, {
        q: searchQuery.trim(),
        sortBy: 'updatedAt',
        sortDir: 'desc',
        page: 0,
        size: 20,
      })
        .then((res) => setSearchResults(res.items))
        .catch(() => setSearchResults([]))
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, currentProjectId]);

  useEffect(() => {
    Promise.all([
      notificationApi.getNotifications(0, 50),
      notificationApi.getUnreadCount(),
    ])
      .then(([rows, count]) => {
        setNotifications(rows);
        setUnreadCount(count);
      })
      .catch(() => {
        setNotifications([]);
        setUnreadCount(0);
      });
  }, [currentUser.id]);

  useEffect(() => {
    const stream = notificationApi.subscribe((incoming) => {
      setNotifications((prev) => [incoming, ...prev.filter((item) => item.id !== incoming.id)]);
      setUnreadCount((prev) => prev + (incoming.isRead ? 0 : 1));
    });
    return () => {
      stream?.close();
    };
  }, [currentUser.id]);

  const unreadNotifications = notifications.filter((item) => !item.isRead);

  const markNotificationRead = async (notificationId: number) => {
    const updated = await notificationApi.markRead(notificationId);
    setNotifications((prev) => prev.map((item) => item.id === notificationId ? updated : item));
    if (updated.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
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

      <div className="flex-1 min-w-0 max-w-xl relative" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            ref={searchInputRef}
            className="w-full h-9 pl-9 pr-16 rounded-lg bg-muted/60 border-0 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-background border rounded px-1.5 py-0.5">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </div>

        {searchOpen && searchQuery.trim() && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-xl max-h-80 overflow-y-auto z-50">
            {searchLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Searching...</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No results found.</p>
            ) : (
              searchResults.map((t) => (
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

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onNewTicket}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </button>

        <div className="relative" ref={notifRef}>
          <button onClick={() => { setNotifOpen(!notifOpen); setUserMenuOpen(false); }} className="relative p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-96 bg-card border rounded-xl shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">For You</span>
                  <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {unreadNotifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No unread notifications.</p>
                ) : (
                  unreadNotifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={async () => {
                        await markNotificationRead(notification.id);
                        if (notification.ticketId) {
                          try {
                            if (!currentProjectId) {
                              navigate('/for-you');
                              return;
                            }
                            const ticket = await ticketApi.getTicketById(currentProjectId, notification.ticketId);
                            setSelectedTicket(ticket);
                          } catch {
                            navigate('/for-you');
                          }
                        }
                        setNotifOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors border-b last:border-b-0"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{notification.ticketId || 'notice'}</span>
                        <span className="text-sm font-medium truncate flex-1">{notification.ticketTitle || 'Notification'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{notification.message}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground">{notification.eventType}</span>
                        <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}</span>
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
              <button
                onClick={() => { setUserMenuOpen(false); setLogoutConfirmOpen(true); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={logoutConfirmOpen}
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        confirmLabel="Yes, Logout"
        cancelLabel="Cancel"
        variant="warning"
        onConfirm={() => {
          setLogoutConfirmOpen(false);
          logout();
          navigate('/login');
        }}
        onCancel={() => setLogoutConfirmOpen(false)}
      />
    </header>
  );
};

export default TopHeader;

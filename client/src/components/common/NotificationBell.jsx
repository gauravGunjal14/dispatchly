'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Clock } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/AuthContext';

export default function NotificationBell() {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await apiClient('/notifications?limit=10');
      if (res.success && res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Quiet fail on network/auth transitions
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const socket = getSocket();
    if (socket && user?._id) {
      socket.emit('join:user', user._id);

      const handleNewNotification = (notif) => {
        setNotifications((prev) => [notif, ...prev.slice(0, 9)]);
        setUnreadCount((prev) => prev + 1);
      };

      socket.on('notification:new', handleNewNotification);

      return () => {
        socket.off('notification:new', handleNewNotification);
      };
    }
  }, [isAuthenticated, user?._id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiClient('/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ all: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const handleMarkSingleRead = async (id) => {
    try {
      await apiClient('/notifications/read', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-2 text-ink/70 hover:text-ink hover:bg-concrete rounded-control transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
        title="Notifications"
        aria-label="Open notifications"
      >
        <Bell className="w-5 h-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-ink bg-amber rounded-control">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-panel shadow-floating border border-line z-50 overflow-hidden">
          <div className="p-3.5 bg-concrete border-b border-line flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-ink">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-control text-[11px] font-bold bg-amber text-ink">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-ink/80 hover:text-ink transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-line">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-ink/60">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n._id}
                    onClick={() => handleMarkSingleRead(n._id)}
                    className={`p-3.5 hover:bg-concrete/60 cursor-pointer transition-colors flex items-start space-x-3 ${
                      isUnread ? 'bg-concrete/30' : 'bg-white'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 mt-1.5 rounded-control flex-shrink-0 ${
                        isUnread ? 'bg-amber' : 'bg-line'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-ink truncate">{n.title}</div>
                      <div className="text-xs text-ink/70 mt-0.5 leading-snug">{n.body}</div>
                      <div className="text-[11px] text-ink/50 mt-1 flex items-center space-x-1 tabular-nums">
                        <Clock className="w-3 h-3" strokeWidth={1.75} />
                        <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

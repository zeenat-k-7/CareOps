'use client';

import { useApp } from '@/context/AppContext';
import type { NavItem } from './AppShell';
import { Bell, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<NavItem, string> = {
  'admin-registry': 'Patient Registry',
  'admin-beds': 'Bed Board',
  'admin-staff': 'Staff & Discharge Management',
  'nurse-worklist': 'Daily Worklist',
  'doctor-worklist': 'My Patients',
  'management-dashboard': 'Performance Dashboard',
};

interface TopBarProps {
  activeNav: NavItem;
  onNav: (nav: NavItem) => void;
}

export default function TopBar({ activeNav, onNav: _ }: TopBarProps) {
  const { currentUser, notifications, markNotificationRead, clearNotifications } = useApp();
  const [showNotifs, setShowNotifs] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const [dateDisplay, setDateDisplay] = useState('Friday, 23 October 2026');

  useEffect(() => {
    try {
      setDateDisplay(
        new Date().toLocaleDateString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    } catch {
      // fallback
    }
  }, []);

  function notifIcon(type: string) {
    switch (type) {
      case 'error': return '🔴';
      case 'warning': return '🟡';
      case 'success': return '🟢';
      default: return '🔵';
    }
  }

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-slate-900">{PAGE_TITLES[activeNav]}</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {dateDisplay}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-xs text-slate-500 hover:text-slate-900"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-slate-400">No notifications</div>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={cn(
                        'px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50',
                        !n.read && 'bg-teal-50/50'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs mt-0.5">{notifIcon(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0 mt-1" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
          <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center">
            <span className="text-teal-700 text-xs font-bold">
              {currentUser?.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-900 truncate max-w-[120px]">{currentUser?.name}</p>
            <p className="text-[10px] text-teal-600 capitalize">{currentUser?.role}</p>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      {/* Overlay to close notification panel */}
      {showNotifs && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
      )}
    </header>
  );
}

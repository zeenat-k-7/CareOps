'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { DEMO_LOGIN_ROLES } from '@/lib/users';
import type { NavItem } from './AppShell';
import type { DemoUser } from '@/types';
import {
  Bell,
  ChevronDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Shield,
  HeartPulse,
  Stethoscope,
  BarChart3,
  X,
  User,
} from 'lucide-react';
import { formatDateTime, cn } from '@/lib/utils';

const PAGE_METADATA: Record<NavItem, { title: string; category: string; description: string }> = {
  'admin-registry': {
    title: 'Patient Registry',
    category: 'Admissions & Census',
    description: 'Central admissions registry and patient assignment controls',
  },
  'admin-beds': {
    title: 'Bed Board',
    category: 'Facility Operations',
    description: '74-bed visual capacity layout and bed turnover status',
  },
  'admin-staff': {
    title: 'Staff & Discharge Queue',
    category: 'Workflow Execution',
    description: 'Clinical staffing management and approved discharge execution',
  },
  'nurse-worklist': {
    title: 'Daily Nursing Worklist',
    category: 'Care Unit Shift',
    description: 'Scheduled patient vitals monitoring and temperature log',
  },
  'doctor-worklist': {
    title: 'Physician Worklist',
    category: 'Clinical Rounds',
    description: 'Acuity triage, diagnostic treatments, and discharge decisions',
  },
  'management-dashboard': {
    title: 'Performance & Quality Intelligence',
    category: 'Executive Oversight',
    description: 'Clinical outcomes, bed turnover, and 15% mortality benchmark tracking',
  },
};

interface TopBarProps {
  activeNav: NavItem;
  onNav: (nav: NavItem) => void;
}

export default function TopBar({ activeNav, onNav }: TopBarProps) {
  const { currentUser, login, notifications, markNotificationRead, clearNotifications } = useApp();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [dateDisplay, setDateDisplay] = useState('Friday, 23 October 2026');

  useEffect(() => {
    try {
      setDateDisplay(
        new Date().toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    } catch {
      // fallback
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const currentMeta = PAGE_METADATA[activeNav] || {
    title: 'Dashboard',
    category: 'Hospital Operations',
    description: 'Operations management',
  };

  function handleSwitchRole(user: DemoUser) {
    login(user);
    setShowRoleSwitcher(false);
    // Switch to default screen for that role
    if (user.role === 'admin') onNav('admin-registry');
    else if (user.role === 'nurse') onNav('nurse-worklist');
    else if (user.role === 'doctor') onNav('doctor-worklist');
    else if (user.role === 'management') onNav('management-dashboard');
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'admin': return Shield;
      case 'nurse': return HeartPulse;
      case 'doctor': return Stethoscope;
      case 'management': return BarChart3;
      default: return User;
    }
  }

  return (
    <header className="bg-white border-b border-slate-200/90 px-6 py-3.5 flex items-center justify-between flex-shrink-0 z-10">
      {/* Left: Breadcrumbs & Page Titles */}
      <div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
          <span>CareFlow</span>
          <span>/</span>
          <span className="text-slate-600">{currentMeta.category}</span>
        </div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight mt-0.5">
          {currentMeta.title}
        </h1>
      </div>

      {/* Right Action Cluster */}
      <div className="flex items-center gap-3">
        {/* Facility Context Indicator */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
          <Building2 className="w-3.5 h-3.5 text-teal-600" />
          <span>Quarantine Centre · <strong>74 Beds</strong></span>
        </div>

        {/* Live Date display */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-xl">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{dateDisplay}</span>
        </div>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="View notifications"
            className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Drawer */}
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-84 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[10px] font-bold rounded">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    No notifications right now
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={cn(
                        'p-3.5 text-xs cursor-pointer hover:bg-slate-50 transition-colors',
                        !n.read && 'bg-teal-50/40'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900">{n.title}</p>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-teal-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Instant Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-left shadow-2xs hover:shadow-xs transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60 font-bold text-xs flex items-center justify-center flex-shrink-0">
              {currentUser?.name.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-900 leading-none">{currentUser?.name}</p>
              <p className="text-[10px] text-teal-700 font-semibold capitalize mt-0.5">{currentUser?.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {showRoleSwitcher && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Switch Demo Persona
              </div>
              <div className="p-1.5 space-y-1">
                {DEMO_LOGIN_ROLES.map((user) => {
                  const Icon = getRoleIcon(user.role);
                  const isCurrent = user.id === currentUser?.id;
                  return (
                    <button
                      key={user.id}
                      onClick={() => handleSwitchRole(user)}
                      className={cn(
                        'w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-colors text-left',
                        isCurrent
                          ? 'bg-teal-50 text-teal-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center text-xs',
                          isCurrent ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                        )}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="leading-none">{user.name}</p>
                          <p className="text-[10px] text-slate-400 capitalize mt-0.5 font-normal">{user.role}</p>
                        </div>
                      </div>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mr-1" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside backdrop for drawers */}
      {(showNotifs || showRoleSwitcher) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setShowNotifs(false);
            setShowRoleSwitcher(false);
          }}
        />
      )}
    </header>
  );
}

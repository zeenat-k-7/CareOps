'use client';

import { useApp } from '@/context/AppContext';
import type { NavItem } from './AppShell';
import {
  Users,
  Bed,
  UserCog,
  ClipboardList,
  Stethoscope,
  BarChart2,
  Activity,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavConfig {
  id: NavItem;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const NAV_ITEMS: NavConfig[] = [
  { id: 'admin-registry', label: 'Patient Registry', icon: Users, roles: ['admin'] },
  { id: 'admin-beds', label: 'Bed Board', icon: Bed, roles: ['admin'] },
  { id: 'admin-staff', label: 'Staff & Discharge', icon: UserCog, roles: ['admin'] },
  { id: 'nurse-worklist', label: 'My Worklist', icon: ClipboardList, roles: ['nurse'] },
  { id: 'doctor-worklist', label: 'My Patients', icon: Stethoscope, roles: ['doctor'] },
  { id: 'management-dashboard', label: 'Dashboard', icon: BarChart2, roles: ['management'] },
];

interface SidebarProps {
  activeNav: NavItem;
  onNav: (nav: NavItem) => void;
}

export default function Sidebar({ activeNav, onNav }: SidebarProps) {
  const { currentUser, logout, resetDemo } = useApp();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const role = currentUser?.role || 'admin';
  const visibleNav = NAV_ITEMS.filter((n) => n.roles.includes(role));

  function handleReset() {
    if (!showResetConfirm) {
      setShowResetConfirm(true);
      return;
    }
    resetDemo();
    setShowResetConfirm(false);
  }

  return (
    <aside className="w-60 flex-shrink-0 bg-slate-900 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-slate-700">
        <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Activity className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">CareFlow</p>
          <p className="text-slate-400 text-xs">74-Bed Facility</p>
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-slate-700">
        <div className="bg-slate-800 rounded-lg px-3 py-2.5">
          <p className="text-white text-sm font-medium truncate">{currentUser?.name}</p>
          <p className="text-teal-400 text-xs capitalize mt-0.5">{currentUser?.role}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNav(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
              activeNav === id
                ? 'bg-teal-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            )}
          >
            <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 17, height: 17 }} />
            {label}
          </button>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="px-3 py-4 border-t border-slate-700 space-y-1">
        {showResetConfirm ? (
          <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 mb-2">
            <p className="text-red-300 text-xs mb-2">Reset all demo data? This cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="flex-1 text-xs bg-red-600 text-white rounded py-1 hover:bg-red-700"
              >
                Reset
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 text-xs bg-slate-700 text-slate-300 rounded py-1 hover:bg-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-4 h-4 flex-shrink-0" />
            Reset demo data
          </button>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Switch role
        </button>
      </div>
    </aside>
  );
}

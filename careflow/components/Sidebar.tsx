'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { NavItem } from './AppShell';
import {
  Users,
  Bed,
  UserCheck,
  ClipboardList,
  Stethoscope,
  BarChart3,
  Activity,
  LogOut,
  RotateCcw,
  Building2,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavConfig {
  id: NavItem;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const NAV_ITEMS: NavConfig[] = [
  {
    id: 'admin-registry',
    label: 'Patient Registry',
    sublabel: 'Admissions & records',
    icon: Users,
    roles: ['admin'],
  },
  {
    id: 'admin-beds',
    label: 'Bed Board',
    sublabel: '74-bed capacity matrix',
    icon: Bed,
    roles: ['admin'],
  },
  {
    id: 'admin-staff',
    label: 'Staff & Discharges',
    sublabel: 'Staffing & discharge queue',
    icon: UserCheck,
    roles: ['admin'],
  },
  {
    id: 'nurse-worklist',
    label: 'Daily Worklist',
    sublabel: 'Scheduled vitals & temps',
    icon: ClipboardList,
    roles: ['nurse'],
  },
  {
    id: 'doctor-worklist',
    label: 'My Patients',
    sublabel: 'Rounds, treatments & triage',
    icon: Stethoscope,
    roles: ['doctor'],
  },
  {
    id: 'management-dashboard',
    label: 'Executive Analytics',
    sublabel: 'KPIs & mortality benchmark',
    icon: BarChart3,
    roles: ['management'],
  },
];

interface SidebarProps {
  activeNav: NavItem;
  onNav: (nav: NavItem) => void;
}

export default function Sidebar({ activeNav, onNav }: SidebarProps) {
  const { currentUser, logout, resetDemo, state } = useApp();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const role = currentUser?.role || 'admin';
  const visibleNav = NAV_ITEMS.filter((n) => n.roles.includes(role));

  // Count helper badges
  const approvedDischargesCount = state.patients.filter((p) => p.status === 'discharge_approved').length;
  const criticalPatientsCount = state.patients.filter((p) => {
    // Check if critical
    const eff = state.temperatureReadings.filter(r => r.patientId === p.id).pop();
    return eff && eff.value >= 39.5 && p.status !== 'discharged' && p.status !== 'death_confirmed';
  }).length;

  function handleReset() {
    resetDemo();
    setShowResetConfirm(false);
  }

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-20">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-2xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-slate-900 tracking-tight">CareFlow</span>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-teal-50 text-teal-700 border border-teal-200 rounded">
                OPS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">74-Bed Viral Quarantine</p>
          </div>
        </div>
      </div>

      {/* Current User Persona Card */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-teal-200">
            {currentUser?.name.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate">{currentUser?.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              <span className="text-[10px] text-slate-500 capitalize font-medium">{currentUser?.role} Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Main Navigation
        </div>

        {visibleNav.map(({ id, label, sublabel, icon: Icon }) => {
          const isActive = activeNav === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group text-left',
                isActive
                  ? 'bg-teal-50 text-teal-900 border border-teal-200/80 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                  )}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs leading-none truncate">{label}</p>
                  <p className="text-[10px] text-slate-400 mt-1 truncate">{sublabel}</p>
                </div>
              </div>

              {/* Contextual notification badge in sidebar */}
              {id === 'admin-staff' && approvedDischargesCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-teal-600 text-white rounded-full">
                  {approvedDischargesCount}
                </span>
              )}

              {id === 'doctor-worklist' && criticalPatientsCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-600 text-white rounded-full animate-pulse">
                  {criticalPatientsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Facility Summary Strip */}
      <div className="px-4 py-3 mx-3 mb-2 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] space-y-1">
        <div className="flex items-center justify-between text-slate-500">
          <span>Facility Beds:</span>
          <span className="font-semibold text-slate-800">74 Total</span>
        </div>
        <div className="flex items-center justify-between text-slate-500">
          <span>Status:</span>
          <span className="font-semibold text-emerald-700 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
          </span>
        </div>
      </div>

      {/* Footer Controls: Reset & Switch Role */}
      <div className="p-3 border-t border-slate-200/80 bg-slate-50/50 space-y-1.5">
        {showResetConfirm ? (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-2">
            <p className="font-bold text-red-900 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Reset Demo State?
            </p>
            <p className="text-[11px] text-red-700 leading-tight">
              Restores synthetic seed data and clears browser changes.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 py-1 px-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg text-[11px]"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-1 px-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-[11px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset Demo Data</span>
          </button>
        )}

        <button
          onClick={logout}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <LogOut className="w-3.5 h-3.5" />
            <span>Switch Role</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 opacity-50" />
        </button>
      </div>
    </aside>
  );
}

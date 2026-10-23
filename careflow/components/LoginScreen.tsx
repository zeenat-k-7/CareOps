'use client';

import { useApp } from '@/context/AppContext';
import { DEMO_LOGIN_ROLES } from '@/lib/users';
import type { DemoUser } from '@/types';
import { Shield, Stethoscope, Heart, BarChart2, Activity } from 'lucide-react';

const ROLE_CONFIG = {
  admin: {
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-50 hover:border-blue-400',
    description: 'Patient registry, bed management, staff administration, discharge execution',
  },
  nurse: {
    icon: Heart,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    hover: 'hover:bg-rose-50 hover:border-rose-400',
    description: 'Daily temperature recording, patient worklist, treatment plan view',
  },
  doctor: {
    icon: Stethoscope,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    hover: 'hover:bg-teal-50 hover:border-teal-400',
    description: 'Patient assessment, visits, treatments, discharge approval, death declaration',
  },
  management: {
    icon: BarChart2,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-50 hover:border-purple-400',
    description: 'Performance metrics, bed occupancy, mortality tracking, trend analysis',
  },
};

export default function LoginScreen() {
  const { login } = useApp();

  function handleLogin(user: DemoUser) {
    login(user);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center">
              <Activity className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">CareFlow</h1>
          </div>
          <p className="text-slate-300 text-lg">Hospital Operations & Patient Workflow Management</p>
          <p className="text-slate-400 text-sm mt-1">Virus Quarantine and Treatment Centre · 74 Beds</p>
          
          {/* Demo badge */}
          <div className="inline-flex items-center gap-2 mt-4 px-4 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-full">
            <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            <span className="text-amber-300 text-xs font-medium uppercase tracking-wider">Demo Environment</span>
          </div>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DEMO_LOGIN_ROLES.map((user) => {
            const cfg = ROLE_CONFIG[user.role];
            const Icon = cfg.icon;
            return (
              <button
                key={user.id}
                onClick={() => handleLogin(user)}
                className={`
                  group relative bg-white rounded-2xl border-2 border-slate-200 p-6 text-left
                  transition-all duration-200 cursor-pointer
                  hover:scale-[1.02] hover:shadow-xl hover:border-teal-400
                  focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-slate-900
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-6 h-6 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-slate-900">{user.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} capitalize`}>
                        {user.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{cfg.description}</p>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-teal-400 to-teal-600 rounded-b-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-xs">
            This is a frontend-only prototype for assessment purposes. Data is stored locally in your browser.
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Real server-side authentication, secure sessions, and clinical data protection are outside the scope of this prototype.
          </p>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useApp } from '@/context/AppContext';
import { DEMO_LOGIN_ROLES } from '@/lib/users';
import type { DemoUser } from '@/types';
import {
  Shield,
  HeartPulse,
  Stethoscope,
  BarChart3,
  Activity,
  ArrowRight,
  Building2,
  Lock,
} from 'lucide-react';

interface RoleCardConfig {
  role: 'admin' | 'nurse' | 'doctor' | 'management';
  title: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  iconBg: string;
  hoverBorder: string;
  description: string;
  responsibilities: string[];
  actionLabel: string;
}

const ROLE_METADATA: Record<string, RoleCardConfig> = {
  admin: {
    role: 'admin',
    title: 'Hospital Administrator',
    badge: 'Operations & Admissions',
    icon: Shield,
    accentColor: 'text-blue-600',
    iconBg: 'bg-blue-50 text-blue-700 border-blue-100',
    hoverBorder: 'hover:border-blue-400 focus-visible:ring-blue-500',
    description: 'Central admissions desk, 74-bed capacity allocation, medical staff scheduling, and final discharge execution.',
    responsibilities: [
      'Patient registration & bed assignment',
      '74-bed visual capacity board',
      'Staff activation & discharge execution',
    ],
    actionLabel: 'Enter as Admin',
  },
  nurse: {
    role: 'nurse',
    title: 'Ward Staff Nurse',
    badge: 'Nursing Care Unit',
    icon: HeartPulse,
    accentColor: 'text-rose-600',
    iconBg: 'bg-rose-50 text-rose-700 border-rose-100',
    hoverBorder: 'hover:border-rose-400 focus-visible:ring-rose-500',
    description: 'Patient vitals routine, mandatory daily temperature monitoring, shift progress tracking, and read-only care plans.',
    responsibilities: [
      'Daily scheduled temperature recording',
      'Shift progress & overdue time alerts',
      'Fever streak reset notifications',
    ],
    actionLabel: 'Enter as Nurse',
  },
  doctor: {
    role: 'doctor',
    title: 'Attending Physician',
    badge: 'Clinical Care & Triage',
    icon: Stethoscope,
    accentColor: 'text-teal-600',
    iconBg: 'bg-teal-50 text-teal-700 border-teal-100',
    hoverBorder: 'hover:border-teal-400 focus-visible:ring-teal-500',
    description: 'Acuity-based patient triage, daily rounds, treatment regimens, biological discharge approval, and death declarations.',
    responsibilities: [
      'Critical fever triage (6-tier priority)',
      'Clinical trajectory charts & treatments',
      '3-day fever-free discharge approvals',
    ],
    actionLabel: 'Enter as Doctor',
  },
  management: {
    role: 'management',
    title: 'Clinical Director',
    badge: 'Executive Oversight',
    icon: BarChart3,
    accentColor: 'text-purple-600',
    iconBg: 'bg-purple-50 text-purple-700 border-purple-100',
    hoverBorder: 'hover:border-purple-400 focus-visible:ring-purple-500',
    description: 'Facility-wide performance intelligence, bed turnover rates, protocol adherence, and 15% mortality benchmark audits.',
    responsibilities: [
      'Mortality benchmark (15%) monitoring',
      'Discharge lag & operational bottlenecks',
      'Temperature & doctor visit coverage',
    ],
    actionLabel: 'Enter as Management',
  },
};

export default function LoginScreen() {
  const { login } = useApp();

  function handleSelectRole(user: DemoUser) {
    login(user);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between p-4 sm:p-8">
      {/* Top Banner Navigation */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-xs">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">CareFlow</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200/60 rounded-md">
                v1.0 SaaS
              </span>
            </div>
            <p className="text-xs text-slate-500">Hospital Operations & Workflow Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Facility Capacity: <strong>74 Beds</strong></span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            DEMO ENVIRONMENT
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto py-8 sm:py-12 flex-1 flex flex-col justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 text-xs font-medium mb-3">
            <span>Viral Quarantine & Treatment Centre</span>
            <span>·</span>
            <span>74 Beds</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Hospital operations, coordinated.
          </h1>
          <p className="text-slate-600 text-sm sm:text-base mt-3 leading-relaxed">
            Eliminate missed temperatures, early visits, and delayed discharges with an integrated daily patient board tailored for clinical and administrative collaboration.
          </p>
        </div>

        {/* 4 Role Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {DEMO_LOGIN_ROLES.map((user) => {
            const meta = ROLE_METADATA[user.role];
            const Icon = meta.icon;

            return (
              <div
                key={user.id}
                onClick={() => handleSelectRole(user)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectRole(user);
                  }
                }}
                className={`
                  group relative bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7
                  text-left cursor-pointer transition-all duration-200 flex flex-col justify-between
                  hover:shadow-md hover:border-slate-300 focus:outline-none focus-visible:ring-2
                  ${meta.hoverBorder}
                `}
              >
                <div>
                  {/* Top row: Role Icon & Badge */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-md">
                      {meta.badge}
                    </span>
                  </div>

                  {/* Persona Identity & Role Title */}
                  <div className="mb-2">
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {meta.title}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      Demo User: <strong className="text-slate-800">{user.name}</strong>
                    </p>
                  </div>

                  {/* Summary Description */}
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {meta.description}
                  </p>

                  {/* Responsibilities list */}
                  <div className="space-y-1.5 pt-3 border-t border-slate-100 mb-5">
                    {meta.responsibilities.map((resp, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-teal-500 transition-colors" />
                        <span>{resp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Call To Action Button Strip */}
                <div className="pt-2">
                  <div className="w-full py-2.5 px-4 rounded-xl bg-slate-50 border border-slate-200/80 group-hover:bg-teal-600 group-hover:border-teal-600 group-hover:text-white transition-all flex items-center justify-between text-xs font-semibold text-slate-700 shadow-2xs">
                    <span>{meta.actionLabel}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-slate-200/80 text-center text-xs text-slate-500 space-y-1">
        <p className="flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>CareFlow Technical Product Manager Assessment Prototype</span>
          <span>·</span>
          <span>Client-side local persistence (`localStorage`)</span>
        </p>
        <p className="text-[11px] text-slate-400">
          Synthetic patient and clinical records for evaluation. No real Protected Health Information (PHI) is processed.
        </p>
      </footer>
    </div>
  );
}

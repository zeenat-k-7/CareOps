'use client';

import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import AdminPatientRegistry from './admin/AdminPatientRegistry';
import AdminBedBoard from './admin/AdminBedBoard';
import AdminStaffAndDischarge from './admin/AdminStaffAndDischarge';
import NurseWorklist from './nurse/NurseWorklist';
import DoctorWorklist from './doctor/DoctorWorklist';
import ManagementDashboard from './management/ManagementDashboard';

export type NavItem =
  | 'admin-registry'
  | 'admin-beds'
  | 'admin-staff'
  | 'nurse-worklist'
  | 'doctor-worklist'
  | 'management-dashboard';

function getDefaultNav(role: string): NavItem {
  switch (role) {
    case 'admin': return 'admin-registry';
    case 'nurse': return 'nurse-worklist';
    case 'doctor': return 'doctor-worklist';
    case 'management': return 'management-dashboard';
    default: return 'admin-registry';
  }
}

export default function AppShell() {
  const { currentUser } = useApp();
  const [activeNav, setActiveNav] = useState<NavItem>(
    getDefaultNav(currentUser?.role || 'admin')
  );

  function renderContent() {
    switch (activeNav) {
      case 'admin-registry': return <AdminPatientRegistry />;
      case 'admin-beds': return <AdminBedBoard />;
      case 'admin-staff': return <AdminStaffAndDischarge />;
      case 'nurse-worklist': return <NurseWorklist />;
      case 'doctor-worklist': return <DoctorWorklist />;
      case 'management-dashboard': return <ManagementDashboard />;
      default: return null;
    }
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activeNav={activeNav} onNav={setActiveNav} />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar activeNav={activeNav} onNav={setActiveNav} />
        <main className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

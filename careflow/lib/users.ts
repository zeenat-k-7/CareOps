// ============================================================
// CareFlow — Demo User Definitions
// ============================================================

import type { DemoUser } from '@/types';

export const DEMO_USERS: DemoUser[] = [
  {
    id: 'USR-ADMIN-001',
    name: 'Aditi Sharma',
    role: 'admin',
  },
  {
    id: 'USR-NURSE-001',
    name: 'Priya Nair',
    role: 'nurse',
    staffId: 'STF-NURSE-001',
  },
  {
    id: 'USR-NURSE-002',
    name: 'Divya Menon',
    role: 'nurse',
    staffId: 'STF-NURSE-002',
  },
  {
    id: 'USR-NURSE-003',
    name: 'Rekha Pillai',
    role: 'nurse',
    staffId: 'STF-NURSE-003',
  },
  {
    id: 'USR-DOC-001',
    name: 'Dr. Arjun Mehta',
    role: 'doctor',
    staffId: 'STF-DOC-001',
  },
  {
    id: 'USR-DOC-002',
    name: 'Dr. Sneha Iyer',
    role: 'doctor',
    staffId: 'STF-DOC-002',
  },
  {
    id: 'USR-DOC-003',
    name: 'Dr. Kiran Rao',
    role: 'doctor',
    staffId: 'STF-DOC-003',
  },
  {
    id: 'USR-MGMT-001',
    name: 'Kavya Rao',
    role: 'management',
  },
];

// The 4 demo login options shown on the login screen
export const DEMO_LOGIN_ROLES: DemoUser[] = [
  DEMO_USERS.find((u) => u.id === 'USR-ADMIN-001')!,
  DEMO_USERS.find((u) => u.id === 'USR-NURSE-001')!,
  DEMO_USERS.find((u) => u.id === 'USR-DOC-001')!,
  DEMO_USERS.find((u) => u.id === 'USR-MGMT-001')!,
];

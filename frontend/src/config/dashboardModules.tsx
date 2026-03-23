import React from 'react';
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  CalendarDaysIcon, // Corrected import
  ShoppingCartIcon,
  CameraIcon,
  CurrencyDollarIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
// import { UserRole } from '../types'; // Assuming UserRole type is defined here or adjust path

// Define UserRole type here until it's properly exported from a central types file
export type UserRole = 'admin' | 'doctor' | 'nurse' | 'lab' | 'imaging' | 'reception' | 'finance' | 'pharmacy' | 'patient';

interface DashboardModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  requiredRoles: UserRole[]; // Roles allowed to see this module
}

// Define modules based on previous hardcoded cards and router paths/roles
export const adminDashboardModules: DashboardModule[] = [
  {
    id: 'clinics',
    title: 'Clinic Management',
    description: 'Create clinics and assign clinic admins',
    icon: <BuildingOffice2Icon className="h-8 w-8" />,
    path: '/app/clinics',
    color: 'blue',
    requiredRoles: ['admin'],
  },
  {
    id: 'facility',
    title: 'Facility Management',
    description: 'Manage buildings, rooms, and equipment',
    icon: <BuildingOffice2Icon className="h-8 w-8" />,
    path: '/app/facility',
    color: 'green',
    requiredRoles: ['admin'],
  },
  {
    id: 'patient-services',
    title: 'Patient Services',
    description: 'Manage patient records and services',
    icon: <UserGroupIcon className="h-8 w-8" />,
    path: '/app/patient-services',
    color: 'teal',
    requiredRoles: ['admin', 'doctor', 'nurse', 'lab', 'imaging', 'reception', 'finance'],
  },
  {
    id: 'appointments',
    title: 'Appointments',
    description: 'Manage and schedule appointments',
    icon: <CalendarDaysIcon className="h-8 w-8" />,
    path: '/app/appointments',
    color: 'blue',
     // Define roles - Check router.tsx for actual roles for /appointments
    requiredRoles: ['admin', 'doctor', 'nurse', 'reception'], // Example roles
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy',
    description: 'Manage pharmacy inventory and prescriptions',
    icon: <ShoppingCartIcon className="h-8 w-8" />,
    path: '/app/pharmacy',
    color: 'emerald',
    requiredRoles: ['admin', 'pharmacy'],
  },
  {
    id: 'imaging',
    title: 'Imaging',
    description: 'Manage imaging services and reports',
    icon: <CameraIcon className="h-8 w-8" />,
    path: '/app/imaging',
    color: 'purple',
    requiredRoles: ['admin', 'imaging'],
  },
  {
    id: 'finance',
    title: 'Finance',
    description: 'Manage billing and financial reports',
    icon: <CurrencyDollarIcon className="h-8 w-8" />,
    path: '/app/billing',
    color: 'yellow',
    requiredRoles: ['admin', 'finance', 'reception'],
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'View and generate system reports',
    icon: <ChartBarIcon className="h-8 w-8" />,
    path: '/app/reports',
    color: 'indigo',
    requiredRoles: ['admin', 'doctor', 'nurse', 'reception'], // Roles from router
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure system settings and preferences',
    icon: <Cog6ToothIcon className="h-8 w-8" />,
    path: '/app/settings',
    color: 'gray',
    requiredRoles: ['admin'],
  },
  {
    id: 'lab',
    title: 'Laboratory',
    description: 'Manage lab orders and results',
    icon: <BeakerIcon className="h-8 w-8" />,
    path: '/app/lab',
    color: 'cyan',
    requiredRoles: ['admin', 'lab', 'doctor', 'nurse'],
  },
  // Add Staff Management Module
  {
    id: 'staff-management',
    title: 'Staff Management',
    description: 'Add, view, and manage staff users',
    icon: <UserGroupIcon className="h-8 w-8" />, // Reusing UserGroupIcon
    path: '/app/staff-management',
    color: 'pink', // Example color
    requiredRoles: ['admin'], // Only admin can manage staff
  },
  // Add other potential modules if needed
];

// You might need to define or import UserRole type, e.g.:
// export type UserRole = 'admin' | 'doctor' | 'nurse' | 'lab' | 'imaging' | 'reception' | 'finance' | 'pharmacy' | 'patient'; 
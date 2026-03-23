export interface User {
  _id: string;
  id: string;
  /** Tenant slug stored on the user (e.g. default, clinic) */
  clinicId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email: string;
  role: string;
  department?: string;
  specialization?: string;
  contactNumber?: string;
  phone?: string;
  address?: string;
  profileImage?: string;
  // Compat fields used across UI components
  photo?: string;
  permissions?: {
    manageBilling?: boolean;
    [key: string]: boolean | undefined;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Doctor extends User {
  specialization: string;
  department: string;
}

export interface Nurse extends User {
  department: string;
  firstName: string;
  lastName: string;
} 
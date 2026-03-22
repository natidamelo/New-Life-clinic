export interface Doctor {
  _id: string;
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  specialization: string;
  phoneNumber?: string;
  phone?: string;
  contactNumber?: string;
  address?: string;
  profileImage?: string;
  createdAt?: string;
  updatedAt?: string;
} 
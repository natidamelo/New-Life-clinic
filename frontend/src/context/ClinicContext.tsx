import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../services/apiService';
import { useAuth } from './AuthContext';

export interface ClinicBranding {
  name: string;
  slug: string;
  logo: string | null;
  fullName: string;
  tagline: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
  licenseNumber?: string;
}

interface ClinicContextType {
  clinic: ClinicBranding | null;
  isLoading: boolean;
  refreshClinic: () => Promise<void>;
  updateClinicState: (data: Partial<ClinicBranding>) => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

const DEFAULT_BRANDING: ClinicBranding = {
  name: 'New Life Clinic',
  slug: 'default',
  logo: null,
  fullName: 'New Life Medium Clinic PLC',
  tagline: 'Your Health, Our Commitment',
  address: 'Addis Ababa, Ethiopia',
  contactEmail: 'info@newlifeclinic.com',
  contactPhone: '+251911000000',
  licenseNumber: '0000/2016'
};

export const ClinicProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [clinic, setClinic] = useState<ClinicBranding | null>(() => {
    try {
      const stored = localStorage.getItem('clinic_branding_data');
      return stored ? JSON.parse(stored) : DEFAULT_BRANDING;
    } catch {
      return DEFAULT_BRANDING;
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchClinicProfile = async (slug: string) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/api/clinics/${slug}/profile`, { skipAuth: true } as any);
      if (response.data?.success && response.data?.data) {
        const data = response.data.data;
        setClinic(data);
        localStorage.setItem('clinic_branding_data', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error fetching clinic branding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshClinic = async () => {
    const slug = user?.clinicId || clinic?.slug || 'default';
    if (slug) {
      await fetchClinicProfile(slug);
    }
  };

  const updateClinicState = (data: Partial<ClinicBranding>) => {
    setClinic((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      localStorage.setItem('clinic_branding_data', JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    const slug = user?.clinicId;
    if (slug && slug !== clinic?.slug) {
      fetchClinicProfile(slug);
    }
  }, [user?.clinicId]);

  return (
    <ClinicContext.Provider value={{ clinic, isLoading, refreshClinic, updateClinicState }}>
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (context === undefined) {
    throw new Error('useClinic must be used within a ClinicProvider');
  }
  return context;
};

export default ClinicContext;

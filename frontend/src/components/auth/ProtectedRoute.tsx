import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  role?: 'doctor' | 'nurse' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const { user, isAuthenticated } = useAuth();

  console.log('[ProtectedRoute] Checking access...');
  console.log('[ProtectedRoute] User:', user);
  console.log('[ProtectedRoute] Is authenticated:', isAuthenticated);

  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to login');
    return <Navigate to="/login" />;
  }

  // If no specific role is required, allow access
  if (!role) {
    console.log('[ProtectedRoute] No role required, access granted');
    return <>{children}</>;
  }

  // Check if user has the required role
  if (user?.role !== role) {
    console.log(`[ProtectedRoute] User role (${user?.role}) doesn't match required role (${role})`);
    // Redirect to appropriate dashboard or home based on role
    switch (user?.role) {
      case 'doctor':
        return <Navigate to="/doctor" />;
      case 'nurse':
        return <Navigate to="/nurse" />;
      case 'admin':
        return <Navigate to="/admin" />;
      default:
        return <Navigate to="/" />;
    }
  }

  console.log('[ProtectedRoute] Access granted');
  return <>{children}</>;
};

export default ProtectedRoute; 
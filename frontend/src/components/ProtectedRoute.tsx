import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading, getRoleBasedRoute } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.role) {
    return <div>Loading user data...</div>;
  }

  const effectiveUserRole = user.role === 'super_admin' ? 'admin' : user.role;

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(effectiveUserRole)) {
    const correctRoute = getRoleBasedRoute(effectiveUserRole);
    return <Navigate to={correctRoute} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute; 
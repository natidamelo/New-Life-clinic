import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, isLoading, getRoleBasedRoute } = useAuth();

  console.log('[ProtectedRoute] Checking access...');

  if (isLoading) {
    console.log('[ProtectedRoute] Loading authentication...');
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    console.log('[ProtectedRoute] Not authenticated or no user data, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Extra safety check - if user exists but role is missing, wait for it to load
  if (!user.role) {
    console.log('[ProtectedRoute] User exists but role is missing, waiting...');
    return <div>Loading user data...</div>;
  }

  const effectiveUserRole = user.role === 'super_admin' ? 'admin' : user.role;

  // If there are specific roles allowed and user's role is not in that list, redirect
  if (allowedRoles.length > 0 && user && !allowedRoles.includes(effectiveUserRole)) {
    console.log(`[ProtectedRoute] User role '${user.role}' not allowed for this route. Allowed roles: ${allowedRoles.join(', ')}. Redirecting to role-based route.`);
    

    // Get the correct route based on the user's actual role
    const correctRoute = getRoleBasedRoute(effectiveUserRole);
    console.log(`[ProtectedRoute] Redirecting to: ${correctRoute}`);
    return <Navigate to={correctRoute} replace />;
  }

  console.log('[ProtectedRoute] Access granted');
  return <>{children}</>;
};

export default ProtectedRoute; 
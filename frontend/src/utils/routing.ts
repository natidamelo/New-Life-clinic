/**
 * Check if a user is admin (by role, email, or username)
 */
export const isAdminUser = (user: { role?: string; email?: string; username?: string } | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'admin' ||
         user.role === 'super_admin' ||
         (user.email && user.email.toLowerCase().includes('admin')) ||
         (user.username && user.username.toLowerCase().includes('admin'));
};

/**
 * Get the route based on user role, with special handling for admin users
 */
export const getRoleBasedRoute = (role: string, user?: { role?: string; email?: string; username?: string } | null): string => {
  // If user object is provided, check if they're admin by email/username
  if (user && isAdminUser(user)) {
    return '/app/dashboard';
  }
  
  switch (role) {
    case 'super_admin':
      return '/app/dashboard';
    case 'doctor':
      return '/app/doctor';
    case 'nurse':
      return '/app/ward';
    case 'receptionist': // Database role
      return '/app/reception';
    case 'admin':
      return '/app/dashboard';
    case 'lab_technician': // Database role
      return '/app/lab';
    case 'lab': // Legacy role in database
      return '/app/lab';
    case 'imaging': // Legacy role in database
      return '/app/imaging/dashboard';
    case 'pharmacist':
      return '/app/pharmacy';
    case 'cashier':
      return '/app/billing';
    // Handle legacy role names for backward compatibility
    case 'reception':
      return '/app/reception';
    default:
      return '/app/dashboard'; // Default to admin dashboard
  }
}; 
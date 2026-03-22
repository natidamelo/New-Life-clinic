import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      // Check if user is admin (by role, email, or username)
      const isAdmin = user?.role === 'admin' || 
                      (user?.email && user.email.toLowerCase().includes('admin')) ||
                      (user?.username && user.username.toLowerCase().includes('admin'));
      
      // Redirect based on role if user is authenticated
      if (isAdmin) {
        navigate('/app/dashboard');
      } else if (user?.role === 'doctor') {
        navigate('/app/doctor');
      } else if (user?.role === 'nurse') {
        navigate('/app/nurse');
      } else if (user?.role === 'reception') {
        navigate('/app/reception');
      } else if (user?.role === 'lab') {
        navigate('/app/lab');
      } else if (user?.role === 'imaging') {
        navigate('/app/imaging');
      } else {
        // Fallback to admin dashboard if role doesn't match specific path
        navigate('/app');
      }
    }
  }, [isAuthenticated, navigate, user]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg">Redirecting...</p>
    </div>
  );
};

export default Home; 
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

interface AddUserFormProps {
  onUserAdded?: () => void;
}

const AddUserForm: React.FC<AddUserFormProps> = ({ onUserAdded }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('reception');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { getRoleBasedRoute } = useAuth();

  const roles = [
    { value: 'doctor', label: 'Doctor' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'reception', label: 'Reception' },
    { value: 'admin', label: 'Admin' },
    { value: 'lab', label: 'Lab Technician' },
    { value: 'imaging', label: 'Imaging Technician' },
    { value: 'pharmacy', label: 'Pharmacist' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // In a real application, you would make an API call to register the user
      // const response = await axios.post('/api/auth/register', {
      //   username,
      //   email,
      //   firstName,
      //   lastName,
      //   password,
      //   role
      // });
      
      // For demo purposes, we'll simulate a successful registration
      // Generate a unique ID for the user
      const userId = `mock-${Date.now()}`;
      
      // Create user data
      const userData = {
        _id: userId,
        username,
        email,
        firstName,
        lastName,
        role
      };
      
      // Generate token
      const tokenPayload = {
        userId,
        role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
      };
      
      const token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify(tokenPayload))}.mockSignature`;
      
      // Simulate successful registration
      toast.success(`User ${username} added successfully with role: ${role}`);
      
      // If onUserAdded callback is provided, call it
      if (onUserAdded) {
        onUserAdded();
      }
      
      // Option 1: Stay on the admin page
      resetForm();
      
      // Option 2: Log in as the new user and redirect to their dashboard
      // Uncomment these lines to enable automatic login as the new user
      /*
      // Store authentication data
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Set authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Redirect to the appropriate dashboard based on role
      handleUserCreated(userData);
      */
      
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(error.response?.data?.message || 'Failed to add user');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setUsername('');
    setEmail('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setRole('reception');
  };

  return (
    <div className="bg-primary-foreground shadow-md rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Add New User</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Username*
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Email*
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              First Name*
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Last Name*
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Password*
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Role*
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-border/40 rounded-md focus:outline-none focus:ring-blue-500 focus:border-primary"
              required
            >
              {roles.map((roleOption) => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 border border-border/40 rounded-md text-muted-foreground hover:bg-muted/10"
            disabled={isSubmitting}
          >
            Reset
          </button>
          <button
            type="submit"
            className={`px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding...' : 'Add User'}
          </button>
        </div>
        
        <div className="mt-4 p-3 bg-muted/10 rounded-md">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">After adding a user:</h3>
          <p className="text-sm text-muted-foreground">
            1. The user will be added to the system<br />
            2. You can stay on this page to add more users<br />
            3. Or you can choose to login as the new user and be redirected to their dashboard
          </p>
          
          <div className="mt-3">
            <label className="inline-flex items-center">
              <input 
                type="checkbox" 
                className="form-checkbox h-4 w-4 text-primary"
                // This would control the automatic login behavior
                // onChange={(e) => setAutoLogin(e.target.checked)}
              />
              <span className="ml-2 text-sm text-muted-foreground">
                Automatically log in as new user after creation (disabled for demo)
              </span>
            </label>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddUserForm; 
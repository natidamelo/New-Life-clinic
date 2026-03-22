import React, { useState, useEffect } from 'react';
import AddUserForm from '../../components/admin/AddUserForm';
import { useAuth } from '../../context/AuthContext';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    // Fetch real users from the clinic-cms database
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data || []);
        } else {
          console.error('Failed to fetch users');
          setUsers([]);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUserAdded = () => {
    // Refresh the user list from the database
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/users', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token') || localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUsers(data || []);
        }
      } catch (error) {
        console.error('Error refreshing users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  };

  // Verify admin role
  if (user && user.role !== 'admin') {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-destructive/20 p-4 rounded-md text-destructive">
          <h2 className="font-bold text-lg">Access Denied</h2>
          <p>You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-primary-foreground shadow-md rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border/30 bg-muted/10">
              <h2 className="font-semibold text-lg">User List</h2>
            </div>
            
            {isLoading ? (
              <div className="p-6 text-center">Loading users...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-muted/10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-primary-foreground divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-muted-foreground">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {user.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${user.role === 'admin' ? 'bg-secondary/20 text-secondary-foreground' : 
                              user.role === 'doctor' ? 'bg-primary/20 text-primary' : 
                              user.role === 'nurse' ? 'bg-primary/20 text-primary' : 
                              user.role === 'reception' ? 'bg-accent/20 text-accent-foreground' : 
                              user.role === 'imaging' ? 'bg-pink-100 text-pink-800' : 
                              user.role === 'lab' ? 'bg-indigo-100 text-indigo-800' : 
                              'bg-muted/20 text-muted-foreground'}`}
                          >
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          <button className="text-indigo-600 hover:text-indigo-900 mr-3">Edit</button>
                          <button className="text-destructive hover:text-destructive">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <AddUserForm onUserAdded={handleUserAdded} />
        </div>
      </div>
    </div>
  );
};

export default UserManagement; 
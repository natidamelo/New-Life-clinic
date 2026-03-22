import React, { useState, useEffect } from 'react';
import adminService from '../../services/adminService';
import { User } from '../../types';
import { useForm } from "react-hook-form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { toast } from 'react-hot-toast';

const StaffManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showSpecialization, setShowSpecialization] = useState(false);

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      username: "",
      email: "",
      password: "",
      role: "",
      firstName: "",
      lastName: "",
      specialization: ""
    }
  });

  const selectedRole = watch("role");

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === "role") {
        if (value.role === 'doctor') {
          setShowSpecialization(true);
        } else {
          setShowSpecialization(false);
          setValue("specialization", "");
        }
      }
    });
    
    return () => (subscription as any).unsubscribe();
  }, [watch, setValue]);

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await adminService.getUsers();
      setUsers(response);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setValue("username", user.username);
    setValue("email", user.email);
    setValue("role", user.role);
    setValue("firstName", user.firstName || "");
    setValue("lastName", user.lastName || "");
    setValue("specialization", user.specialization || "");
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const onSubmit = async (values: any) => {
    try {
      if (editingUser) {
        await adminService.updateUser(editingUser._id!, values);
        toast.success('User updated successfully');
      } else {
        await adminService.createUser(values);
        toast.success('User created successfully');
      }
      reset();
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to save user');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Staff Management</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {editingUser ? 'Edit User' : 'Add New User'}
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <Input
                {...register("firstName", { required: true })}
                placeholder="Enter first name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <Input
                {...register("lastName", { required: true })}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                {...register("username", { required: true })}
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                {...register("email", { required: true })}
                type="email"
                placeholder="Enter email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Password {editingUser ? '(Leave blank to keep current)' : ''}
            </label>
            <Input
              {...register("password", { required: !editingUser })}
              type="password"
              placeholder="Enter password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <Select onValueChange={(value) => setValue("role", value)} value={selectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="doctor">Doctor</SelectItem>
                <SelectItem value="nurse">Nurse</SelectItem>
                <SelectItem value="lab">Lab Technician</SelectItem>
                <SelectItem value="imaging">Imaging Technician</SelectItem>
                <SelectItem value="reception">Reception</SelectItem>
                <SelectItem value="finance">Finance</SelectItem>
                <SelectItem value="pharmacy">Pharmacy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {showSpecialization && (
            <div>
              <label className="block text-sm font-medium mb-1">Specialization</label>
              <Input
                {...register("specialization", { required: showSpecialization })}
                placeholder="Enter specialization"
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {editingUser ? 'Update User' : 'Create User'}
            </Button>
            {editingUser && (
              <Button type="button" variant="outline" onClick={() => {
                reset();
                setEditingUser(null);
              }}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">All Users</h2>
          
          {isLoading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Specialization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.specialization || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${(user as any).isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {(user as any).isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)} disabled={isLoading}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(user._id!)} disabled={isLoading}>Delete</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;
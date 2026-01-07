import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateIST } from '../../utils/dateUtils';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  ShieldOff,
  Search,
  Key,
  Mail,
  User,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Loader
} from 'lucide-react';
import ErrorModal from '../common/ErrorModal';
import SuccessModal from '../common/SuccessModal';
import ConfirmModal from '../common/ConfirmModal';
import { supabase } from '../../services/supabase';

interface User {
  id: string;
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  password?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmButtonClass?: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    isActive: true
  });

  // Load users from Supabase database
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const formattedUsers = data.map(user => ({
          id: user.id,
          userId: user.user_id || '',
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role as 'admin' | 'user',
          password: user.password_hash,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: user.last_login || undefined
        }));

        setUsers(formattedUsers);
      } catch (error) {
        console.error('Error loading users:', error);
        setError('Failed to load users from Supabase database');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const generateUserId = () => {
    const maxId = users.reduce((max, user) => {
      const num = parseInt(user.userId.replace('USR', ''));
      return num > max ? num : max;
    }, 0);
    return `USR${String(maxId + 1).padStart(4, '0')}`;
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: 'user',
      isActive: true
    });
    setError('');
    setSuccess('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username || !formData.email || !formData.firstName || !formData.lastName || !formData.password) {
      setError('All fields are required');
      return;
    }

    if (users.some(u => u.username === formData.username)) {
      setError('Username already exists');
      return;
    }

    if (users.some(u => u.email === formData.email)) {
      setError('Email already exists');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const maxUserId = users.reduce((max, user) => {
        const numericPart = user.userId.replace(/^(USR|USER)/, '');
        const num = parseInt(numericPart) || 0;
        return num > max ? num : max;
      }, 0);
      const newUserId = `USR${String(maxUserId + 1).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('users')
        .insert({
          user_id: newUserId,
          username: formData.username,
          email: formData.email,
          password_hash: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          role: formData.role,
          is_active: formData.isActive
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const { data: updatedUsers } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (updatedUsers) {
        const formattedUsers = updatedUsers.map(user => ({
          id: user.id,
          userId: user.user_id || '',
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role as 'admin' | 'user',
          password: user.password_hash,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: user.last_login || undefined
        }));
        setUsers(formattedUsers);
      }

      setSuccess('User created successfully!');
      setShowSuccessModal(true);
      setShowCreateModal(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.message?.includes('duplicate key')) {
        setError('Username or email already exists');
      } else {
        setError('Failed to create user: ' + error.message);
      }
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      password: '',
      currentPassword: user.password,
      role: user.role,
      isActive: user.isActive
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setError('');

    if (!formData.username || !formData.email || !formData.firstName || !formData.lastName) {
      setError('All fields except password are required');
      return;
    }

    if (users.some(u => u.username === formData.username && u.id !== selectedUser.id)) {
      setError('Username already exists');
      return;
    }

    if (users.some(u => u.email === formData.email && u.id !== selectedUser.id)) {
      setError('Email already exists');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        username: formData.username,
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
        role: formData.role,
        is_active: formData.isActive,
        updated_at: new Date().toISOString()
      };

      if (formData.password) {
        updateData.password_hash = formData.password;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', selectedUser.id);

      if (error) {
        throw error;
      }

      const { data: updatedUsers } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (updatedUsers) {
        const formattedUsers = updatedUsers.map(user => ({
          id: user.id,
          userId: user.user_id || '',
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role as 'admin' | 'user',
          password: user.password_hash,
          isActive: user.is_active,
          createdAt: user.created_at,
          lastLogin: user.last_login || undefined
        }));
        setUsers(formattedUsers);
      }

      setSuccess('User updated successfully!');
      setShowSuccessModal(true);
      setShowEditModal(false);
      setSelectedUser(null);
      resetForm();
    } catch (error: any) {
      console.error('Error updating user:', error);
      setError('Failed to update user: ' + error.message);
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const action = user.isActive ? 'deactivate' : 'activate';
    setConfirmAction({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      message: `Are you sure you want to ${action} this user?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      confirmButtonClass: user.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700',
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase
            .from('users')
            .update({
              is_active: !user.isActive,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);

          if (error) {
            throw error;
          }

          const { data: updatedUsers } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

          if (updatedUsers) {
            const formattedUsers = updatedUsers.map(user => ({
              id: user.id,
              userId: user.user_id || '',
              username: user.username,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              role: user.role as 'admin' | 'user',
              password: user.password_hash,
              isActive: user.is_active,
              createdAt: user.created_at,
              lastLogin: user.last_login || undefined
            }));
            setUsers(formattedUsers);
          }

          setSuccess(`User ${action}d successfully!`);
          setShowSuccessModal(true);
        } catch (error: any) {
          console.error('Error toggling user status:', error);
          setError('Failed to ' + action + ' user: ' + error.message);
          setShowErrorModal(true);
        } finally {
          setLoading(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.id === currentUser?.id) {
      setError('You cannot delete your own account');
      setShowErrorModal(true);
      return;
    }

    setConfirmAction({
      title: 'Delete User',
      message: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmText: 'Delete',
      confirmButtonClass: 'bg-red-600 hover:bg-red-700',
      onConfirm: async () => {
        setLoading(true);
        try {
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

          if (error) {
            throw error;
          }

          const { data: updatedUsers } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

          if (updatedUsers) {
            const formattedUsers = updatedUsers.map(user => ({
              id: user.id,
              userId: user.user_id || '',
              username: user.username,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              role: user.role as 'admin' | 'user',
              password: user.password_hash,
              isActive: user.is_active,
              createdAt: user.created_at,
              lastLogin: user.last_login || undefined
            }));
            setUsers(formattedUsers);
          }

          setSuccess('User deleted successfully!');
          setShowSuccessModal(true);
        } catch (error) {
          console.error('Error deleting user:', error);
          setError('Error deleting user from database');
          setShowErrorModal(true);
        } finally {
          setLoading(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Access Denied</h3>
              <p className="mt-2 text-sm text-red-700">
                You don't have permission to access user management.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage system users and their permissions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 whitespace-nowrap"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </button>
      </div>

      {/* Success/Error Messages */}
      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          setError('');
        }}
        message={error}
      />
      
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccess('');
        }}
        message={success}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-lg p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-100 rounded-lg p-3">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.isActive).length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-100 rounded-lg p-3">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Administrators</p>
              <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, username, email, or user ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-full">
        <div className="overflow-x-auto">
          <table className="divide-y divide-gray-200" style={{ tableLayout: 'fixed', width: '1200px' }}>
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '300px' }}>
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }}>
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '180px' }}>
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '120px' }}>
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '180px' }}>
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '150px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-3 min-w-0 flex-1 overflow-hidden">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500 truncate" title={user.email}>{user.email}</div>
                        <div className="text-xs text-gray-400 truncate">@{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-gray-900 truncate" title={user.userId}>{user.userId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded truncate" title={user.password}>
                      {user.password}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin ? formatDateIST(user.lastLogin) : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => handleEditUser(user)}
                        className="text-blue-600 hover:text-blue-900 p-1"
                        title="Edit User"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(user.id)}
                        className={`p-1 ${user.isActive ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                        title={user.isActive ? 'Deactivate User' : 'Activate User'}
                      >
                        {user.isActive ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      </button>
                      {user.id !== currentUser?.id && (
                        <button 
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-w-md">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <p className="text-xs text-gray-500 mb-1">Password will be visible for admin reference</p>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    Active User
                  </label>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Create User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white max-w-md">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
              <p className="text-sm text-gray-600 mb-4">User ID: {selectedUser.userId}</p>
              
              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">New Password (leave blank to keep current)</label>
                  {selectedUser && (
                    <p className="text-xs text-gray-500 mb-1">
                      Current password: <span className="font-mono bg-gray-100 px-1 rounded">{selectedUser.password}</span>
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-1">Password will be visible for admin reference</p>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActiveEdit"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isActiveEdit" className="ml-2 block text-sm text-gray-900">
                    Active User
                  </label>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
                  >
                    Update User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedUser(null);
                      resetForm();
                    }}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmAction && (
        <ConfirmModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setConfirmAction(null);
          }}
          onConfirm={confirmAction.onConfirm}
          title={confirmAction.title}
          message={confirmAction.message}
          confirmText={confirmAction.confirmText}
          confirmButtonClass={confirmAction.confirmButtonClass}
        />
      )}
    </div>
  );
};

export default UserManagement;
import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useForm } from 'react-hook-form'
import API from '../api/client'
import toast from 'react-hot-toast'
import {
  UserPlusIcon,
  UsersIcon,
  CogIcon,
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

const AdminSettings = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [usersResponse, statsResponse] = await Promise.all([
        API.get('/admin/users'),
        API.get('/admin/stats')
      ])
      setUsers(usersResponse.data.users)
      setStats(statsResponse.data)
    } catch (error) {
      console.error('Failed to load admin data:', error)
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  const createUser = async (data) => {
    try {
      await API.post('/admin/users', data)
      toast.success('User created successfully')
      loadData()
      setShowUserForm(false)
      reset()
    } catch (error) {
      console.error('Failed to create user:', error)
      const errorMessage = error.response?.data?.error || 'Failed to create user'
      toast.error(errorMessage)
    }
  }

  const updateUser = async (data) => {
    try {
      await API.put(`/admin/users/${editingUser.id}`, data)
      toast.success('User updated successfully')
      loadData()
      setEditingUser(null)
      setShowUserForm(false)
      reset()
    } catch (error) {
      console.error('Failed to update user:', error)
      const errorMessage = error.response?.data?.error || 'Failed to update user'
      toast.error(errorMessage)
    }
  }

  const onSubmit = (data) => {
    if (editingUser) {
      updateUser(data)
    } else {
      createUser(data)
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setShowUserForm(true)
    setValue('fullName', user.fullName)
    setValue('email', user.email)
    setValue('role', user.role)
    setValue('reportsTo', user.reportsTo || '')
    setValue('isActive', user.isActive)
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setShowUserForm(false)
    reset()
  }

  const tabs = [
    { id: 'users', name: 'Users', icon: UsersIcon },
    { id: 'stats', name: 'Statistics', icon: ChartBarIcon },
    { id: 'settings', name: 'Settings', icon: CogIcon },
  ]

  const roles = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'EMPLOYEE', label: 'Employee' },
  ]

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'badge-danger'
      case 'MANAGER':
        return 'badge-warning'
      case 'EMPLOYEE':
        return 'badge-info'
      default:
        return 'badge-gray'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Settings</h1>
        <p className="text-gray-600 mt-1">Manage users, view statistics, and configure system settings</p>
      </div>

      {/* Tabs */}
      <div className="card">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="card-body">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                <button
                  onClick={() => setShowUserForm(true)}
                  className="btn btn-primary"
                >
                  <UserPlusIcon className="h-4 w-4 mr-2" />
                  Add User
                </button>
              </div>

              {/* User Form */}
              {showUserForm && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">
                    {editingUser ? 'Edit User' : 'Add New User'}
                  </h4>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Full Name</label>
                        <input
                          {...register('fullName', { required: 'Full name is required' })}
                          type="text"
                          className="input"
                        />
                        {errors.fullName && (
                          <p className="text-danger-600 text-sm mt-1">{errors.fullName.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="label">Email</label>
                        <input
                          {...register('email', { 
                            required: 'Email is required',
                            pattern: {
                              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                              message: 'Invalid email address'
                            }
                          })}
                          type="email"
                          className="input"
                        />
                        {errors.email && (
                          <p className="text-danger-600 text-sm mt-1">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Role</label>
                        <select
                          {...register('role', { required: 'Role is required' })}
                          className="input"
                        >
                          {roles.map(role => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        {errors.role && (
                          <p className="text-danger-600 text-sm mt-1">{errors.role.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="label">Reports To</label>
                        <select {...register('reportsTo')} className="input">
                          <option value="">Select Manager</option>
                          {users
                            .filter(u => u.role === 'MANAGER' || u.role === 'ADMIN')
                            .map(user => (
                              <option key={user.id} value={user.id}>
                                {user.fullName}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {editingUser && (
                      <div>
                        <label className="flex items-center">
                          <input
                            {...register('isActive')}
                            type="checkbox"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-900">Active</span>
                        </label>
                      </div>
                    )}

                    <div className="flex space-x-3">
                      <button type="submit" className="btn btn-primary">
                        {editingUser ? 'Update User' : 'Create User'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Users List */}
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-10 rounded-full bg-primary-600 flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {user.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{user.fullName}</h4>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        {user.manager && (
                          <p className="text-xs text-gray-400">Reports to: {user.manager.fullName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`badge ${getRoleBadge(user.role)}`}>
                        {user.role}
                      </span>
                      <span className={`badge ${user.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => handleEditUser(user)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Company Statistics</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <UsersIcon className="h-8 w-8 text-primary-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Users</p>
                      <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <ChartBarIcon className="h-8 w-8 text-success-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats.expenseStats?.find(s => s.status === 'APPROVED')?._count?.id || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center">
                    <CogIcon className="h-8 w-8 text-warning-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {stats.approvalStats?.find(s => s.status === 'PENDING')?._count?.id || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
              <p className="text-gray-500">System configuration options will be available here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminSettings
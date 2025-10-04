import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import API from '../api/client'
import toast from 'react-hot-toast'
import {
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ReceiptPercentIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline'

const Dashboard = () => {
  const { user, isAdmin, isManager } = useAuth()
  const [stats, setStats] = useState({
    totalExpenses: 0,
    pendingExpenses: 0,
    approvedExpenses: 0,
    rejectedExpenses: 0,
    totalAmount: 0,
    monthlyAmount: 0,
    pendingApprovals: 0
  })
  const [recentExpenses, setRecentExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load user's expense statistics
      const expensesResponse = await API.get('/expenses?limit=5')
      const expenses = expensesResponse.data.expenses
      
      // Calculate stats from expenses
      const stats = {
        totalExpenses: expensesResponse.data.pagination.total,
        pendingExpenses: expenses.filter(e => e.status === 'PENDING').length,
        approvedExpenses: expenses.filter(e => e.status === 'APPROVED').length,
        rejectedExpenses: expenses.filter(e => e.status === 'REJECTED').length,
        totalAmount: expensesResponse.data.summary.totalApprovedAmount,
        monthlyAmount: 0, // Will be calculated separately
        pendingApprovals: 0 // Will be loaded for managers/admins
      }

      // Load pending approvals for managers/admins
      if (isManager()) {
        try {
          const approvalsResponse = await API.get('/approvals/pending?limit=1')
          stats.pendingApprovals = approvalsResponse.data.pagination.total
        } catch (error) {
          console.error('Failed to load approvals:', error)
        }
      }

      setStats(stats)
      setRecentExpenses(expenses)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />
      case 'REJECTED':
        return <XCircleIcon className="h-5 w-5 text-danger-500" />
      case 'PENDING':
        return <ClockIcon className="h-5 w-5 text-warning-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return 'badge-success'
      case 'REJECTED':
        return 'badge-danger'
      case 'PENDING':
        return 'badge-warning'
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
      {/* Welcome Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.fullName}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with your expenses today.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link to="/submit" className="btn btn-primary">
              <PlusIcon className="h-4 w-4 mr-2" />
              Submit Expense
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ReceiptPercentIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Expenses</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalExpenses}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-warning-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingExpenses}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.approvedExpenses}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-8 w-8 text-success-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Amount</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {user?.company?.currency} {stats.totalAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manager/Admin specific stats */}
      {isManager() && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Approvals</p>
                  <p className="text-2xl font-semibold text-gray-900">{stats.pendingApprovals}</p>
                </div>
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-warning-600" />
                </div>
              </div>
              <div className="mt-4">
                <Link to="/approvals" className="text-primary-600 hover:text-primary-500 text-sm font-medium">
                  Review approvals →
                </Link>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Approval Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.totalExpenses > 0 
                      ? Math.round((stats.approvedExpenses / stats.totalExpenses) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <ArrowTrendingUpIcon className="h-8 w-8 text-success-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Recent Expenses</h3>
            <Link to="/history" className="text-primary-600 hover:text-primary-500 text-sm font-medium">
              View all →
            </Link>
          </div>
        </div>
        <div className="card-body">
          {recentExpenses.length === 0 ? (
            <div className="text-center py-8">
              <ReceiptPercentIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
              <p className="text-gray-500 mb-4">Get started by submitting your first expense.</p>
              <Link to="/submit" className="btn btn-primary">
                <PlusIcon className="h-4 w-4 mr-2" />
                Submit Expense
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(expense.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{expense.category}</p>
                      <p className="text-sm text-gray-500">{expense.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {expense.originalCurrency} {expense.originalAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(expense.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`badge ${getStatusBadge(expense.status)}`}>
                      {expense.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/submit" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center">
            <PlusIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Submit Expense</h3>
            <p className="text-gray-500 text-sm">Add a new expense claim</p>
          </div>
        </Link>

        <Link to="/history" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center">
            <ClockIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900">View History</h3>
            <p className="text-gray-500 text-sm">Check your expense history</p>
          </div>
        </Link>

        <Link to="/profile" className="card hover:shadow-md transition-shadow">
          <div className="card-body text-center">
            <CurrencyDollarIcon className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900">Profile</h3>
            <p className="text-gray-500 text-sm">Manage your account</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default Dashboard
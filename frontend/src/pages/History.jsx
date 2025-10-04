import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import API from '../api/client'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'

const History = () => {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    startDate: '',
    endDate: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })

  useEffect(() => {
    loadExpenses()
  }, [pagination.page, filters])

  const loadExpenses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString()
      })

      if (filters.status) params.append('status', filters.status)
      if (filters.category) params.append('category', filters.category)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)

      const response = await API.get(`/expenses?${params}`)
      setExpenses(response.data.expenses)
      setPagination(response.data.pagination)
    } catch (error) {
      console.error('Failed to load expenses:', error)
      toast.error('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      status: '',
      category: '',
      startDate: '',
      endDate: ''
    })
    setPagination(prev => ({ ...prev, page: 1 }))
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

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'CANCELLED', label: 'Cancelled' }
  ]

  const categories = [
    'Meals', 'Transportation', 'Accommodation', 
    'Office Supplies', 'Software', 'Marketing', 'Travel', 'Other'
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense History</h1>
          <p className="text-gray-600 mt-1">View and manage your expense claims</p>
        </div>
        <div className="text-sm text-gray-500">
          {pagination.total} total expenses
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Filters</h3>
            <button
              onClick={clearFilters}
              className="btn btn-outline btn-sm"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Clear Filters
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="input"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label">Category</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="input"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="label">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="input"
              />
            </div>
            
            <div>
              <label className="label">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses found</h3>
            <p className="text-gray-500">
              {Object.values(filters).some(f => f) 
                ? 'Try adjusting your filters to see more results.'
                : 'You haven\'t submitted any expenses yet.'
              }
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense) => (
            <div key={expense.id} className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(expense.status)}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {expense.category}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {expense.description || 'No description'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString()} • 
                        Submitted {new Date(expense.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {expense.originalCurrency} {expense.originalAmount.toFixed(2)}
                      </p>
                      {expense.companyAmount && expense.originalCurrency !== expense.companyCurrency && (
                        <p className="text-sm text-gray-500">
                          ≈ {expense.companyCurrency} {expense.companyAmount.toFixed(2)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`badge ${getStatusBadge(expense.status)}`}>
                        {expense.status}
                      </span>
                      
                      {expense.receiptPath && (
                        <button
                          onClick={() => window.open(`http://localhost:8000/${expense.receiptPath}`, '_blank')}
                          className="btn btn-outline btn-sm flex items-center"
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Approval Chain */}
                {expense.approvals && expense.approvals.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Approval Progress</h4>
                    <div className="space-y-2">
                      {expense.approvals.map((approval, index) => (
                        <div key={approval.id} className="flex items-center space-x-3 text-sm">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            approval.status === 'APPROVED' 
                              ? 'bg-success-100 text-success-800'
                              : approval.status === 'REJECTED'
                              ? 'bg-danger-100 text-danger-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">
                              {approval.approver?.fullName || approval.approverRole}
                            </span>
                            <span className={`ml-2 badge ${
                              approval.status === 'APPROVED' 
                                ? 'badge-success'
                                : approval.status === 'REJECTED'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}>
                              {approval.status}
                            </span>
                            {approval.comment && (
                              <p className="text-gray-500 mt-1">{approval.comment}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="btn btn-outline btn-sm"
            >
              Previous
            </button>
            
            <span className="flex items-center px-3 py-2 text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default History
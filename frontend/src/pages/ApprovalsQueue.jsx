import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import API from '../api/client'
import toast from 'react-hot-toast'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  UserIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline'

const ApprovalsQueue = () => {
  const { user } = useAuth()
  const [pendingApprovals, setPendingApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  useEffect(() => {
    loadPendingApprovals()
  }, [])

  const loadPendingApprovals = async () => {
    try {
      setLoading(true)
      const response = await API.get('/approvals/pending')
      setPendingApprovals(response.data.approvals)
    } catch (error) {
      console.error('Failed to load pending approvals:', error)
      toast.error('Failed to load pending approvals')
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (approvalId, decision, comment = '') => {
    setActionLoading(approvalId)
    
    try {
      const endpoint = decision === 'APPROVED' ? 'approve' : 'reject'
      await API.post(`/approvals/${approvalId}/${endpoint}`, { comment })
      
      toast.success(`Expense ${decision.toLowerCase()} successfully`)
      loadPendingApprovals() // Refresh the list
    } catch (error) {
      console.error(`Failed to ${decision.toLowerCase()} expense:`, error)
      const errorMessage = error.response?.data?.error || `Failed to ${decision.toLowerCase()} expense`
      toast.error(errorMessage)
    } finally {
      setActionLoading(null)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Approvals Queue</h1>
          <p className="text-gray-600 mt-1">
            Review and approve pending expense claims
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {pendingApprovals.length} pending approval{pendingApprovals.length !== 1 ? 's' : ''}
        </div>
      </div>

      {pendingApprovals.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <CheckCircleIcon className="h-12 w-12 text-success-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
            <p className="text-gray-500">
              There are no pending approvals at the moment.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((approval) => (
            <div key={approval.id} className="card">
              <div className="card-body">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-primary-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {approval.expense.user.fullName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {approval.expense.user.email}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Amount</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {approval.expense.originalCurrency} {approval.expense.originalAmount.toFixed(2)}
                        </p>
                        {approval.expense.companyAmount && approval.expense.originalCurrency !== approval.expense.companyCurrency && (
                          <p className="text-sm text-gray-500">
                            ≈ {approval.expense.companyCurrency} {approval.expense.companyAmount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Category</p>
                        <p className="text-sm text-gray-900">{approval.expense.category}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Date</p>
                        <p className="text-sm text-gray-900">
                          {new Date(approval.expense.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {approval.expense.description && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-500">Description</p>
                        <p className="text-sm text-gray-900">{approval.expense.description}</p>
                      </div>
                    )}

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        Submitted {formatDate(approval.expense.createdAt)}
                      </div>
                      <span className={`badge ${getStatusBadge(approval.expense.status)}`}>
                        {approval.expense.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-6">
                    <button
                      onClick={() => handleApproval(approval.id, 'APPROVED')}
                      disabled={actionLoading === approval.id}
                      className="btn btn-success btn-sm flex items-center"
                    >
                      {actionLoading === approval.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                      )}
                      Approve
                    </button>
                    
                    <button
                      onClick={() => {
                        const comment = prompt('Enter rejection reason (optional):')
                        if (comment !== null) {
                          handleApproval(approval.id, 'REJECTED', comment)
                        }
                      }}
                      disabled={actionLoading === approval.id}
                      className="btn btn-danger btn-sm flex items-center"
                    >
                      {actionLoading === approval.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <XCircleIcon className="h-4 w-4 mr-2" />
                      )}
                      Reject
                    </button>

                    {approval.expense.receiptPath && (
                      <button
                        onClick={() => window.open(`http://localhost:8000/${approval.expense.receiptPath}`, '_blank')}
                        className="btn btn-outline btn-sm flex items-center"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        View Receipt
                      </button>
                    )}
                  </div>
                </div>

                {/* Approval Chain */}
                {approval.expense.approvals && approval.expense.approvals.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Approval Chain</h4>
                    <div className="space-y-2">
                      {approval.expense.approvals.map((chainApproval, index) => (
                        <div key={chainApproval.id} className="flex items-center space-x-3 text-sm">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            chainApproval.status === 'APPROVED' 
                              ? 'bg-success-100 text-success-800'
                              : chainApproval.status === 'REJECTED'
                              ? 'bg-danger-100 text-danger-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <span className="font-medium text-gray-900">
                              {chainApproval.approver?.fullName || chainApproval.approverRole}
                            </span>
                            <span className={`ml-2 badge ${
                              chainApproval.status === 'APPROVED' 
                                ? 'badge-success'
                                : chainApproval.status === 'REJECTED'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}>
                              {chainApproval.status}
                            </span>
                            {chainApproval.comment && (
                              <p className="text-gray-500 mt-1">{chainApproval.comment}</p>
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
    </div>
  )
}

export default ApprovalsQueue
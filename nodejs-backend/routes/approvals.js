const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { processApproval } = require('../utils/approvalWorkflow');
const { requireManager } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const approvalValidation = [
  body('decision').isIn(['APPROVED', 'REJECTED']).withMessage('Decision must be APPROVED or REJECTED'),
  body('comment').optional().trim()
];

/**
 * @route   GET /api/approvals/pending
 * @desc    Get pending approvals for the current user
 * @access  Private (Manager/Admin)
 */
router.get('/pending', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], requireManager, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20
    } = req.query;

    const userId = req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get pending approvals for this user
    const [approvals, total] = await Promise.all([
      prisma.expenseApproval.findMany({
        where: {
          approverId: userId,
          status: 'PENDING'
        },
        include: {
          expense: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              },
              approvals: {
                include: {
                  approver: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true
                    }
                  }
                },
                orderBy: { order: 'asc' }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.expenseApproval.count({
        where: {
          approverId: userId,
          status: 'PENDING'
        }
      })
    ]);

    res.json({
      approvals: approvals.map(approval => ({
        id: approval.id,
        expenseId: approval.expenseId,
        order: approval.order,
        status: approval.status,
        comment: approval.comment,
        createdAt: approval.createdAt,
        expense: {
          id: approval.expense.id,
          originalAmount: approval.expense.originalAmount,
          originalCurrency: approval.expense.originalCurrency,
          companyAmount: approval.expense.companyAmount,
          companyCurrency: approval.expense.companyCurrency,
          category: approval.expense.category,
          description: approval.expense.description,
          date: approval.expense.date,
          status: approval.expense.status,
          receiptPath: approval.expense.receiptPath,
          createdAt: approval.expense.createdAt,
          user: approval.expense.user,
          approvals: approval.expense.approvals
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({
      error: 'Failed to fetch pending approvals'
    });
  }
});

/**
 * @route   GET /api/approvals/history
 * @desc    Get approval history for the current user
 * @access  Private (Manager/Admin)
 */
router.get('/history', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['APPROVED', 'REJECTED'])
], requireManager, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      status
    } = req.query;

    const userId = req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      approverId: userId,
      status: { not: 'PENDING' }
    };

    if (status) {
      where.status = status;
    }

    // Get approval history
    const [approvals, total] = await Promise.all([
      prisma.expenseApproval.findMany({
        where: where,
        include: {
          expense: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.expenseApproval.count({ where: where })
    ]);

    res.json({
      approvals: approvals.map(approval => ({
        id: approval.id,
        expenseId: approval.expenseId,
        order: approval.order,
        status: approval.status,
        comment: approval.comment,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
        expense: {
          id: approval.expense.id,
          originalAmount: approval.expense.originalAmount,
          originalCurrency: approval.expense.originalCurrency,
          companyAmount: approval.expense.companyAmount,
          companyCurrency: approval.expense.companyCurrency,
          category: approval.expense.category,
          description: approval.expense.description,
          date: approval.expense.date,
          status: approval.expense.status,
          createdAt: approval.expense.createdAt,
          user: approval.expense.user
        }
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      error: 'Failed to fetch approval history'
    });
  }
});

/**
 * @route   POST /api/approvals/:id/approve
 * @desc    Approve an expense
 * @access  Private (Manager/Admin)
 */
router.post('/:id/approve', approvalValidation, requireManager, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const approvalId = parseInt(req.params.id);
    const { comment } = req.body;
    const approverId = req.user.id;

    // Check if approval exists and belongs to current user
    const approval = await prisma.expenseApproval.findFirst({
      where: {
        id: approvalId,
        approverId: approverId,
        status: 'PENDING'
      },
      include: {
        expense: true
      }
    });

    if (!approval) {
      return res.status(404).json({
        error: 'Approval not found or already processed'
      });
    }

    // Process the approval
    const result = await processApproval(approval.expenseId, approverId, 'APPROVED', comment);

    res.json({
      message: 'Expense approved successfully',
      result: result
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({
      error: 'Failed to approve expense'
    });
  }
});

/**
 * @route   POST /api/approvals/:id/reject
 * @desc    Reject an expense
 * @access  Private (Manager/Admin)
 */
router.post('/:id/reject', approvalValidation, requireManager, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const approvalId = parseInt(req.params.id);
    const { comment } = req.body;
    const approverId = req.user.id;

    // Check if approval exists and belongs to current user
    const approval = await prisma.expenseApproval.findFirst({
      where: {
        id: approvalId,
        approverId: approverId,
        status: 'PENDING'
      },
      include: {
        expense: true
      }
    });

    if (!approval) {
      return res.status(404).json({
        error: 'Approval not found or already processed'
      });
    }

    // Process the rejection
    const result = await processApproval(approval.expenseId, approverId, 'REJECTED', comment);

    res.json({
      message: 'Expense rejected successfully',
      result: result
    });
  } catch (error) {
    console.error('Reject expense error:', error);
    res.status(500).json({
      error: 'Failed to reject expense'
    });
  }
});

/**
 * @route   GET /api/approvals/stats
 * @desc    Get approval statistics for the current user
 * @access  Private (Manager/Admin)
 */
router.get('/stats', requireManager, async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Get approval statistics
    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      totalAmountApproved,
      monthlyStats
    ] = await Promise.all([
      // Pending approvals count
      prisma.expenseApproval.count({
        where: {
          approverId: userId,
          status: 'PENDING'
        }
      }),
      // Approved count
      prisma.expenseApproval.count({
        where: {
          approverId: userId,
          status: 'APPROVED'
        }
      }),
      // Rejected count
      prisma.expenseApproval.count({
        where: {
          approverId: userId,
          status: 'REJECTED'
        }
      }),
      // Total amount approved by this user
      prisma.expenseApproval.aggregate({
        where: {
          approverId: userId,
          status: 'APPROVED'
        },
        _sum: {
          expense: {
            companyAmount: true
          }
        }
      }),
      // Monthly statistics for the last 12 months
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "updatedAt") as month,
          COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_count,
          COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_count,
          SUM(e."companyAmount") FILTER (WHERE status = 'APPROVED') as approved_amount
        FROM "expense_approvals" ea
        JOIN "expenses" e ON ea."expenseId" = e.id
        WHERE ea."approverId" = ${userId}
          AND ea."updatedAt" >= NOW() - INTERVAL '12 months'
          AND ea.status != 'PENDING'
        GROUP BY DATE_TRUNC('month', ea."updatedAt")
        ORDER BY month DESC
        LIMIT 12
      `
    ]);

    res.json({
      stats: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        totalAmountApproved: totalAmountApproved._sum.expense?.companyAmount || 0
      },
      monthlyStats: monthlyStats
    });
  } catch (error) {
    console.error('Get approval stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch approval statistics'
    });
  }
});

/**
 * @route   GET /api/approvals/:id
 * @desc    Get details of a specific approval
 * @access  Private (Manager/Admin)
 */
router.get('/:id', requireManager, async (req, res) => {
  try {
    const approvalId = parseInt(req.params.id);
    const userId = req.user.id;

    const approval = await prisma.expenseApproval.findFirst({
      where: {
        id: approvalId,
        approverId: userId
      },
      include: {
        expense: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            },
            approvals: {
              include: {
                approver: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true
                  }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });

    if (!approval) {
      return res.status(404).json({
        error: 'Approval not found'
      });
    }

    res.json({
      approval: {
        id: approval.id,
        expenseId: approval.expenseId,
        order: approval.order,
        status: approval.status,
        comment: approval.comment,
        createdAt: approval.createdAt,
        updatedAt: approval.updatedAt,
        expense: {
          id: approval.expense.id,
          originalAmount: approval.expense.originalAmount,
          originalCurrency: approval.expense.originalCurrency,
          companyAmount: approval.expense.companyAmount,
          companyCurrency: approval.expense.companyCurrency,
          category: approval.expense.category,
          description: approval.expense.description,
          date: approval.expense.date,
          status: approval.expense.status,
          receiptPath: approval.expense.receiptPath,
          createdAt: approval.expense.createdAt,
          user: approval.expense.user,
          approvals: approval.expense.approvals
        }
      }
    });
  } catch (error) {
    console.error('Get approval details error:', error);
    res.status(500).json({
      error: 'Failed to fetch approval details'
    });
  }
});

module.exports = router;

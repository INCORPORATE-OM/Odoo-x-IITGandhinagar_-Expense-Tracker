const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { convertAmount } = require('../utils/currency');
const { createApprovalSequence } = require('../utils/approvalWorkflow');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// Validation middleware
const expenseValidation = [
  body('originalAmount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('originalCurrency').isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 characters'),
  body('category').trim().isLength({ min: 2 }).withMessage('Category is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('description').optional().trim()
];

/**
 * @route   POST /api/expenses
 * @desc    Submit a new expense
 * @access  Private
 */
router.post('/', uploadSingle('receipt'), expenseValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      originalAmount,
      originalCurrency,
      category,
      description,
      date
    } = req.body;

    const userId = req.user.id;
    const companyId = req.user.companyId;

    // Convert amount to company currency if different
    let companyAmount = null;
    if (originalCurrency !== req.user.company.currency) {
      companyAmount = await convertAmount(
        originalAmount,
        originalCurrency,
        req.user.company.currency
      );
    } else {
      companyAmount = originalAmount;
    }

    // Create expense in database
    const expense = await prisma.expense.create({
      data: {
        userId: userId,
        companyId: companyId,
        originalAmount: parseFloat(originalAmount),
        originalCurrency: originalCurrency.toUpperCase(),
        companyAmount: companyAmount,
        companyCurrency: req.user.company.currency,
        category: category,
        description: description,
        date: new Date(date),
        receiptPath: req.file ? req.file.path : null,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    // Create approval sequence
    const approvals = await createApprovalSequence(expense.id, companyId, userId);

    res.status(201).json({
      message: 'Expense submitted successfully',
      expense: {
        id: expense.id,
        originalAmount: expense.originalAmount,
        originalCurrency: expense.originalCurrency,
        companyAmount: expense.companyAmount,
        companyCurrency: expense.companyCurrency,
        category: expense.category,
        description: expense.description,
        date: expense.date,
        status: expense.status,
        receiptPath: expense.receiptPath,
        createdAt: expense.createdAt,
        approvals: approvals.map(approval => ({
          id: approval.id,
          approverId: approval.approverId,
          approverRole: approval.approverRole,
          status: approval.status,
          order: approval.order
        }))
      }
    });
  } catch (error) {
    console.error('Submit expense error:', error);
    res.status(500).json({
      error: 'Failed to submit expense'
    });
  }
});

/**
 * @route   GET /api/expenses
 * @desc    Get user's expenses with optional filtering
 * @access  Private
 */
router.get('/', [
  query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  query('category').optional().trim(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      status,
      category,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const userId = req.user.id;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      userId: userId
    };

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = {
        contains: category,
        mode: 'insensitive'
      };
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    // Get expenses with pagination
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: where,
        include: {
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
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.expense.count({ where: where })
    ]);

    // Calculate summary statistics
    const summary = await prisma.expense.aggregate({
      where: {
        userId: userId,
        status: 'APPROVED'
      },
      _sum: {
        companyAmount: true
      },
      _count: {
        id: true
      }
    });

    res.json({
      expenses: expenses.map(expense => ({
        id: expense.id,
        originalAmount: expense.originalAmount,
        originalCurrency: expense.originalCurrency,
        companyAmount: expense.companyAmount,
        companyCurrency: expense.companyCurrency,
        category: expense.category,
        description: expense.description,
        date: expense.date,
        status: expense.status,
        receiptPath: expense.receiptPath,
        createdAt: expense.createdAt,
        approvals: expense.approvals
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      },
      summary: {
        totalApprovedAmount: summary._sum.companyAmount || 0,
        totalApprovedExpenses: summary._count.id || 0
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      error: 'Failed to fetch expenses'
    });
  }
});

/**
 * @route   GET /api/expenses/:id
 * @desc    Get a specific expense by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const userId = req.user.id;

    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        userId: userId // Ensure user can only access their own expenses
      },
      include: {
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
    });

    if (!expense) {
      return res.status(404).json({
        error: 'Expense not found'
      });
    }

    res.json({
      expense: {
        id: expense.id,
        originalAmount: expense.originalAmount,
        originalCurrency: expense.originalCurrency,
        companyAmount: expense.companyAmount,
        companyCurrency: expense.companyCurrency,
        category: expense.category,
        description: expense.description,
        date: expense.date,
        status: expense.status,
        receiptPath: expense.receiptPath,
        createdAt: expense.createdAt,
        updatedAt: expense.updatedAt,
        approvals: expense.approvals
      }
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({
      error: 'Failed to fetch expense'
    });
  }
});

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update an expense (only if pending)
 * @access  Private
 */
router.put('/:id', [
  body('originalAmount').optional().isFloat({ min: 0.01 }),
  body('originalCurrency').optional().isLength({ min: 3, max: 3 }),
  body('category').optional().trim().isLength({ min: 2 }),
  body('description').optional().trim(),
  body('date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const expenseId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if expense exists and belongs to user
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        userId: userId,
        status: 'PENDING' // Only allow updates to pending expenses
      }
    });

    if (!existingExpense) {
      return res.status(404).json({
        error: 'Expense not found or cannot be updated'
      });
    }

    const updateData = {};

    // Update fields if provided
    if (req.body.originalAmount) {
      updateData.originalAmount = parseFloat(req.body.originalAmount);
    }

    if (req.body.originalCurrency) {
      updateData.originalCurrency = req.body.originalCurrency.toUpperCase();
    }

    if (req.body.category) {
      updateData.category = req.body.category;
    }

    if (req.body.description !== undefined) {
      updateData.description = req.body.description;
    }

    if (req.body.date) {
      updateData.date = new Date(req.body.date);
    }

    // Recalculate company amount if currency or amount changed
    if (updateData.originalAmount || updateData.originalCurrency) {
      const originalAmount = updateData.originalAmount || existingExpense.originalAmount;
      const originalCurrency = updateData.originalCurrency || existingExpense.originalCurrency;

      if (originalCurrency !== req.user.company.currency) {
        const companyAmount = await convertAmount(
          originalAmount,
          originalCurrency,
          req.user.company.currency
        );
        updateData.companyAmount = companyAmount;
      } else {
        updateData.companyAmount = originalAmount;
      }
    }

    // Update expense
    const updatedExpense = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: {
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
    });

    res.json({
      message: 'Expense updated successfully',
      expense: {
        id: updatedExpense.id,
        originalAmount: updatedExpense.originalAmount,
        originalCurrency: updatedExpense.originalCurrency,
        companyAmount: updatedExpense.companyAmount,
        companyCurrency: updatedExpense.companyCurrency,
        category: updatedExpense.category,
        description: updatedExpense.description,
        date: updatedExpense.date,
        status: updatedExpense.status,
        receiptPath: updatedExpense.receiptPath,
        createdAt: updatedExpense.createdAt,
        updatedAt: updatedExpense.updatedAt,
        approvals: updatedExpense.approvals
      }
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      error: 'Failed to update expense'
    });
  }
});

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Cancel an expense (only if pending)
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  try {
    const expenseId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check if expense exists and belongs to user
    const existingExpense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        userId: userId,
        status: 'PENDING' // Only allow cancellation of pending expenses
      }
    });

    if (!existingExpense) {
      return res.status(404).json({
        error: 'Expense not found or cannot be cancelled'
      });
    }

    // Update expense status to cancelled
    await prisma.expense.update({
      where: { id: expenseId },
      data: { status: 'CANCELLED' }
    });

    res.json({
      message: 'Expense cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel expense error:', error);
    res.status(500).json({
      error: 'Failed to cancel expense'
    });
  }
});

module.exports = router;

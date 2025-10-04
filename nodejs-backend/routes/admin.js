const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult, query } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { requireAdmin, requireManager } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require admin role
router.use(requireAdmin);

// Validation middleware
const userValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').trim().isLength({ min: 2 }).withMessage('Full name is required'),
  body('role').isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']).withMessage('Invalid role'),
  body('reportsTo').optional().isInt()
];

/**
 * @route   GET /api/admin/users
 * @desc    Get all users in the company
 * @access  Private (Admin)
 */
router.get('/users', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  query('isActive').optional().isBoolean()
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
      page = 1,
      limit = 20,
      role,
      isActive
    } = req.query;

    const companyId = req.user.companyId;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      companyId: companyId
    };

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: where,
        include: {
          manager: {
            select: {
              id: true,
              fullName: true,
              email: true
            }
          },
          employees: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where: where })
    ]);

    res.json({
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        reportsTo: user.reportsTo,
        isActive: user.isActive,
        createdAt: user.createdAt,
        manager: user.manager,
        employees: user.employees
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users'
    });
  }
});

/**
 * @route   POST /api/admin/users
 * @desc    Create a new user
 * @access  Private (Admin)
 */
router.post('/users', userValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      email,
      password,
      fullName,
      role,
      reportsTo
    } = req.body;

    const companyId = req.user.companyId;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email already exists'
      });
    }

    // Validate manager relationship
    if (reportsTo) {
      const manager = await prisma.user.findFirst({
        where: {
          id: reportsTo,
          companyId: companyId,
          role: { in: ['ADMIN', 'MANAGER'] }
        }
      });

      if (!manager) {
        return res.status(400).json({
          error: 'Invalid manager specified'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email,
        password: hashedPassword,
        fullName: fullName,
        role: role,
        companyId: companyId,
        reportsTo: reportsTo ? parseInt(reportsTo) : null
      },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      }
    });

    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: 'User created successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user'
    });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Update a user
 * @access  Private (Admin)
 */
router.put('/users/:id', [
  body('email').optional().isEmail().normalizeEmail(),
  body('fullName').optional().trim().isLength({ min: 2 }),
  body('role').optional().isIn(['ADMIN', 'MANAGER', 'EMPLOYEE']),
  body('reportsTo').optional().isInt(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = parseInt(req.params.id);
    const companyId = req.user.companyId;

    const {
      email,
      fullName,
      role,
      reportsTo,
      isActive
    } = req.body;

    // Check if user exists and belongs to company
    const existingUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: companyId
      }
    });

    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    // Validate email uniqueness if changing email
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email }
      });

      if (emailExists) {
        return res.status(400).json({
          error: 'Email is already taken'
        });
      }
    }

    // Validate manager relationship
    if (reportsTo) {
      const manager = await prisma.user.findFirst({
        where: {
          id: reportsTo,
          companyId: companyId,
          role: { in: ['ADMIN', 'MANAGER'] }
        }
      });

      if (!manager) {
        return res.status(400).json({
          error: 'Invalid manager specified'
        });
      }
    }

    // Update user
    const updateData = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (reportsTo !== undefined) updateData.reportsTo = reportsTo ? parseInt(reportsTo) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        employees: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true
          }
        }
      }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      message: 'User updated successfully',
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user'
    });
  }
});

/**
 * @route   GET /api/admin/expenses
 * @desc    Get all expenses in the company
 * @access  Private (Admin)
 */
router.get('/expenses', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']),
  query('userId').optional().isInt()
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
      page = 1,
      limit = 20,
      status,
      userId
    } = req.query;

    const companyId = req.user.companyId;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      companyId: companyId
    };

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = parseInt(userId);
    }

    // Get expenses with pagination
    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where: where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true
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
        },
        orderBy: { createdAt: 'desc' },
        skip: skip,
        take: parseInt(limit)
      }),
      prisma.expense.count({ where: where })
    ]);

    res.json({
      expenses: expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all expenses error:', error);
    res.status(500).json({
      error: 'Failed to fetch expenses'
    });
  }
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get company statistics
 * @access  Private (Admin)
 */
router.get('/stats', async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const [
      userStats,
      expenseStats,
      approvalStats,
      monthlyExpenses
    ] = await Promise.all([
      // User statistics
      prisma.user.groupBy({
        by: ['role', 'isActive'],
        where: { companyId: companyId },
        _count: { id: true }
      }),
      // Expense statistics
      prisma.expense.groupBy({
        by: ['status'],
        where: { companyId: companyId },
        _count: { id: true },
        _sum: { companyAmount: true }
      }),
      // Approval statistics
      prisma.expenseApproval.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      // Monthly expenses for the last 12 months
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as total_expenses,
          SUM("companyAmount") as total_amount,
          COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_expenses,
          SUM("companyAmount") FILTER (WHERE status = 'APPROVED') as approved_amount
        FROM "expenses"
        WHERE "companyId" = ${companyId}
          AND "createdAt" >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
        LIMIT 12
      `
    ]);

    res.json({
      userStats: userStats,
      expenseStats: expenseStats,
      approvalStats: approvalStats,
      monthlyExpenses: monthlyExpenses
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics'
    });
  }
});

/**
 * @route   PUT /api/admin/approval-sequence
 * @desc    Update company's approval sequence
 * @access  Private (Admin)
 */
router.put('/approval-sequence', [
  body('sequence').isArray().withMessage('Sequence must be an array'),
  body('sequence.*.type').isIn(['role', 'user', 'manager']).withMessage('Invalid sequence step type'),
  body('sequence.*.value').notEmpty().withMessage('Sequence step value is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { sequence } = req.body;
    const companyId = req.user.companyId;

    // Validate sequence steps
    for (const step of sequence) {
      if (step.type === 'user') {
        const user = await prisma.user.findFirst({
          where: {
            id: step.value,
            companyId: companyId
          }
        });
        if (!user) {
          return res.status(400).json({
            error: `User with ID ${step.value} not found`
          });
        }
      } else if (step.type === 'role') {
        const validRoles = ['ADMIN', 'MANAGER', 'EMPLOYEE'];
        if (!validRoles.includes(step.value.toUpperCase())) {
          return res.status(400).json({
            error: 'Invalid role specified'
          });
        }
      }
    }

    // Update or create approval sequence
    await prisma.approvalSequence.upsert({
      where: {
        companyId: companyId,
        isActive: true
      },
      update: {
        sequence: sequence,
        updatedAt: new Date()
      },
      create: {
        companyId: companyId,
        sequence: sequence,
        isActive: true
      }
    });

    res.json({
      message: 'Approval sequence updated successfully',
      sequence: sequence
    });
  } catch (error) {
    console.error('Update approval sequence error:', error);
    res.status(500).json({
      error: 'Failed to update approval sequence'
    });
  }
});

/**
 * @route   GET /api/admin/approval-sequence
 * @desc    Get company's approval sequence
 * @access  Private (Admin)
 */
router.get('/approval-sequence', async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const sequence = await prisma.approvalSequence.findFirst({
      where: {
        companyId: companyId,
        isActive: true
      }
    });

    res.json({
      sequence: sequence ? sequence.sequence : []
    });
  } catch (error) {
    console.error('Get approval sequence error:', error);
    res.status(500).json({
      error: 'Failed to fetch approval sequence'
    });
  }
});

module.exports = router;

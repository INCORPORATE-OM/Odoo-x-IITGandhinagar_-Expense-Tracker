const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Create approval records for an expense based on company's approval sequence
 * @param {number} expenseId - ID of the expense
 * @param {number} companyId - ID of the company
 * @param {number} userId - ID of the user who submitted the expense
 * @returns {Promise<Array>} - Array of created approval records
 */
async function createApprovalSequence(expenseId, companyId, userId) {
  try {
    // Get company's active approval sequence
    const sequence = await prisma.approvalSequence.findFirst({
      where: {
        companyId: companyId,
        isActive: true
      }
    });

    const approvals = [];

    if (sequence && sequence.sequence) {
      // Process the approval sequence
      const sequenceSteps = sequence.sequence;
      
      for (let i = 0; i < sequenceSteps.length; i++) {
        const step = sequenceSteps[i];
        let approverId = null;
        let approverRole = null;

        if (step.type === 'user') {
          // Specific user approver
          approverId = step.value;
        } else if (step.type === 'role') {
          // Role-based approver - find a user with this role
          const approver = await prisma.user.findFirst({
            where: {
              companyId: companyId,
              role: step.value.toUpperCase(),
              isActive: true
            }
          });
          
          if (approver) {
            approverId = approver.id;
            approverRole = step.value.toUpperCase();
          }
        } else if (step.type === 'manager') {
          // Manager of the expense submitter
          const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { manager: true }
          });
          
          if (user && user.manager) {
            approverId = user.manager.id;
            approverRole = 'MANAGER';
          }
        }

        if (approverId) {
          const approval = await prisma.expenseApproval.create({
            data: {
              expenseId: expenseId,
              approverId: approverId,
              approverRole: approverRole,
              order: i,
              status: 'PENDING'
            }
          });
          approvals.push(approval);
        }
      }
    } else {
      // Fallback: assign to user's manager
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { manager: true }
      });

      if (user && user.manager) {
        const approval = await prisma.expenseApproval.create({
          data: {
            expenseId: expenseId,
            approverId: user.manager.id,
            approverRole: 'MANAGER',
            order: 0,
            status: 'PENDING'
          }
        });
        approvals.push(approval);
      }
    }

    return approvals;
  } catch (error) {
    console.error('Error creating approval sequence:', error);
    throw error;
  }
}

/**
 * Process approval and check if expense should be approved/rejected
 * @param {number} expenseId - ID of the expense
 * @param {number} approverId - ID of the approver
 * @param {string} decision - 'APPROVED' or 'REJECTED'
 * @param {string} comment - Optional comment from approver
 * @returns {Promise<Object>} - Result of the approval process
 */
async function processApproval(expenseId, approverId, decision, comment = null) {
  try {
    // Update the approval record
    const approval = await prisma.expenseApproval.updateMany({
      where: {
        expenseId: expenseId,
        approverId: approverId,
        status: 'PENDING'
      },
      data: {
        status: decision,
        comment: comment,
        updatedAt: new Date()
      }
    });

    if (approval.count === 0) {
      throw new Error('No pending approval found for this user');
    }

    // Check if expense should be approved/rejected based on rules
    const result = await evaluateApprovalRules(expenseId);

    // Update expense status if decision is final
    if (result.finalDecision) {
      await prisma.expense.update({
        where: { id: expenseId },
        data: { 
          status: result.finalDecision,
          updatedAt: new Date()
        }
      });
    }

    return result;
  } catch (error) {
    console.error('Error processing approval:', error);
    throw error;
  }
}

/**
 * Evaluate approval rules to determine if expense should be approved/rejected
 * @param {number} expenseId - ID of the expense
 * @returns {Promise<Object>} - Evaluation result
 */
async function evaluateApprovalRules(expenseId) {
  try {
    // Get expense and company info
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { company: true }
    });

    if (!expense) {
      throw new Error('Expense not found');
    }

    // Get all approvals for this expense
    const approvals = await prisma.expenseApproval.findMany({
      where: { expenseId: expenseId },
      orderBy: { order: 'asc' },
      include: { approver: true }
    });

    // Get company's approval rules
    const rules = await prisma.approvalRule.findMany({
      where: {
        companyId: expense.companyId,
        isActive: true
      }
    });

    // Check if any approval was rejected
    const rejectedApproval = approvals.find(a => a.status === 'REJECTED');
    if (rejectedApproval) {
      return {
        finalDecision: 'REJECTED',
        reason: 'Rejected by approver',
        rejectedBy: rejectedApproval.approver?.fullName,
        comment: rejectedApproval.comment
      };
    }

    // Count approved and pending approvals
    const approvedApprovals = approvals.filter(a => a.status === 'APPROVED');
    const pendingApprovals = approvals.filter(a => a.status === 'PENDING');
    const totalApprovals = approvals.length;

    // Evaluate rules
    for (const rule of rules) {
      if (rule.ruleType === 'PERCENTAGE') {
        // Percentage-based approval
        const requiredApprovals = Math.ceil(totalApprovals * rule.threshold);
        if (approvedApprovals.length >= requiredApprovals) {
          return {
            finalDecision: 'APPROVED',
            reason: `Percentage rule satisfied (${Math.round(rule.threshold * 100)}% approval)`,
            approvedBy: approvedApprovals.map(a => a.approver?.fullName).join(', ')
          };
        }
      } else if (rule.ruleType === 'SPECIFIC') {
        // Specific approver rule
        if (rule.specificApproverId) {
          const specificApproval = approvals.find(a => a.approverId === rule.specificApproverId);
          if (specificApproval && specificApproval.status === 'APPROVED') {
            return {
              finalDecision: 'APPROVED',
              reason: 'Specific approver approved',
              approvedBy: specificApproval.approver?.fullName
            };
          }
        } else if (rule.specificRole) {
          const roleApproval = approvals.find(a => a.approverRole === rule.specificRole);
          if (roleApproval && roleApproval.status === 'APPROVED') {
            return {
              finalDecision: 'APPROVED',
              reason: `Specific role (${rule.specificRole}) approved`,
              approvedBy: roleApproval.approver?.fullName
            };
          }
        }
      } else if (rule.ruleType === 'HYBRID') {
        // Hybrid rule - check percentage OR specific approver
        const config = rule.config || {};
        const percentageThreshold = config.percentageThreshold || 0.5;
        const specificRole = config.specificRole;
        
        const requiredApprovals = Math.ceil(totalApprovals * percentageThreshold);
        const percentageSatisfied = approvedApprovals.length >= requiredApprovals;
        
        let specificSatisfied = false;
        if (specificRole) {
          const roleApproval = approvals.find(a => a.approverRole === specificRole);
          specificSatisfied = roleApproval && roleApproval.status === 'APPROVED';
        }
        
        if (percentageSatisfied || specificSatisfied) {
          return {
            finalDecision: 'APPROVED',
            reason: 'Hybrid rule satisfied',
            approvedBy: approvedApprovals.map(a => a.approver?.fullName).join(', ')
          };
        }
      }
    }

    // Default: if all approvals are complete and no rejections, approve
    if (pendingApprovals.length === 0 && approvedApprovals.length > 0) {
      return {
        finalDecision: 'APPROVED',
        reason: 'All approvals completed',
        approvedBy: approvedApprovals.map(a => a.approver?.fullName).join(', ')
      };
    }

    // Still pending
    return {
      finalDecision: null,
      reason: 'Awaiting more approvals',
      pendingApprovals: pendingApprovals.length,
      totalApprovals: totalApprovals
    };
  } catch (error) {
    console.error('Error evaluating approval rules:', error);
    throw error;
  }
}

module.exports = {
  createApprovalSequence,
  processApproval,
  evaluateApprovalRules
};

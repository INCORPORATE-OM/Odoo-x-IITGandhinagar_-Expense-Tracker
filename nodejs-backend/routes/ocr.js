const express = require('express');
const { processReceipt } = require('../utils/ocr');
const { uploadSingle } = require('../middleware/upload');

const router = express.Router();

/**
 * @route   POST /api/ocr/process-receipt
 * @desc    Process receipt image and extract expense information
 * @access  Private
 */
router.post('/process-receipt', uploadSingle('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No receipt file provided'
      });
    }

    // Process the receipt image
    const result = await processReceipt(req.file.path);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        extractedText: result.extractedText
      });
    }

    res.json({
      message: 'Receipt processed successfully',
      extractedText: result.extractedText,
      expenseInfo: result.expenseInfo,
      confidence: result.confidence
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    res.status(500).json({
      error: 'Failed to process receipt'
    });
  }
});

/**
 * @route   POST /api/ocr/validate-expense
 * @desc    Validate extracted expense information
 * @access  Private
 */
router.post('/validate-expense', async (req, res) => {
  try {
    const { expenseInfo } = req.body;

    if (!expenseInfo) {
      return res.status(400).json({
        error: 'Expense information is required'
      });
    }

    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Validate amount
    if (!expenseInfo.amount || expenseInfo.amount <= 0) {
      validation.errors.push('Amount is required and must be greater than 0');
      validation.isValid = false;
    }

    // Validate date
    if (!expenseInfo.date) {
      validation.warnings.push('Date could not be extracted from receipt');
    } else {
      const expenseDate = new Date(expenseInfo.date);
      const today = new Date();
      const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, today.getDate());
      
      if (expenseDate > today) {
        validation.warnings.push('Expense date is in the future');
      } else if (expenseDate < sixMonthsAgo) {
        validation.warnings.push('Expense date is more than 6 months old');
      }
    }

    // Validate category
    if (!expenseInfo.category) {
      validation.warnings.push('Category could not be automatically determined');
    }

    // Validate description
    if (!expenseInfo.description || expenseInfo.description.length < 3) {
      validation.warnings.push('Description is missing or too short');
    }

    res.json({
      validation: validation,
      expenseInfo: expenseInfo
    });
  } catch (error) {
    console.error('Expense validation error:', error);
    res.status(500).json({
      error: 'Failed to validate expense information'
    });
  }
});

module.exports = router;

const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

/**
 * Extract text from image using OCR
 * @param {string} imagePath - Path to the image file
 * @returns {Promise<string>} - Extracted text
 */
async function extractTextFromImage(imagePath) {
  try {
    const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    
    return text.trim();
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Parse expense information from OCR text
 * @param {string} text - Extracted text from OCR
 * @returns {Object} - Parsed expense information
 */
function parseExpenseFromText(text) {
  const expense = {
    amount: null,
    date: null,
    description: null,
    category: null
  };

  // Extract amount (various formats: $123.45, 123.45, USD 123.45, etc.)
  const amountRegex = /(?:[$€£¥₹]|USD|EUR|GBP|JPY|INR)\s*(\d+(?:\.\d{2})?)|(\d+(?:\.\d{2})?)\s*(?:[$€£¥₹]|USD|EUR|GBP|JPY|INR)/i;
  const amountMatch = text.match(amountRegex);
  if (amountMatch) {
    expense.amount = parseFloat(amountMatch[1] || amountMatch[2]);
  }

  // Extract date (various formats)
  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})|(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})/i;
  const dateMatch = text.match(dateRegex);
  if (dateMatch) {
    try {
      const dateStr = dateMatch[0];
      // Try to parse different date formats
      let parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        // Try alternative parsing
        parsedDate = new Date(dateStr.replace(/[\/\-\.]/g, '/'));
      }
      if (!isNaN(parsedDate.getTime())) {
        expense.date = parsedDate.toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Date parsing error:', error);
    }
  }

  // Extract description (first meaningful line, excluding amounts and dates)
  const lines = text.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 3 && 
           !trimmed.match(amountRegex) && 
           !trimmed.match(dateRegex) &&
           !trimmed.match(/^(receipt|invoice|bill|payment)/i);
  });
  
  if (lines.length > 0) {
    expense.description = lines[0].trim();
  }

  // Determine category based on keywords
  const categoryKeywords = {
    'Meals': ['restaurant', 'food', 'dining', 'meal', 'lunch', 'dinner', 'breakfast', 'cafe', 'coffee'],
    'Transportation': ['taxi', 'uber', 'lyft', 'flight', 'airline', 'train', 'bus', 'metro', 'gas', 'fuel', 'parking'],
    'Accommodation': ['hotel', 'motel', 'lodging', 'accommodation', 'airbnb'],
    'Office Supplies': ['office', 'supplies', 'stationery', 'paper', 'pen', 'pencil', 'stapler'],
    'Software': ['software', 'subscription', 'license', 'app', 'tool'],
    'Marketing': ['marketing', 'advertising', 'promotion', 'campaign', 'social media'],
    'Travel': ['travel', 'trip', 'conference', 'meeting', 'seminar', 'workshop']
  };

  const textLower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      expense.category = category;
      break;
    }
  }

  return expense;
}

/**
 * Process receipt image and extract expense information
 * @param {string} imagePath - Path to the receipt image
 * @returns {Promise<Object>} - Extracted expense information
 */
async function processReceipt(imagePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      throw new Error('Receipt file not found');
    }

    // Extract text using OCR
    const extractedText = await extractTextFromImage(imagePath);
    console.log('Extracted text:', extractedText);

    // Parse expense information from text
    const expenseInfo = parseExpenseFromText(extractedText);

    return {
      success: true,
      extractedText,
      expenseInfo,
      confidence: expenseInfo.amount ? 'high' : 'medium'
    };
  } catch (error) {
    console.error('Receipt processing error:', error);
    return {
      success: false,
      error: error.message,
      extractedText: null,
      expenseInfo: null
    };
  }
}

module.exports = {
  extractTextFromImage,
  parseExpenseFromText,
  processReceipt
};

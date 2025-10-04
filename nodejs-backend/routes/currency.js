const express = require('express');
const { 
  getAllCurrencies, 
  getAllCountries, 
  getExchangeRate, 
  convertAmount,
  detectCurrencyForCountry 
} = require('../utils/currency');

const router = express.Router();

/**
 * @route   GET /api/currency/currencies
 * @desc    Get all available currencies
 * @access  Public
 */
router.get('/currencies', async (req, res) => {
  try {
    const currencies = await getAllCurrencies();
    
    res.json({
      currencies: currencies
    });
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({
      error: 'Failed to fetch currencies'
    });
  }
});

/**
 * @route   GET /api/currency/countries
 * @desc    Get all countries with their currencies
 * @access  Public
 */
router.get('/countries', async (req, res) => {
  try {
    const countries = await getAllCountries();
    
    res.json({
      countries: countries
    });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({
      error: 'Failed to fetch countries'
    });
  }
});

/**
 * @route   GET /api/currency/rate/:base/:target
 * @desc    Get exchange rate between two currencies
 * @access  Public
 */
router.get('/rate/:base/:target', async (req, res) => {
  try {
    const { base, target } = req.params;
    
    if (!base || !target || base.length !== 3 || target.length !== 3) {
      return res.status(400).json({
        error: 'Invalid currency codes provided'
      });
    }

    const rate = await getExchangeRate(base.toUpperCase(), target.toUpperCase());
    
    if (rate === null) {
      return res.status(400).json({
        error: 'Exchange rate not available'
      });
    }

    res.json({
      base: base.toUpperCase(),
      target: target.toUpperCase(),
      rate: rate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get exchange rate error:', error);
    res.status(500).json({
      error: 'Failed to fetch exchange rate'
    });
  }
});

/**
 * @route   POST /api/currency/convert
 * @desc    Convert amount from one currency to another
 * @access  Public
 */
router.post('/convert', async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        error: 'Amount, fromCurrency, and toCurrency are required'
      });
    }

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        error: 'Amount must be a positive number'
      });
    }

    if (fromCurrency.length !== 3 || toCurrency.length !== 3) {
      return res.status(400).json({
        error: 'Currency codes must be 3 characters long'
      });
    }

    const convertedAmount = await convertAmount(
      parseFloat(amount),
      fromCurrency.toUpperCase(),
      toCurrency.toUpperCase()
    );

    if (convertedAmount === null) {
      return res.status(400).json({
        error: 'Currency conversion not available'
      });
    }

    res.json({
      originalAmount: parseFloat(amount),
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      convertedAmount: convertedAmount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({
      error: 'Failed to convert currency'
    });
  }
});

/**
 * @route   POST /api/currency/detect
 * @desc    Detect currency for a given country
 * @access  Public
 */
router.post('/detect', async (req, res) => {
  try {
    const { country } = req.body;

    if (!country) {
      return res.status(400).json({
        error: 'Country name is required'
      });
    }

    const currency = await detectCurrencyForCountry(country);
    
    res.json({
      country: country,
      currency: currency,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Currency detection error:', error);
    res.status(500).json({
      error: 'Failed to detect currency'
    });
  }
});

module.exports = router;

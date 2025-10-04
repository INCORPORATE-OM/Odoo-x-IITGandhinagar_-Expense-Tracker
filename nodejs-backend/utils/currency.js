const axios = require('axios');

const RESTCOUNTRIES_API = process.env.RESTCOUNTRIES_API || 'https://restcountries.com/v3.1/all?fields=name,currencies';
const EXCHANGE_RATE_API = process.env.EXCHANGE_RATE_API || 'https://api.exchangerate-api.com/v4/latest';

/**
 * Detect currency for a given country
 * @param {string} countryName - Name of the country
 * @returns {Promise<string|null>} - Currency code or null if not found
 */
async function detectCurrencyForCountry(countryName) {
  try {
    const response = await axios.get(RESTCOUNTRIES_API, { timeout: 10000 });
    const countries = response.data;

    // Find country by name (case-insensitive, partial match)
    const country = countries.find(entry => {
      const name = entry.name?.common || '';
      return name.toLowerCase().includes(countryName.toLowerCase()) ||
             countryName.toLowerCase().includes(name.toLowerCase());
    });

    if (country && country.currencies) {
      // Return the first currency code
      return Object.keys(country.currencies)[0];
    }

    return null;
  } catch (error) {
    console.error('Error detecting currency for country:', error.message);
    return null;
  }
}

/**
 * Get exchange rate between two currencies
 * @param {string} baseCurrency - Base currency code
 * @param {string} targetCurrency - Target currency code
 * @returns {Promise<number|null>} - Exchange rate or null if error
 */
async function getExchangeRate(baseCurrency, targetCurrency) {
  if (baseCurrency === targetCurrency) {
    return 1.0;
  }

  try {
    const response = await axios.get(`${EXCHANGE_RATE_API}/${baseCurrency}`, { 
      timeout: 10000 
    });
    
    const rates = response.data.rates;
    if (rates && rates[targetCurrency]) {
      return rates[targetCurrency];
    }

    return null;
  } catch (error) {
    console.error('Error getting exchange rate:', error.message);
    return null;
  }
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {Promise<number|null>} - Converted amount or null if error
 */
async function convertAmount(amount, fromCurrency, toCurrency) {
  try {
    const rate = await getExchangeRate(fromCurrency, toCurrency);
    if (rate === null) {
      return null;
    }
    
    return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error converting amount:', error.message);
    return null;
  }
}

/**
 * Get all available currencies from countries API
 * @returns {Promise<Array>} - Array of currency objects
 */
async function getAllCurrencies() {
  try {
    const response = await axios.get(RESTCOUNTRIES_API, { timeout: 10000 });
    const countries = response.data;
    
    const currencies = new Set();
    countries.forEach(country => {
      if (country.currencies) {
        Object.keys(country.currencies).forEach(currency => {
          currencies.add(currency);
        });
      }
    });

    return Array.from(currencies).sort();
  } catch (error) {
    console.error('Error getting all currencies:', error.message);
    return [];
  }
}

/**
 * Get all countries with their currencies
 * @returns {Promise<Array>} - Array of country objects with currencies
 */
async function getAllCountries() {
  try {
    const response = await axios.get(RESTCOUNTRIES_API, { timeout: 10000 });
    return response.data.map(country => ({
      name: country.name?.common || '',
      currencies: country.currencies ? Object.keys(country.currencies) : []
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error getting all countries:', error.message);
    return [];
  }
}

module.exports = {
  detectCurrencyForCountry,
  getExchangeRate,
  convertAmount,
  getAllCurrencies,
  getAllCountries
};

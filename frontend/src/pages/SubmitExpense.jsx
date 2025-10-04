import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import API from '../api/client'
import toast from 'react-hot-toast'
import {
  CameraIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'

const SubmitExpense = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [receiptFile, setReceiptFile] = useState(null)
  const [receiptPreview, setReceiptPreview] = useState(null)
  const [extractedData, setExtractedData] = useState(null)
  const [currencies, setCurrencies] = useState([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    defaultValues: {
      originalAmount: '',
      originalCurrency: user?.company?.currency || 'USD',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    }
  })

  const watchedAmount = watch('originalAmount')
  const watchedCurrency = watch('originalCurrency')

  useEffect(() => {
    loadCurrencies()
  }, [])

  const loadCurrencies = async () => {
    try {
      const response = await API.get('/currency/currencies')
      setCurrencies(response.data.currencies)
    } catch (error) {
      console.error('Failed to load currencies:', error)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setReceiptFile(file)
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setReceiptPreview(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const processReceipt = async () => {
    if (!receiptFile) {
      toast.error('Please select a receipt file first')
      return
    }

    setOcrLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('receipt', receiptFile)

      const response = await API.post('/ocr/process-receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const { expenseInfo } = response.data
      setExtractedData(expenseInfo)

      // Auto-fill form with extracted data
      if (expenseInfo.amount) {
        setValue('originalAmount', expenseInfo.amount)
      }
      if (expenseInfo.date) {
        setValue('date', expenseInfo.date)
      }
      if (expenseInfo.category) {
        setValue('category', expenseInfo.category)
      }
      if (expenseInfo.description) {
        setValue('description', expenseInfo.description)
      }

      toast.success('Receipt processed successfully!')
    } catch (error) {
      console.error('OCR processing failed:', error)
      toast.error('Failed to process receipt. Please fill the form manually.')
    } finally {
      setOcrLoading(false)
    }
  }

  const onSubmit = async (data) => {
    setLoading(true)
    
    try {
      const formData = new FormData()
      
      // Add expense data
      Object.keys(data).forEach(key => {
        formData.append(key, data[key])
      })

      // Add receipt file if exists
      if (receiptFile) {
        formData.append('receipt', receiptFile)
      }

      const response = await API.post('/expenses', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      toast.success('Expense submitted successfully!')
      
      // Reset form
      setReceiptFile(null)
      setReceiptPreview(null)
      setExtractedData(null)
      
      // Reset form values
      setValue('originalAmount', '')
      setValue('category', '')
      setValue('description', '')
      setValue('date', new Date().toISOString().split('T')[0])
      
    } catch (error) {
      console.error('Submit expense failed:', error)
      const errorMessage = error.response?.data?.error || 'Failed to submit expense'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const removeReceipt = () => {
    setReceiptFile(null)
    setReceiptPreview(null)
    setExtractedData(null)
  }

  const expenseCategories = [
    'Meals',
    'Transportation',
    'Accommodation',
    'Office Supplies',
    'Software',
    'Marketing',
    'Travel',
    'Other'
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Submit Expense</h1>
        <p className="text-gray-600 mt-2">Submit a new expense claim with receipt</p>
      </div>

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Receipt Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Receipt Upload</h3>
              
              {!receiptFile ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <CameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <div className="flex justify-center">
                      <label className="btn btn-primary cursor-pointer">
                        <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                        Upload Receipt
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Upload a receipt image or PDF (max 5MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <DocumentArrowUpIcon className="h-8 w-8 text-primary-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{receiptFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeReceipt}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>

                  {receiptPreview && (
                    <div className="text-center">
                      <img
                        src={receiptPreview}
                        alt="Receipt preview"
                        className="max-h-64 mx-auto rounded-lg shadow-sm border border-gray-200"
                      />
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={processReceipt}
                      disabled={ocrLoading}
                      className="btn btn-secondary flex-1"
                    >
                      {ocrLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                          Processing...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <SparklesIcon className="h-4 w-4 mr-2" />
                          Extract Data with OCR
                        </div>
                      )}
                    </button>
                    <label className="btn btn-outline flex-1 cursor-pointer">
                      <DocumentArrowUpIcon className="h-4 w-4 mr-2" />
                      Change File
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Extracted Data Display */}
            {extractedData && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-primary-900 mb-2">Extracted Data:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {extractedData.amount && (
                    <div>
                      <span className="text-primary-700">Amount:</span>
                      <span className="ml-2 text-primary-900">{extractedData.amount}</span>
                    </div>
                  )}
                  {extractedData.date && (
                    <div>
                      <span className="text-primary-700">Date:</span>
                      <span className="ml-2 text-primary-900">{extractedData.date}</span>
                    </div>
                  )}
                  {extractedData.category && (
                    <div>
                      <span className="text-primary-700">Category:</span>
                      <span className="ml-2 text-primary-900">{extractedData.category}</span>
                    </div>
                  )}
                  {extractedData.description && (
                    <div className="col-span-2">
                      <span className="text-primary-700">Description:</span>
                      <span className="ml-2 text-primary-900">{extractedData.description}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Expense Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Amount *</label>
                <input
                  {...register('originalAmount', { 
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  })}
                  type="number"
                  step="0.01"
                  className="input"
                  placeholder="0.00"
                />
                {errors.originalAmount && (
                  <p className="text-danger-600 text-sm mt-1">{errors.originalAmount.message}</p>
                )}
              </div>

              <div>
                <label className="label">Currency *</label>
                <select {...register('originalCurrency')} className="input">
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Category *</label>
              <select
                {...register('category', { required: 'Category is required' })}
                className="input"
              >
                <option value="">Select a category</option>
                {expenseCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-danger-600 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label className="label">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="input"
                placeholder="Enter expense description..."
              />
            </div>

            <div>
              <label className="label">Date *</label>
              <input
                {...register('date', { required: 'Date is required' })}
                type="date"
                className="input"
              />
              {errors.date && (
                <p className="text-danger-600 text-sm mt-1">{errors.date.message}</p>
              )}
            </div>

            {/* Company Currency Conversion Display */}
            {watchedAmount && watchedCurrency !== user?.company?.currency && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Currency Conversion:</h4>
                <p className="text-sm text-gray-600">
                  {watchedCurrency} {watchedAmount} ≈ {user?.company?.currency} (conversion rate will be applied)
                </p>
              </div>
            )}

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg flex-1"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  'Submit Expense'
                )}
              </button>
            </div>
      </form>
        </div>
      </div>
    </div>
  )
}

export default SubmitExpense
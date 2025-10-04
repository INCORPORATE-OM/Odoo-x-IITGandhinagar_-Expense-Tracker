import React, { createContext, useContext, useReducer, useEffect } from 'react'
import API from '../api/client'
import toast from 'react-hot-toast'

const AuthContext = createContext()

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, loading: true, error: null }
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        loading: false,
        isAuthenticated: true,
        user: action.payload.user,
        token: action.payload.token,
        error: null
      }
    case 'LOGIN_FAILURE':
      return {
        ...state,
        loading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        error: action.payload
      }
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        token: null,
        error: null
      }
    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }
    case 'CLEAR_ERROR':
      return { ...state, error: null }
    default:
      return state
  }
}

// Initial state
const initialState = {
  isAuthenticated: false,
  user: null,
  token: localStorage.getItem('token'),
  loading: true,
  error: null
}

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Set token in API client
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      // Verify token and get user info
      verifyToken()
    } else {
      dispatch({ type: 'LOGIN_FAILURE', payload: null })
    }
  }, [])

  const verifyToken = async () => {
    try {
      const response = await API.get('/auth/me')
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: {
          user: response.data.user,
          token: localStorage.getItem('token')
        }
      })
    } catch (error) {
      console.error('Token verification failed:', error)
      localStorage.removeItem('token')
      delete API.defaults.headers.common['Authorization']
      dispatch({ type: 'LOGIN_FAILURE', payload: null })
    }
  }

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      const response = await API.post('/auth/login', credentials)
      const { token, user } = response.data
      
      // Store token in localStorage
      localStorage.setItem('token', token)
      
      // Set token in API client
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      })
      
      toast.success('Login successful!')
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed'
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const signup = async (userData) => {
    dispatch({ type: 'LOGIN_START' })
    
    try {
      const response = await API.post('/auth/signup', userData)
      const { token, user } = response.data
      
      // Store token in localStorage
      localStorage.setItem('token', token)
      
      // Set token in API client
      API.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token }
      })
      
      toast.success('Account created successfully!')
      return { success: true }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Signup failed'
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage })
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    delete API.defaults.headers.common['Authorization']
    dispatch({ type: 'LOGOUT' })
    toast.success('Logged out successfully')
  }

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData })
  }

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  const hasRole = (requiredRoles) => {
    if (!state.user) return false
    
    const userRole = state.user.role
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(userRole)
    }
    return userRole === requiredRoles
  }

  const isAdmin = () => hasRole('ADMIN')
  const isManager = () => hasRole(['ADMIN', 'MANAGER'])
  const isEmployee = () => hasRole('EMPLOYEE')

  const value = {
    ...state,
    login,
    signup,
    logout,
    updateUser,
    clearError,
    hasRole,
    isAdmin,
    isManager,
    isEmployee
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext

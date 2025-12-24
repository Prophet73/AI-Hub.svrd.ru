import axios from 'axios'

export const api = axios.create({
  baseURL: '',
  withCredentials: true, // Important for cookies
})

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if not already on login page (prevent infinite loop)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

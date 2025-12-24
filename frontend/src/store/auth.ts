import { create } from 'zustand'
import { api } from '../api/client'

interface User {
  id: string
  email: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  middle_name: string | null
  department: string | null
  job_title: string | null
  is_admin: boolean
  is_super_admin: boolean
}

interface AuthState {
  user: User | null
  isLoading: boolean
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,

  checkAuth: async () => {
    try {
      const response = await api.get<User>('/auth/me')
      set({ user: response.data, isLoading: false })
    } catch {
      set({ user: null, isLoading: false })
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      set({ user: null })
      window.location.href = '/login'
    }
  },
}))

// Check auth on app load
useAuthStore.getState().checkAuth()

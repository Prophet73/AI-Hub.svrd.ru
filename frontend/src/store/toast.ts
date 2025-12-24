import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

interface ToastStore {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (type, message, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    set((state) => ({
      toasts: [...state.toasts, { id, type, message, duration }],
    }))

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, duration)
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  success: (message) => {
    const { addToast } = useToastStore.getState()
    addToast('success', message)
  },

  error: (message) => {
    const { addToast } = useToastStore.getState()
    addToast('error', message)
  },

  warning: (message) => {
    const { addToast } = useToastStore.getState()
    addToast('warning', message)
  },

  info: (message) => {
    const { addToast } = useToastStore.getState()
    addToast('info', message)
  },
}))

// Helper function for use outside React components
export const toast = {
  success: (message: string) => useToastStore.getState().success(message),
  error: (message: string) => useToastStore.getState().error(message),
  warning: (message: string) => useToastStore.getState().warning(message),
  info: (message: string) => useToastStore.getState().info(message),
}

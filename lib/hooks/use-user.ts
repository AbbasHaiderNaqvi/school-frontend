'use client'

import { useAuth } from '@/contexts/auth-context'

export function useUser() {
  const auth = useAuth()
  return {
    user: auth.user,
    isLoading: auth.isLoading,
    login: auth.login,
    logout: auth.logout,
  }
}

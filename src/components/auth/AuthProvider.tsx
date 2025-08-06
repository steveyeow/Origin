'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth0Service, AuthUser } from '@/services/auth/auth0-service'

interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login: () => void
  logout: () => void
  isAuthenticated: boolean
  hasSubscriptionTier: (tier: 'free' | 'basic' | 'pro') => boolean
  canUseVoice: () => boolean
  getVoiceCredits: () => number
  updateUserMetadata: (metadata: Record<string, any>) => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(false) // Set to false for mock
  const router = useRouter()

  useEffect(() => {
    // For development, start with no user to test login flow
    console.log('🔐 AuthProvider: Initializing with no user')
    setUser(null)
    setIsLoading(false)
  }, [])
  
  // Login is now handled directly in the login() function

  const login = () => {
    console.log('🚀 AuthProvider: Login triggered - simulating successful auth')
    
    // For development, directly set mock user instead of redirecting
    const mockUser: AuthUser = {
      sub: 'mock-user-123',
      name: 'Mock User',
      email: 'mock@example.com',
      subscription_tier: 'free',
      voice_credits: 5,
      total_usage: 0,
    }
    
    setUser(mockUser)
    console.log('✅ AuthProvider: Mock user set successfully')
  }

  const logout = () => {
    router.push('/api/auth/logout')
  }

  const hasSubscriptionTier = (tier: 'free' | 'basic' | 'pro') => {
    return auth0Service.hasSubscriptionTier(user, tier)
  }

  const canUseVoice = () => {
    return auth0Service.canUseVoice(user)
  }

  const getVoiceCredits = () => {
    return auth0Service.getVoiceCredits(user)
  }

  const updateUserMetadata = async (metadata: Record<string, any>) => {
    if (!user) return false
    return await auth0Service.updateUserMetadata(user.sub, metadata)
  }

  const value = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
    hasSubscriptionTier,
    canUseVoice,
    getVoiceCredits,
    updateUserMetadata
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

import { User } from '@auth0/nextjs-auth0/types'

export interface AuthUser extends User {
  sub: string
  email?: string
  name?: string
  picture?: string
  email_verified?: boolean
  // Custom claims
  subscription_tier?: 'free' | 'basic' | 'pro'
  voice_credits?: number
  total_usage?: number
}

export interface AuthState {
  user: AuthUser | null
  isLoading: boolean
  error: string | null
}

export class Auth0Service {
  private static instance: Auth0Service
  
  static getInstance(): Auth0Service {
    if (!Auth0Service.instance) {
      Auth0Service.instance = new Auth0Service()
    }
    return Auth0Service.instance
  }

  /**
   * Get user profile with subscription info
   */
  async getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch user profile')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  /**
   * Update user metadata (subscription info, preferences)
   */
  async updateUserMetadata(userId: string, metadata: Record<string, any>): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/update-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, metadata }),
      })

      return response.ok
    } catch (error) {
      console.error('Error updating user metadata:', error)
      return false
    }
  }

  /**
   * Check if user has required subscription tier
   */
  hasSubscriptionTier(user: AuthUser | null, requiredTier: 'free' | 'basic' | 'pro'): boolean {
    if (!user) return false
    
    const tierLevels = { free: 0, basic: 1, pro: 2 }
    const userTier = user.subscription_tier || 'free'
    
    return tierLevels[userTier] >= tierLevels[requiredTier]
  }

  /**
   * Get user's remaining voice credits
   */
  getVoiceCredits(user: AuthUser | null): number {
    if (!user) return 0
    return user.voice_credits || 0
  }

  /**
   * Check if user can use voice features
   */
  canUseVoice(user: AuthUser | null): boolean {
    if (!user) return false
    
    // Pro users have unlimited voice
    if (user.subscription_tier === 'pro') return true
    
    // Basic users have high limits
    if (user.subscription_tier === 'basic') return (user.voice_credits || 0) > 0
    
    // Free users have 6000 credits
    return (user.voice_credits || 6000) > 0
  }
}

export const auth0Service = Auth0Service.getInstance()

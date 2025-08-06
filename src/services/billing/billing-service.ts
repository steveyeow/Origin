import { Capability } from '@/types/engine'

// Billing configuration
export interface BillingConfig {
  // Monthly credit allocations
  freeMonthlyCredits: number
  basicMonthlyCredits: number
  proMonthlyCredits: number
  
  // Pricing tiers
  basicPriceMonthly: number
  proPriceMonthly: number
  yearlyDiscount: number // percentage
}

export interface ModelCost {
  id: string
  name: string
  type: 'text' | 'image' | 'video' | 'voice' | 'agent' | 'tool' | 'effect'
  baseCost: number // Our cost per use
  userCost: number // What we charge user (includes profit margin)
  unit: 'per_request' | 'per_token' | 'per_second' | 'per_image' | 'per_video'
}

export interface UsageRecord {
  userId: string
  capabilityId: string
  modelId: string
  cost: number
  timestamp: Date
  metadata?: {
    tokens?: number
    duration?: number
    size?: string
    quality?: string
  }
}

export interface UserBilling {
  userId: string
  subscriptionTier: 'free' | 'basic' | 'pro'
  monthlyCredits: number
  usedCredits: number
  resetDate: Date
  totalSpent: number
  usageHistory: UsageRecord[]
}

class BillingService {
  private static instance: BillingService
  
  private config: BillingConfig = {
    freeMonthlyCredits: 6000,
    basicMonthlyCredits: 500000,
    proMonthlyCredits: 1000000,
    basicPriceMonthly: 9.9,
    proPriceMonthly: 19.9,
    yearlyDiscount: 0.17 // 17% discount for yearly
  }

  // Model costs with profit margins
  private modelCosts: ModelCost[] = [
    // Text Models
    {
      id: 'openai-gpt-4',
      name: 'GPT-4',
      type: 'text',
      baseCost: 0.03, // per 1k tokens
      userCost: 0.05, // 67% markup
      unit: 'per_token'
    },
    {
      id: 'openai-gpt-3.5-turbo',
      name: 'GPT-3.5 Turbo',
      type: 'text',
      baseCost: 0.002,
      userCost: 0.004,
      unit: 'per_token'
    },
    
    // Image Models
    {
      id: 'openai-dall-e-3',
      name: 'DALL-E 3',
      type: 'image',
      baseCost: 0.04, // per image
      userCost: 0.08,
      unit: 'per_image'
    },
    {
      id: 'midjourney-v6',
      name: 'Midjourney V6',
      type: 'image',
      baseCost: 0.02,
      userCost: 0.05,
      unit: 'per_image'
    },
    {
      id: 'fal-ai-flux-pro-v1.1',
      name: 'Flux 1.1 Pro',
      type: 'image',
      baseCost: 0.05, // per image
      userCost: 0.10,
      unit: 'per_image'
    },
    {
      id: 'fal-ai-flux-pro-v1.0',
      name: 'Flux 1.0 Pro',
      type: 'image',
      baseCost: 0.04, // per image
      userCost: 0.08,
      unit: 'per_image'
    },
    
    // Voice Models
    {
      id: 'elevenlabs-voice',
      name: 'ElevenLabs Voice',
      type: 'voice',
      baseCost: 0.18, // per 1k characters
      userCost: 0.30,
      unit: 'per_request'
    },
    
    // Video Models
    {
      id: 'runway-gen2',
      name: 'Runway Gen-2',
      type: 'video',
      baseCost: 0.05, // per second
      userCost: 0.10,
      unit: 'per_second'
    },
    {
      id: 'pika-labs',
      name: 'Pika Labs',
      type: 'video',
      baseCost: 0.03,
      userCost: 0.07,
      unit: 'per_second'
    },
    
    // Agents & Tools
    {
      id: 'web-search-agent',
      name: 'Web Search Agent',
      type: 'agent',
      baseCost: 0.01,
      userCost: 0.02,
      unit: 'per_request'
    },
    {
      id: 'code-analysis-tool',
      name: 'Code Analysis Tool',
      type: 'tool',
      baseCost: 0.005,
      userCost: 0.01,
      unit: 'per_request'
    },
    
    // Effects
    {
      id: 'image-upscale-effect',
      name: 'Image Upscale Effect',
      type: 'effect',
      baseCost: 0.02,
      userCost: 0.04,
      unit: 'per_image'
    }
  ]

  public static getInstance(): BillingService {
    if (!BillingService.instance) {
      BillingService.instance = new BillingService()
    }
    return BillingService.instance
  }

  // Get model cost by capability ID
  public getModelCost(capabilityId: string): ModelCost | null {
    return this.modelCosts.find(cost => cost.id === capabilityId) || null
  }

  // Calculate cost for a capability usage
  public calculateUsageCost(
    capabilityId: string, 
    usage: {
      tokens?: number
      duration?: number
      requests?: number
      images?: number
    }
  ): number {
    const modelCost = this.getModelCost(capabilityId)
    if (!modelCost) return 0

    switch (modelCost.unit) {
      case 'per_token':
        return (usage.tokens || 0) * modelCost.userCost / 1000
      case 'per_second':
        return (usage.duration || 0) * modelCost.userCost
      case 'per_request':
        return (usage.requests || 1) * modelCost.userCost
      case 'per_image':
        return (usage.images || 1) * modelCost.userCost
      case 'per_video':
        return (usage.duration || 0) * modelCost.userCost
      default:
        return modelCost.userCost
    }
  }

  // Check if user has sufficient credits
  public async checkCredits(userId: string, requiredCredits: number): Promise<boolean> {
    const userBilling = await this.getUserBilling(userId)
    return (userBilling.monthlyCredits - userBilling.usedCredits) >= requiredCredits
  }

  // Deduct credits from user account
  public async deductCredits(
    userId: string, 
    capabilityId: string, 
    cost: number,
    metadata?: any
  ): Promise<{ success: boolean; remainingCredits: number }> {
    try {
      const userBilling = await this.getUserBilling(userId)
      
      if (userBilling.usedCredits + cost > userBilling.monthlyCredits) {
        return { success: false, remainingCredits: userBilling.monthlyCredits - userBilling.usedCredits }
      }

      // Record usage
      const usageRecord: UsageRecord = {
        userId,
        capabilityId,
        modelId: capabilityId,
        cost,
        timestamp: new Date(),
        metadata
      }

      // Update user billing (this would typically be a database operation)
      await this.updateUserBilling(userId, {
        usedCredits: userBilling.usedCredits + cost,
        totalSpent: userBilling.totalSpent + cost,
        usageHistory: [...userBilling.usageHistory, usageRecord]
      })

      return { 
        success: true, 
        remainingCredits: userBilling.monthlyCredits - (userBilling.usedCredits + cost) 
      }
    } catch (error) {
      console.error('Error deducting credits:', error)
      return { success: false, remainingCredits: 0 }
    }
  }



  // Update user billing information
  private async updateUserBilling(userId: string, updates: Partial<UserBilling>): Promise<void> {
    // This would typically update database
    console.log('Updating user billing:', userId, updates)
  }

  // Reset monthly credits (called by cron job)
  public async resetMonthlyCredits(userId: string): Promise<void> {
    const userBilling = await this.getUserBilling(userId)
    const newCredits = this.getMonthlyCredits(userBilling.subscriptionTier)
    
    await this.updateUserBilling(userId, {
      usedCredits: 0,
      monthlyCredits: newCredits,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })
  }

  // Get monthly credits by subscription tier
  public getMonthlyCredits(tier: 'free' | 'basic' | 'pro'): number {
    switch (tier) {
      case 'free': return 6000
      case 'basic': return 500000
      case 'pro': return 1000000
      default: return 6000
    }
  }

  // Get user billing information
  public async getUserBilling(userId: string): Promise<UserBilling> {
    // This would typically fetch from database
    // For now, return mock data
    return {
      userId,
      subscriptionTier: 'free',
      monthlyCredits: this.getMonthlyCredits('free'),
      usedCredits: 0,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      totalSpent: 0,
      usageHistory: []
    }
  }

  // Get pricing information
  public getPricing() {
    return {
      free: {
        credits: 6000,
        monthly: 0
      },
      basic: {
        credits: 500000,
        monthly: 9.90
      },
      pro: {
        credits: 1000000,
        monthly: 19.90
      }
    }
  }

  // Get all model costs for display
  public getAllModelCosts() {
    return this.modelCosts
  }
}

export const billingService = BillingService.getInstance()
export default BillingService

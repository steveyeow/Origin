export interface UsageRecord {
  id: string
  userId: string
  modelId: string
  modelName: string
  type: 'text' | 'image' | 'video' | 'voice'
  cost: number
  credits: number
  metadata: {
    prompt?: string
    outputSize?: number
    duration?: number
    resolution?: string
    tokensUsed?: number
  }
  timestamp: Date
}

export interface UsageSummary {
  totalCost: number
  totalCredits: number
  byModel: Record<string, {
    count: number
    cost: number
    credits: number
  }>
  byType: Record<string, {
    count: number
    cost: number
    credits: number
  }>
  period: {
    start: Date
    end: Date
  }
}

export class UsageTracker {
  private records: UsageRecord[] = []

  /**
   * Track model usage
   */
  async trackUsage(
    userId: string,
    modelId: string,
    modelName: string,
    type: 'text' | 'image' | 'video' | 'voice',
    cost: number,
    metadata: UsageRecord['metadata'] = {}
  ): Promise<void> {
    const record: UsageRecord = {
      id: this.generateId(),
      userId,
      modelId,
      modelName,
      type,
      cost,
      credits: Math.ceil(cost * 100), // Convert to credits (1 credit = $0.01)
      metadata,
      timestamp: new Date()
    }

    this.records.push(record)
    
    // In production, this would be saved to database
    console.log('📊 Usage tracked:', {
      model: modelName,
      type,
      cost: `$${cost.toFixed(3)}`,
      credits: record.credits
    })

    // TODO: Send to analytics service
    // TODO: Update user's credit balance
    // TODO: Check subscription limits
  }

  /**
   * Get usage summary for a user
   */
  async getUserUsage(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UsageSummary> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
    const end = endDate || new Date()

    const userRecords = this.records.filter(record => 
      record.userId === userId &&
      record.timestamp >= start &&
      record.timestamp <= end
    )

    const summary: UsageSummary = {
      totalCost: 0,
      totalCredits: 0,
      byModel: {},
      byType: {},
      period: { start, end }
    }

    for (const record of userRecords) {
      // Total
      summary.totalCost += record.cost
      summary.totalCredits += record.credits

      // By model
      if (!summary.byModel[record.modelId]) {
        summary.byModel[record.modelId] = { count: 0, cost: 0, credits: 0 }
      }
      summary.byModel[record.modelId].count++
      summary.byModel[record.modelId].cost += record.cost
      summary.byModel[record.modelId].credits += record.credits

      // By type
      if (!summary.byType[record.type]) {
        summary.byType[record.type] = { count: 0, cost: 0, credits: 0 }
      }
      summary.byType[record.type].count++
      summary.byType[record.type].cost += record.cost
      summary.byType[record.type].credits += record.credits
    }

    return summary
  }

  /**
   * Check if user can afford an operation
   */
  async canAffordOperation(
    userId: string,
    estimatedCost: number,
    userCredits: number
  ): Promise<{
    canAfford: boolean
    requiredCredits: number
    currentCredits: number
    shortfall?: number
  }> {
    const requiredCredits = Math.ceil(estimatedCost * 100)
    const canAfford = userCredits >= requiredCredits

    const result = {
      canAfford,
      requiredCredits,
      currentCredits: userCredits
    }

    if (!canAfford) {
      return {
        ...result,
        shortfall: requiredCredits - userCredits
      }
    }

    return result
  }

  /**
   * Get cost breakdown for different models
   */
  async getModelCosts(): Promise<Record<string, {
    name: string
    type: string
    costPerUse: number
    description: string
  }>> {
    return {
      'openai-gpt-4': {
        name: 'GPT-4',
        type: 'text',
        costPerUse: 0.03,
        description: 'Advanced text generation and analysis'
      },
      'dalle-3': {
        name: 'DALL-E 3',
        type: 'image',
        costPerUse: 0.08,
        description: 'High-quality image generation'
      },
      'midjourney-v6': {
        name: 'Midjourney v6',
        type: 'image',
        costPerUse: 0.12,
        description: 'Artistic image generation'
      },
      'runway-gen3': {
        name: 'Runway Gen-3',
        type: 'video',
        costPerUse: 2.50,
        description: 'Realistic video generation (5-10 seconds)'
      },
      'pika-labs-v1': {
        name: 'Pika Labs v1',
        type: 'video',
        costPerUse: 1.50,
        description: 'Artistic video generation (4-8 seconds)'
      },
      'elevenlabs-voice': {
        name: 'ElevenLabs Voice',
        type: 'voice',
        costPerUse: 0.02,
        description: 'Natural voice synthesis per message'
      }
    }
  }

  /**
   * Generate usage report
   */
  async generateUsageReport(
    userId: string,
    period: 'day' | 'week' | 'month' = 'month'
  ): Promise<{
    summary: UsageSummary
    topModels: Array<{ name: string; usage: number; cost: number }>
    trends: Array<{ date: string; cost: number; count: number }>
  }> {
    const days = period === 'day' ? 1 : period === 'week' ? 7 : 30
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    const summary = await this.getUserUsage(userId, startDate)
    
    // Top models by usage
    const topModels = Object.entries(summary.byModel)
      .map(([modelId, data]) => ({
        name: modelId,
        usage: data.count,
        cost: data.cost
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)

    // Daily trends (simplified)
    const trends = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dayRecords = this.records.filter(record => 
        record.userId === userId &&
        record.timestamp.toDateString() === date.toDateString()
      )
      
      trends.push({
        date: date.toISOString().split('T')[0],
        cost: dayRecords.reduce((sum, record) => sum + record.cost, 0),
        count: dayRecords.length
      })
    }

    return {
      summary,
      topModels,
      trends
    }
  }

  private generateId(): string {
    return `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// Singleton instance
export const usageTracker = new UsageTracker()

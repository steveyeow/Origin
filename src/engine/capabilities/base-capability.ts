import type { Capability, CapabilityMetadata } from '../../types/engine'

/**
 * Base class for all capabilities
 * Provides common functionality and standardized patterns
 */
export abstract class BaseCapability implements Capability {
  abstract id: string
  abstract name: string
  abstract type: 'model' | 'agent' | 'tool' | 'effect'
  abstract description: string
  abstract version: string
  abstract provider: string
  abstract capabilities: string[]
  
  // Standard metadata structure
  metadata: CapabilityMetadata = {
    costPerUse: 0,
    averageLatency: 1000,
    qualityScore: 0.8,
    supportedFormats: [],
    limitations: [],
    examples: []
  }
  
  status: 'active' | 'inactive' | 'maintenance' = 'active'
  
  /**
   * Standard cost calculation - converts USD to credits
   */
  protected calculateCredits(cost: number): number {
    return Math.ceil(cost * 100) // 1 credit = $0.01
  }
  
  /**
   * Standard error handling
   */
  protected handleError(error: any, operation: string): never {
    console.error(`${this.name} ${operation} failed:`, error)
    throw new Error(`${operation} failed: ${error}`)
  }
  
  /**
   * Standard token estimation for text-based models
   */
  protected estimateTokens(text: string): number {
    return Math.ceil(text.length / 4) // Rough estimation: ~4 characters per token
  }
  
  /**
   * Standard latency simulation for development/testing
   */
  protected async simulateLatency(): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      const latency = this.metadata.averageLatency || 1000
      await new Promise(resolve => setTimeout(resolve, Math.random() * latency))
    }
  }
}

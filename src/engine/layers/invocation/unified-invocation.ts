/**
 * UNIFIED INVOCATION LAYER - AI CAPABILITY ORCHESTRATOR
 * 
 * PURPOSE: Single entry point for all AI model and capability invocations
 * RESPONSIBILITY: Capability discovery, invocation, billing, and result management
 * 
 * KEY FUNCTIONS:
 * - invoke(): Main method to execute any AI capability (text, image, video, voice)
 * - Auto-Discovery: Automatically detects and registers available AI capabilities
 * - Billing Integration: Tracks usage and deducts credits for all AI operations
 * - Result Management: Handles AI responses, uploads to S3, and formats results
 * 
 * SUPPORTED CAPABILITIES:
 * - Text Generation: OpenAI GPT models
 * - Image Generation: DALL-E, Midjourney, Stable Diffusion
 * - Voice Synthesis: ElevenLabs, OpenAI TTS
 * - Video Generation: Future integration planned
 * 
 * USAGE: Used by ISL and other layers to execute AI capabilities
 * DEPENDENCIES: CapabilityRegistry, BillingService, S3Service, AI model services
 */

import { CapabilityRegistry } from '../../capabilities/registry'
import { CapabilityAutoDiscovery } from '../../capabilities/auto-discovery'
import { billingService } from '../../../services/billing/billing-service'
import { s3Service } from '../../../services/storage/s3-service'
import type { Capability } from '../../../types/engine'

export interface InvocationResult {
  success: boolean
  result?: any
  cost: number
  metadata: {
    capability: string
    executionTime: number
    creditsConsumed: number
    tokensUsed?: number
  }
  error?: string
}

export interface InvocationOptions {
  maxCost?: number
  preferredProvider?: string
  qualityLevel?: 'fast' | 'balanced' | 'high'
  userId?: string // For usage tracking
}
export class UnifiedInvocationLayer {
  private registry: CapabilityRegistry
  private capabilities: Map<string, any> = new Map()
  private initialized = false

  constructor() {
    this.registry = new CapabilityRegistry()
  }

  /**
   * Initialize the layer with auto-discovered capabilities
   */
  async initialize(): Promise<void> {
    // Prevent duplicate initialization
    if (this.initialized) {
      console.log('⚠️ UnifiedInvocationLayer already initialized, skipping initialization')
      return
    }

    try {
      // Auto-discover all capabilities
      const discoveredCapabilities = await CapabilityAutoDiscovery.discoverCapabilities()
      
      // Register and store capabilities
      for (const capability of discoveredCapabilities) {
        // Check if capability already exists in our local map before registering
        if (!this.capabilities.has(capability.id)) {
          this.capabilities.set(capability.id, capability)
          try {
            await this.registry.registerCapability(capability)
            console.log(`✅ Registered capability: ${capability.name} (${capability.id})`)
          } catch (error) {
            // If registration fails due to duplicate, just log and continue
            const regError = error as Error
            console.warn(`⚠️ Skipping duplicate capability registration: ${capability.id}`, regError.message || 'Unknown error')
          }
        } else {
          console.log(`⚠️ Capability ${capability.id} already in local map, skipping registration`)
        }
      }
      
      this.initialized = true
      console.log(`🚀 UnifiedInvocationLayer initialized with ${this.capabilities.size} capabilities`)
    } catch (error) {
      console.error('❌ Failed to initialize UnifiedInvocationLayer:', error)
      throw error
    }
  }

  /**
   * Generic invocation method for any capability
   */
  async invoke(
    capabilityId: string, 
    input: any, 
    options: InvocationOptions = {}
  ): Promise<InvocationResult> {
    await this.ensureInitialized()

    const startTime = Date.now()
    
    try {
      const capability = this.capabilities.get(capabilityId)
      if (!capability) {
        throw new Error(`Capability not found: ${capabilityId}`)
      }

      if (capability.status !== 'active') {
        throw new Error(`Capability not active: ${capabilityId}`)
      }

      // Check cost constraints
      const estimatedCost = capability.metadata.costPerUse || 0
      if (options.maxCost && estimatedCost > options.maxCost) {
        throw new Error(`Estimated cost (${estimatedCost}) exceeds maximum (${options.maxCost})`)
      }

      // Route to appropriate method based on capability type
      let result: any
      switch (capability.type) {
        case 'model':
          result = await this.invokeModel(capability, input, options)
          break
        case 'agent':
          result = await this.invokeAgent(capability, input, options)
          break
        case 'tool':
          result = await this.invokeTool(capability, input, options)
          break
        case 'effect':
          result = await this.invokeEffect(capability, input, options)
          break
        default:
          throw new Error(`Unknown capability type: ${capability.type}`)
      }

      const executionTime = Date.now() - startTime
      const creditsConsumed = Math.ceil((result.cost || 0) * 100)

      // Track usage and deduct credits if userId provided
      if (options.userId && result.cost > 0) {
        const billingResult = await billingService.deductCredits(
          options.userId,
          capability.id,
          result.cost,
          {
            executionTime,
            qualityLevel: options.qualityLevel,
            capabilityType: capability.type
          }
        )
        
        if (!billingResult.success) {
          return {
            success: false,
            cost: result.cost,
            metadata: {
              capability: capability.id,
              executionTime,
              creditsConsumed,
            },
            error: 'Insufficient credits. Please upgrade your plan.'
          }
        }
      }

      return {
        success: true,
        result,
        cost: result.cost || 0,
        metadata: {
          capability: capability.name,
          executionTime,
          creditsConsumed,
          tokensUsed: result.metadata?.tokensUsed?.total
        }
      }
    } catch (error) {
      const executionTime = Date.now() - startTime
      console.error(`Capability invocation failed (${capabilityId}):`, error)
      
      return {
        success: false,
        cost: 0,
        metadata: {
          capability: capabilityId,
          executionTime,
          creditsConsumed: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ===== CONVENIENCE METHODS FOR COMMON OPERATIONS =====

  /**
   * Generate text using the best available model
   */
  async generateText(prompt: string, options: InvocationOptions = {}): Promise<InvocationResult> {
    const textModels = await this.getCapabilitiesByCapability('text_generation')
    const selectedModel = this.selectBestCapability(textModels, options)
    return this.invoke(selectedModel.id, prompt, options)
  }

  /**
   * Generate image using the best available model
   */
  async generateImage(prompt: string, options: InvocationOptions = {}): Promise<InvocationResult> {
    const imageModels = await this.getCapabilitiesByCapability('image_generation')
    const selectedModel = this.selectBestCapability(imageModels, options)
    return this.invoke(selectedModel.id, prompt, options)
  }

  /**
   * Generate video using the best available model
   */
  async generateVideo(prompt: string, options: InvocationOptions = {}): Promise<InvocationResult> {
    const videoModels = await this.getCapabilitiesByCapability('video_generation')
    const selectedModel = this.selectBestCapability(videoModels, options)
    return this.invoke(selectedModel.id, prompt, options)
  }

  /**
   * Synthesize voice using the best available model
   */
  async synthesizeVoice(text: string, options: InvocationOptions = {}): Promise<InvocationResult> {
    const voiceModels = await this.getCapabilitiesByCapability('voice_synthesis')
    const selectedModel = this.selectBestCapability(voiceModels, options)
    return this.invoke(selectedModel.id, text, options)
  }

  // ===== CAPABILITY DISCOVERY METHODS =====

  /**
   * Get all available capabilities
   */
  async getAvailableCapabilities(): Promise<Capability[]> {
    await this.ensureInitialized()
    return Array.from(this.capabilities.values()).filter(cap => cap.status === 'active')
  }

  /**
   * Get capabilities by type
   */
  async getCapabilitiesByType(type: Capability['type']): Promise<Capability[]> {
    await this.ensureInitialized()
    return Array.from(this.capabilities.values()).filter(
      cap => cap.type === type && cap.status === 'active'
    )
  }

  /**
   * Get capabilities by capability string
   */
  async getCapabilitiesByCapability(capabilityString: string): Promise<Capability[]> {
    await this.ensureInitialized()
    return Array.from(this.capabilities.values()).filter(
      cap => cap.capabilities.includes(capabilityString) && cap.status === 'active'
    )
  }

  // ===== PRIVATE METHODS =====

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize()
    }
  }

  private async invokeModel(capability: any, input: any, options: InvocationOptions): Promise<any> {
    // Route to the appropriate model method based on capabilities
    if (capability.capabilities.includes('text_generation') && capability.generateText) {
      return await capability.generateText(input, options)
    } else if (capability.capabilities.includes('image_generation') && capability.generateImage) {
      return await capability.generateImage(input, options)
    } else if (capability.capabilities.includes('video_generation') && capability.generateVideo) {
      return await capability.generateVideo(input, options)
    } else if (capability.capabilities.includes('voice_synthesis') && capability.synthesizeVoice) {
      return await capability.synthesizeVoice(input, options)
    } else {
      throw new Error(`Model ${capability.id} does not support the required method`)
    }
  }

  private async invokeAgent(capability: any, input: any, options: InvocationOptions): Promise<any> {
    if (capability.executeTask) {
      return await capability.executeTask(input, options)
    } else {
      throw new Error(`Agent ${capability.id} does not implement executeTask method`)
    }
  }

  private async invokeTool(capability: any, input: any, options: InvocationOptions): Promise<any> {
    if (capability.execute) {
      return await capability.execute(input, options)
    } else {
      throw new Error(`Tool ${capability.id} does not implement execute method`)
    }
  }

  private async invokeEffect(capability: any, input: any, options: InvocationOptions): Promise<any> {
    if (capability.apply) {
      return await capability.apply(input, options)
    } else {
      throw new Error(`Effect ${capability.id} does not implement apply method`)
    }
  }

  private selectBestCapability(capabilities: Capability[], options: InvocationOptions): Capability {
    if (capabilities.length === 0) {
      throw new Error('No capabilities available')
    }

    // Filter by preferred provider if specified
    let filteredCapabilities = capabilities
    if (options.preferredProvider) {
      const providerCapabilities = capabilities.filter(cap => cap.provider === options.preferredProvider)
      if (providerCapabilities.length > 0) {
        filteredCapabilities = providerCapabilities
      }
    }

    // Select based on quality level
    switch (options.qualityLevel) {
      case 'fast':
        // Prefer capabilities with lower latency
        return filteredCapabilities.sort((a, b) => 
          (a.metadata.averageLatency || 0) - (b.metadata.averageLatency || 0)
        )[0]
      
      case 'high':
        // Prefer capabilities with higher quality score
        return filteredCapabilities.sort((a, b) => 
          (b.metadata.qualityScore || 0) - (a.metadata.qualityScore || 0)
        )[0]
      
      case 'balanced':
      default:
        // Balance quality and cost
        return filteredCapabilities.sort((a, b) => {
          const aScore = (a.metadata.qualityScore || 0) / (a.metadata.costPerUse || 1)
          const bScore = (b.metadata.qualityScore || 0) / (b.metadata.costPerUse || 1)
          return bScore - aScore
        })[0]
    }
  }
}

// Export singleton instance
export const unifiedInvocation = new UnifiedInvocationLayer()

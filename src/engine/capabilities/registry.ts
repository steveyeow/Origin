import type { Capability, CapabilityMetadata } from '../../types/engine'
import { EventEmitter } from 'events'

/**
 * Capability Registry
 * Manages available capabilities (models, agents, tools, effects)
 */
export class CapabilityRegistry extends EventEmitter {
  private capabilities: Map<string, Capability> = new Map()
  private healthStatus: Map<string, 'healthy' | 'degraded' | 'unhealthy'> = new Map()

  constructor() {
    super()
    this.initializeDefaultCapabilities()
  }

  /**
   * Register a new capability
   */
  async registerCapability(capability: Capability): Promise<void> {
    // Validate capability - this may return early if capability already exists
    try {
      this.validateCapability(capability)
    } catch (error) {
      console.error(`❌ Failed to validate capability ${capability.id}:`, error)
      throw error
    }
    
    // If capability already exists (validateCapability returned early), don't proceed
    if (this.capabilities.has(capability.id)) {
      console.log(`⚠️ Skipping registration for existing capability: ${capability.id}`)
      return
    }
    
    // Store capability
    this.capabilities.set(capability.id, capability)
    this.healthStatus.set(capability.id, 'healthy')
    
    // Emit event
    this.emit('capability_added', capability)
    
    console.log(`✅ Capability registered: ${capability.name} (${capability.type})`)
  }

  /**
   * Remove a capability
   */
  async removeCapability(capabilityId: string): Promise<void> {
    if (!this.capabilities.has(capabilityId)) {
      throw new Error(`Capability not found: ${capabilityId}`)
    }
    
    this.capabilities.delete(capabilityId)
    this.healthStatus.delete(capabilityId)
    
    // Emit event
    this.emit('capability_removed', capabilityId)
    
    console.log(`Capability removed: ${capabilityId}`)
  }

  /**
   * Get all available capabilities
   */
  async getAvailableCapabilities(): Promise<Capability[]> {
    return Array.from(this.capabilities.values()).filter(
      capability => capability.status === 'active'
    )
  }

  /**
   * Get capabilities by type
   */
  async getCapabilitiesByType(type: Capability['type']): Promise<Capability[]> {
    const capabilities = await this.getAvailableCapabilities()
    return capabilities.filter(capability => capability.type === type)
  }

  /**
   * Get capability by ID
   */
  async getCapability(capabilityId: string): Promise<Capability | null> {
    return this.capabilities.get(capabilityId) || null
  }

  /**
   * Search capabilities by requirements
   */
  async searchCapabilities(requirements: string[]): Promise<Capability[]> {
    const capabilities = await this.getAvailableCapabilities()
    
    return capabilities.filter(capability => {
      return requirements.some(requirement => 
        capability.capabilities.some(cap => 
          cap.toLowerCase().includes(requirement.toLowerCase())
        )
      )
    }).sort((a, b) => {
      // Sort by quality score (if available)
      const aQuality = a.metadata.qualityScore || 0
      const bQuality = b.metadata.qualityScore || 0
      return bQuality - aQuality
    })
  }

  /**
   * Update capability status
   */
  async updateCapabilityStatus(
    capabilityId: string, 
    status: Capability['status']
  ): Promise<void> {
    const capability = this.capabilities.get(capabilityId)
    if (!capability) {
      throw new Error(`Capability not found: ${capabilityId}`)
    }
    
    capability.status = status
    this.emit('capability_updated', capability)
  }

  /**
   * Monitor capability health
   */
  async monitorCapabilityHealth(): Promise<Record<string, 'healthy' | 'degraded' | 'unhealthy'>> {
    // For MVP, return stored health status
    // In the future, this would perform actual health checks
    return Object.fromEntries(this.healthStatus.entries())
  }

  /**
   * Update capability health status
   */
  async updateHealthStatus(
    capabilityId: string, 
    status: 'healthy' | 'degraded' | 'unhealthy'
  ): Promise<void> {
    this.healthStatus.set(capabilityId, status)
    this.emit('capability_health_changed', { capabilityId, status })
  }

  /**
   * Get capability statistics
   */
  async getStatistics(): Promise<{
    total: number
    byType: Record<string, number>
    byStatus: Record<string, number>
    byHealth: Record<string, number>
  }> {
    const capabilities = Array.from(this.capabilities.values())
    
    const byType: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    const byHealth: Record<string, number> = {}
    
    capabilities.forEach(capability => {
      // Count by type
      byType[capability.type] = (byType[capability.type] || 0) + 1
      
      // Count by status
      byStatus[capability.status] = (byStatus[capability.status] || 0) + 1
      
      // Count by health
      const health = this.healthStatus.get(capability.id) || 'unknown'
      byHealth[health] = (byHealth[health] || 0) + 1
    })
    
    return {
      total: capabilities.length,
      byType,
      byStatus,
      byHealth
    }
  }

  // ===== PRIVATE METHODS =====

  private validateCapability(capability: Capability): void {
    if (!capability.id || !capability.name || !capability.type) {
      throw new Error('Capability must have id, name, and type')
    }
    
    // Check for duplicate capability - but don't throw an error, just log a warning
    // This prevents crashes when multiple engine instances try to register the same capabilities
    if (this.capabilities.has(capability.id)) {
      console.warn(`⚠️ CapabilityRegistry: Capability with id ${capability.id} already exists, will be skipped`)
      // Instead of throwing an error, we'll return early
      return
    }
    
    const validTypes: Capability['type'][] = ['model', 'agent', 'tool', 'effect']
    if (!validTypes.includes(capability.type)) {
      throw new Error(`Invalid capability type: ${capability.type}`)
    }
  }

  /**
   * Initialize default capabilities for MVP
   */
  private initializeDefaultCapabilities(): void {
    // Text generation model
    const textModel: Capability = {
      id: 'openai-gpt-4',
      name: 'GPT-4 Text Generation',
      type: 'model',
      description: 'Advanced language model for text generation, editing, and analysis',
      version: '1.0.0',
      provider: 'OpenAI',
      capabilities: [
        'text_generation',
        'text_editing',
        'creative_writing',
        'analysis',
        'summarization',
        'translation'
      ],
      metadata: {
        costPerUse: 0.03,
        averageLatency: 2000,
        qualityScore: 0.95,
        supportedFormats: ['text/plain', 'text/markdown'],
        limitations: ['No real-time data', 'Token limit: 8192'],
        examples: [
          {
            input: 'Write a short story about a robot',
            output: 'In the year 2045, a small maintenance robot named Chip...',
            description: 'Creative writing example'
          }
        ]
      },
      status: 'active'
    }

    // Image generation model
    const imageModel: Capability = {
      id: 'dalle-3',
      name: 'DALL-E 3 Image Generation',
      type: 'model',
      description: 'Advanced AI model for creating images from text descriptions',
      version: '3.0.0',
      provider: 'OpenAI',
      capabilities: [
        'image_generation',
        'concept_art',
        'illustration',
        'photo_realistic',
        'artistic_styles'
      ],
      metadata: {
        costPerUse: 0.08,
        averageLatency: 15000,
        qualityScore: 0.90,
        supportedFormats: ['image/png', 'image/jpeg'],
        limitations: ['1024x1024 max resolution', 'No real people'],
        examples: [
          {
            input: 'A serene mountain landscape at sunset',
            output: '[Generated image of mountain landscape]',
            description: 'Landscape generation example'
          }
        ]
      },
      status: 'active'
    }

    // Text formatting agent
    const formattingAgent: Capability = {
      id: 'text-formatter',
      name: 'Text Formatting Agent',
      type: 'agent',
      description: 'Formats and structures text content for various outputs',
      version: '1.0.0',
      provider: 'OriginX',
      capabilities: [
        'markdown_formatting',
        'html_conversion',
        'structure_optimization',
        'readability_improvement'
      ],
      metadata: {
        costPerUse: 0.01,
        averageLatency: 500,
        qualityScore: 0.85,
        supportedFormats: ['text/plain', 'text/markdown', 'text/html'],
        examples: [
          {
            input: 'Raw text content',
            output: 'Formatted markdown content',
            description: 'Text formatting example'
          }
        ]
      },
      status: 'active'
    }

    // Register default capabilities
    Promise.all([
      this.registerCapability(textModel),
      this.registerCapability(imageModel),
      this.registerCapability(formattingAgent)
    ]).catch(console.error)
  }
}

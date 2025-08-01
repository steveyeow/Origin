import type {
  IInvocationLayer,
  Capability,
  Task,
  TaskResult,
  ResultMetadata
} from '../../../types/engine'

import { CapabilityRegistry } from '../../capabilities/registry'

/**
 * Invocation Layer
 * Manages and invokes capabilities (models, agents, tools, effects)
 */
export class InvocationLayer implements IInvocationLayer {
  private registry: CapabilityRegistry
  private activeInvocations: Map<string, Promise<TaskResult>> = new Map()

  constructor() {
    this.registry = new CapabilityRegistry()
    this.setupEventHandlers()
  }

  /**
   * Get all available capabilities
   */
  async getAvailableCapabilities(): Promise<Capability[]> {
    return this.registry.getAvailableCapabilities()
  }

  /**
   * Invoke a specific capability with a task
   */
  async invokeCapability(capabilityId: string, task: Task): Promise<TaskResult> {
    const startTime = Date.now()
    
    try {
      // Get capability
      const capability = await this.registry.getCapability(capabilityId)
      if (!capability) {
        throw new Error(`Capability not found: ${capabilityId}`)
      }

      if (capability.status !== 'active') {
        throw new Error(`Capability not active: ${capabilityId}`)
      }

      // Check if capability can handle the task
      const canHandle = this.validateTaskCapability(task, capability)
      if (!canHandle) {
        throw new Error(`Capability ${capabilityId} cannot handle task type: ${task.type}`)
      }

      // Create invocation promise
      const invocationPromise = this.performInvocation(capability, task)
      this.activeInvocations.set(task.id, invocationPromise)

      // Execute the task
      const result = await invocationPromise

      // Clean up
      this.activeInvocations.delete(task.id)

      // Update capability health based on result
      if (result.status === 'success') {
        await this.registry.updateHealthStatus(capabilityId, 'healthy')
      } else if (result.status === 'failed') {
        await this.registry.updateHealthStatus(capabilityId, 'degraded')
      }

      return result

    } catch (error) {
      // Clean up on error
      this.activeInvocations.delete(task.id)
      
      // Update capability health
      await this.registry.updateHealthStatus(capabilityId, 'unhealthy')

      // Return error result
      return {
        taskId: task.id,
        status: 'failed',
        output: null,
        metadata: {
          qualityScore: 0,
          confidence: 0,
          processingTime: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        executionTime: Date.now() - startTime,
        cost: 0
      }
    }
  }

  /**
   * Register a new capability
   */
  async registerCapability(capability: Capability): Promise<void> {
    await this.registry.registerCapability(capability)
  }

  /**
   * Remove a capability
   */
  async removeCapability(capabilityId: string): Promise<void> {
    // Cancel any active invocations for this capability
    for (const [taskId, invocationPromise] of this.activeInvocations.entries()) {
      // In a real implementation, we'd need a way to cancel the promise
      // For now, we'll just remove it from tracking
      this.activeInvocations.delete(taskId)
    }

    await this.registry.removeCapability(capabilityId)
  }

  /**
   * Monitor capability health
   */
  async monitorCapabilityHealth(): Promise<Record<string, 'healthy' | 'degraded' | 'unhealthy'>> {
    return this.registry.monitorCapabilityHealth()
  }

  /**
   * Get capabilities by type
   */
  async getCapabilitiesByType(type: Capability['type']): Promise<Capability[]> {
    return this.registry.getCapabilitiesByType(type)
  }

  /**
   * Search capabilities by requirements
   */
  async searchCapabilities(requirements: string[]): Promise<Capability[]> {
    return this.registry.searchCapabilities(requirements)
  }

  /**
   * Get active invocations count
   */
  getActiveInvocationsCount(): number {
    return this.activeInvocations.size
  }

  /**
   * Get registry statistics
   */
  async getStatistics(): Promise<{
    capabilities: any
    activeInvocations: number
  }> {
    const capabilityStats = await this.registry.getStatistics()
    
    return {
      capabilities: capabilityStats,
      activeInvocations: this.activeInvocations.size
    }
  }

  // ===== PRIVATE METHODS =====

  private setupEventHandlers(): void {
    this.registry.on('capability_added', (capability: Capability) => {
      console.log(`New capability available: ${capability.name}`)
      // In the future, this could trigger ISL to propose new scenarios
    })

    this.registry.on('capability_removed', (capabilityId: string) => {
      console.log(`Capability removed: ${capabilityId}`)
    })

    this.registry.on('capability_health_changed', (data: { capabilityId: string, status: string }) => {
      console.log(`Capability health changed: ${data.capabilityId} -> ${data.status}`)
    })
  }

  private validateTaskCapability(task: Task, capability: Capability): boolean {
    // Check if capability has required capabilities for the task
    return task.requiredCapabilities.every(required =>
      capability.capabilities.some(cap =>
        cap.toLowerCase().includes(required.toLowerCase())
      )
    )
  }

  private async performInvocation(capability: Capability, task: Task): Promise<TaskResult> {
    const startTime = Date.now()
    
    try {
      // Simulate different types of capability invocations
      let result: any
      let cost = 0
      let tokensUsed = 0

      switch (capability.type) {
        case 'model':
          result = await this.invokeModel(capability, task)
          cost = capability.metadata.costPerUse || 0.01
          tokensUsed = this.estimateTokens(task.input)
          break

        case 'agent':
          result = await this.invokeAgent(capability, task)
          cost = capability.metadata.costPerUse || 0.005
          break

        case 'tool':
          result = await this.invokeTool(capability, task)
          cost = capability.metadata.costPerUse || 0.001
          break

        case 'effect':
          result = await this.invokeEffect(capability, task)
          cost = capability.metadata.costPerUse || 0.002
          break

        default:
          throw new Error(`Unknown capability type: ${capability.type}`)
      }

      const executionTime = Date.now() - startTime
      const qualityScore = capability.metadata.qualityScore || 0.8
      const confidence = this.calculateConfidence(result, capability)

      const metadata: ResultMetadata = {
        qualityScore,
        confidence,
        processingTime: executionTime,
        model: capability.name,
        tokensUsed
      }

      return {
        taskId: task.id,
        status: 'success',
        output: result,
        metadata,
        executionTime,
        cost
      }

    } catch (error) {
      const executionTime = Date.now() - startTime
      
      return {
        taskId: task.id,
        status: 'failed',
        output: null,
        metadata: {
          qualityScore: 0,
          confidence: 0,
          processingTime: executionTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        executionTime,
        cost: 0
      }
    }
  }

  private async invokeModel(capability: Capability, task: Task): Promise<any> {
    // Simulate model invocation
    const latency = capability.metadata.averageLatency || 2000
    
    await new Promise(resolve => setTimeout(resolve, latency))
    
    // Mock different model responses based on capability
    if (capability.capabilities.includes('text_generation')) {
      return this.mockTextGeneration(task.input)
    } else if (capability.capabilities.includes('image_generation')) {
      return this.mockImageGeneration(task.input)
    } else {
      return `Model ${capability.name} processed: ${JSON.stringify(task.input)}`
    }
  }

  private async invokeAgent(capability: Capability, task: Task): Promise<any> {
    // Simulate agent invocation
    const latency = capability.metadata.averageLatency || 1000
    
    await new Promise(resolve => setTimeout(resolve, latency))
    
    return `Agent ${capability.name} processed task: ${task.description}`
  }

  private async invokeTool(capability: Capability, task: Task): Promise<any> {
    // Simulate tool invocation
    const latency = capability.metadata.averageLatency || 500
    
    await new Promise(resolve => setTimeout(resolve, latency))
    
    return `Tool ${capability.name} result for: ${JSON.stringify(task.input)}`
  }

  private async invokeEffect(capability: Capability, task: Task): Promise<any> {
    // Simulate effect invocation
    const latency = capability.metadata.averageLatency || 300
    
    await new Promise(resolve => setTimeout(resolve, latency))
    
    return `Effect ${capability.name} applied to: ${JSON.stringify(task.input)}`
  }

  private mockTextGeneration(input: any): string {
    const prompt = typeof input === 'string' ? input : input.prompt || 'Generate text'
    
    // Simple mock text generation
    const responses = [
      `Here's a creative response to "${prompt}": This is an AI-generated text that demonstrates the capability of our text generation model. It can create engaging, contextual content based on your input.`,
      `Based on your request "${prompt}", I can help you create compelling content. This mock response shows how the system would generate relevant text that matches your needs and style preferences.`,
      `Your prompt "${prompt}" inspires this generated content: AI-powered text generation opens up endless possibilities for creative expression and practical communication. This example demonstrates the quality and relevance you can expect.`
    ]
    
    return responses[Math.floor(Math.random() * responses.length)]
  }

  private mockImageGeneration(input: any): any {
    const prompt = typeof input === 'string' ? input : input.prompt || 'Generate image'
    
    return {
      type: 'image',
      url: `https://example.com/generated-image-${Date.now()}.png`,
      prompt,
      dimensions: { width: 1024, height: 1024 },
      format: 'PNG'
    }
  }

  private calculateConfidence(result: any, capability: Capability): number {
    // Simple confidence calculation based on capability quality and result
    const baseConfidence = capability.metadata.qualityScore || 0.8
    
    // Adjust based on result (this is a simplified approach)
    if (!result) return 0
    if (typeof result === 'string' && result.length < 10) return baseConfidence * 0.5
    
    return Math.min(baseConfidence + 0.1, 1.0)
  }

  private estimateTokens(input: any): number {
    // Simple token estimation (roughly 4 characters per token)
    const text = typeof input === 'string' ? input : JSON.stringify(input)
    return Math.ceil(text.length / 4)
  }
}

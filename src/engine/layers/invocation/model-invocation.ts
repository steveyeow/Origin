import { CapabilityRegistry } from '../../capabilities/registry'
import { DallE3Model, MidjourneyModel } from '../../capabilities/models/image-generation'
import { RunwayML3Model, PikaLabsModel } from '../../capabilities/models/video-generation'
import { GPT4Model, GPT35TurboModel } from '../../capabilities/models/text-generation'
import { ElevenLabsVoiceModel, BrowserSpeechModel } from '../../capabilities/models/voice-synthesis'
import type { Capability } from '../../../types/engine'

export interface ModelInvocationResult {
  success: boolean
  result?: any
  cost: number
  metadata: {
    model: string
    executionTime: number
    tokensUsed?: number
    creditsConsumed: number
  }
  error?: string
}

export interface InvocationOptions {
  maxCost?: number
  preferredProvider?: string
  qualityLevel?: 'fast' | 'balanced' | 'high'
}

export class ModelInvocationLayer {
  private registry: CapabilityRegistry
  private models: Map<string, any> = new Map()

  constructor() {
    this.registry = new CapabilityRegistry()
    this.initializeModels()
  }

  private async initializeModels() {
    // Initialize image generation models
    const dalleModel = new DallE3Model()
    const midjourneyModel = new MidjourneyModel()
    
    // Initialize video generation models
    const runwayModel = new RunwayML3Model()
    const pikaModel = new PikaLabsModel()
    
    // Initialize text generation models
    const gpt4Model = new GPT4Model()
    const gpt35Model = new GPT35TurboModel()
    
    // Initialize voice synthesis models
    const elevenLabsModel = new ElevenLabsVoiceModel()
    const browserSpeechModel = new BrowserSpeechModel()

    // Store model instances
    this.models.set(dalleModel.id, dalleModel)
    this.models.set(midjourneyModel.id, midjourneyModel)
    this.models.set(runwayModel.id, runwayModel)
    this.models.set(pikaModel.id, pikaModel)
    this.models.set(gpt4Model.id, gpt4Model)
    this.models.set(gpt35Model.id, gpt35Model)
    this.models.set(elevenLabsModel.id, elevenLabsModel)
    this.models.set(browserSpeechModel.id, browserSpeechModel)

    // Register capabilities
    await Promise.all([
      this.registry.registerCapability(dalleModel),
      this.registry.registerCapability(midjourneyModel),
      this.registry.registerCapability(runwayModel),
      this.registry.registerCapability(pikaModel),
      this.registry.registerCapability(gpt4Model),
      this.registry.registerCapability(gpt35Model),
      this.registry.registerCapability(elevenLabsModel),
      this.registry.registerCapability(browserSpeechModel)
    ])

    console.log('✅ Model Invocation Layer initialized with all models')
  }

  /**
   * Generate image using the best available model
   */
  async generateImage(
    prompt: string, 
    options: InvocationOptions = {}
  ): Promise<ModelInvocationResult> {
    try {
      // Find best image generation model
      const imageModels = await this.registry.getCapabilitiesByType('model')
      const availableImageModels = imageModels.filter(model => 
        model.capabilities.includes('image_generation') && 
        model.status === 'active'
      )

      if (availableImageModels.length === 0) {
        throw new Error('No image generation models available')
      }

      // Select model based on options
      const selectedModel = this.selectBestModel(availableImageModels, options)
      const modelInstance = this.models.get(selectedModel.id)

      if (!modelInstance || !modelInstance.generateImage) {
        throw new Error(`Model instance not found: ${selectedModel.id}`)
      }

      const startTime = Date.now()
      
      // Check cost constraints
      const estimatedCost = selectedModel.metadata.costPerUse
      if (options.maxCost && estimatedCost > options.maxCost) {
        throw new Error(`Estimated cost (${estimatedCost}) exceeds maximum (${options.maxCost})`)
      }

      // Generate image
      const result = await modelInstance.generateImage(prompt)
      const executionTime = Date.now() - startTime

      return {
        success: true,
        result,
        cost: result.cost,
        metadata: {
          model: selectedModel.name,
          executionTime,
          creditsConsumed: this.calculateCredits(result.cost)
        }
      }
    } catch (error) {
      console.error('Image generation failed:', error)
      return {
        success: false,
        cost: 0,
        metadata: {
          model: 'unknown',
          executionTime: 0,
          creditsConsumed: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate text using the best available model
   */
  async generateText(
    prompt: string, 
    options: InvocationOptions = {}
  ): Promise<ModelInvocationResult> {
    try {
      // Find best text generation model
      const textModels = await this.registry.getCapabilitiesByType('model')
      const availableTextModels = textModels.filter(model => 
        model.capabilities.includes('text_generation') && 
        model.status === 'active'
      )

      if (availableTextModels.length === 0) {
        throw new Error('No text generation models available')
      }

      // Select model based on options
      const selectedModel = this.selectBestModel(availableTextModels, options)
      const modelInstance = this.models.get(selectedModel.id)

      if (!modelInstance || !modelInstance.generateText) {
        throw new Error(`Model instance not found: ${selectedModel.id}`)
      }

      const startTime = Date.now()
      
      // Check cost constraints
      const estimatedCost = selectedModel.metadata.costPerUse
      if (options.maxCost && estimatedCost > options.maxCost) {
        throw new Error(`Estimated cost (${estimatedCost}) exceeds maximum (${options.maxCost})`)
      }

      // Generate text
      const result = await modelInstance.generateText(prompt)
      const executionTime = Date.now() - startTime

      return {
        success: true,
        result,
        cost: result.cost,
        metadata: {
          model: selectedModel.name,
          executionTime,
          tokensUsed: result.metadata.tokensUsed?.total,
          creditsConsumed: this.calculateCredits(result.cost)
        }
      }
    } catch (error) {
      console.error('Text generation failed:', error)
      return {
        success: false,
        cost: 0,
        metadata: {
          model: 'unknown',
          executionTime: 0,
          creditsConsumed: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Synthesize voice using the best available model
   */
  async synthesizeVoice(
    text: string, 
    options: InvocationOptions = {}
  ): Promise<ModelInvocationResult> {
    try {
      // Find best voice synthesis model
      const voiceModels = await this.registry.getCapabilitiesByType('model')
      const availableVoiceModels = voiceModels.filter(model => 
        model.capabilities.includes('voice_synthesis') && 
        model.status === 'active'
      )

      if (availableVoiceModels.length === 0) {
        throw new Error('No voice synthesis models available')
      }

      // Select model based on options
      const selectedModel = this.selectBestModel(availableVoiceModels, options)
      const modelInstance = this.models.get(selectedModel.id)

      if (!modelInstance || !modelInstance.synthesizeVoice) {
        throw new Error(`Model instance not found: ${selectedModel.id}`)
      }

      const startTime = Date.now()
      
      // Check cost constraints
      const estimatedCost = selectedModel.metadata.costPerUse
      if (options.maxCost && estimatedCost > options.maxCost) {
        throw new Error(`Estimated cost (${estimatedCost}) exceeds maximum (${options.maxCost})`)
      }

      // Synthesize voice
      const result = await modelInstance.synthesizeVoice(text)
      const executionTime = Date.now() - startTime

      return {
        success: true,
        result,
        cost: result.cost,
        metadata: {
          model: selectedModel.name,
          executionTime,
          creditsConsumed: this.calculateCredits(result.cost)
        }
      }
    } catch (error) {
      console.error('Voice synthesis failed:', error)
      return {
        success: false,
        cost: 0,
        metadata: {
          model: 'unknown',
          executionTime: 0,
          creditsConsumed: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate video using the best available model
   */
  async generateVideo(
    prompt: string, 
    options: InvocationOptions = {}
  ): Promise<ModelInvocationResult> {
    try {
      // Find best video generation model
      const videoModels = await this.registry.getCapabilitiesByType('model')
      const availableVideoModels = videoModels.filter(model => 
        model.capabilities.includes('video_generation') && 
        model.status === 'active'
      )

      if (availableVideoModels.length === 0) {
        throw new Error('No video generation models available')
      }

      // Select model based on options
      const selectedModel = this.selectBestModel(availableVideoModels, options)
      const modelInstance = this.models.get(selectedModel.id)

      if (!modelInstance || !modelInstance.generateVideo) {
        throw new Error(`Model instance not found: ${selectedModel.id}`)
      }

      const startTime = Date.now()
      
      // Check cost constraints
      const estimatedCost = selectedModel.metadata.costPerUse
      if (options.maxCost && estimatedCost > options.maxCost) {
        throw new Error(`Estimated cost (${estimatedCost}) exceeds maximum (${options.maxCost})`)
      }

      // Generate video
      const result = await modelInstance.generateVideo(prompt)
      const executionTime = Date.now() - startTime

      return {
        success: true,
        result,
        cost: result.cost,
        metadata: {
          model: selectedModel.name,
          executionTime,
          creditsConsumed: this.calculateCredits(result.cost)
        }
      }
    } catch (error) {
      console.error('Video generation failed:', error)
      return {
        success: false,
        cost: 0,
        metadata: {
          model: 'unknown',
          executionTime: 0,
          creditsConsumed: 0
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get available capabilities for ISL communication
   */
  async getAvailableCapabilities(): Promise<Capability[]> {
    return await this.registry.getAvailableCapabilities()
  }

  /**
   * Get models by type
   */
  async getModelsByType(modelType: string): Promise<Capability[]> {
    const allModels = await this.registry.getCapabilitiesByType('model')
    return allModels.filter(model => 
      model.capabilities.includes(modelType) && 
      model.status === 'active'
    )
  }

  /**
   * Get capability statistics for ISL
   */
  async getCapabilityStats() {
    return await this.registry.getStatistics()
  }

  /**
   * Listen for capability changes
   */
  onCapabilityChange(callback: (event: any) => void) {
    this.registry.on('capability_added', callback)
    this.registry.on('capability_removed', callback)
    this.registry.on('capability_updated', callback)
  }

  private selectBestModel(models: Capability[], options: InvocationOptions): Capability {
    // Filter by preferred provider if specified
    let filteredModels = models
    if (options.preferredProvider) {
      const providerModels = models.filter(m => m.provider === options.preferredProvider)
      if (providerModels.length > 0) {
        filteredModels = providerModels
      }
    }

    // Select based on quality level
    switch (options.qualityLevel) {
      case 'fast':
        // Prefer models with lower latency
        return filteredModels.sort((a, b) => 
          (a.metadata.averageLatency || 0) - (b.metadata.averageLatency || 0)
        )[0]
      
      case 'high':
        // Prefer models with higher quality score
        return filteredModels.sort((a, b) => 
          (b.metadata.qualityScore || 0) - (a.metadata.qualityScore || 0)
        )[0]
      
      case 'balanced':
      default:
        // Balance quality and cost
        return filteredModels.sort((a, b) => {
          const aScore = (a.metadata.qualityScore || 0) / (a.metadata.costPerUse || 1)
          const bScore = (b.metadata.qualityScore || 0) / (b.metadata.costPerUse || 1)
          return bScore - aScore
        })[0]
    }
  }

  private calculateCredits(cost: number): number {
    // Convert USD cost to internal credits (1 credit = $0.01)
    return Math.ceil(cost * 100)
  }
}

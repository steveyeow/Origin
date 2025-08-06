import type { Capability } from '../../types/engine'

// Import all capability implementations
// Only import models that have real API implementations
import { GPT4Model, GPT35TurboModel } from './models/text-generation'
import { ElevenLabsVoiceModel, BrowserSpeechModel } from './models/voice-synthesis'
import { DallE3Model, MidjourneyModel } from './models/image-generation'
import { FluxPro11Model, FluxPro10Model } from './models/flux-models'

// TODO: Add imports for new models as they're implemented:
// import { YourNewModel } from './models/your-model-type'
// import { YourAgent } from './agents/your-agent'
// import { YourTool } from './tools/your-tool'
// import { YourEffect } from './effects/your-effect'

/**
 * Auto-discovery system for capabilities
 * Eliminates the need for manual registration
 */
export class CapabilityAutoDiscovery {
  private static capabilityClasses = [
    // ===== MODELS =====
    // Text Generation Models
    GPT4Model,
    GPT35TurboModel,
    
    // Voice Synthesis Models  
    ElevenLabsVoiceModel,
    BrowserSpeechModel,
    
    // Image Generation Models
    FluxPro11Model,          // Image generation (Flux 1.1 Pro)
    FluxPro10Model,          // Image generation (Flux 1.0 Pro - inactive)
    DallE3Model,             // Image generation (OpenAI DALL-E API)
    
    // TODO: Add new models here as they're implemented:
    // Claude3Model,          // Text generation (needs Anthropic API)
    // YourNewModel,          // Your custom model
    
    // ===== AGENTS =====
    // TODO: Add agents here as they're created:
    // YourAgent,
    
    // ===== TOOLS =====
    // TODO: Add tools here as they're created:
    // YourTool,
    
    // ===== EFFECTS =====
    // TODO: Add effects here as they're created:
    // YourEffect,
  ]

  /**
   * Discover and instantiate all available capabilities
   */
  static async discoverCapabilities(): Promise<Capability[]> {
    const capabilities: Capability[] = []
    
    console.log('🔍 Starting capability auto-discovery...')
    
    for (const CapabilityClass of this.capabilityClasses) {
      try {
        console.log(`🔄 Attempting to instantiate ${CapabilityClass.name}...`)
        
        // Add timeout to prevent hanging
        const capability = await Promise.race([
          Promise.resolve(new CapabilityClass()),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Capability instantiation timeout')), 5000)
          )
        ]) as any
        
        // Validate capability
        if (this.isValidCapability(capability)) {
          capabilities.push(capability)
          console.log(`✅ Discovered capability: ${capability.name} (${capability.type})`)
        } else {
          console.warn(`⚠️  Invalid capability: ${CapabilityClass.name}`)
        }
      } catch (error) {
        console.error(`❌ Failed to instantiate ${CapabilityClass.name}:`, error)
        // Continue with other capabilities instead of failing completely
      }
    }
    
    console.log(`🔍 Auto-discovery completed: ${capabilities.length} capabilities found`)
    return capabilities
  }

  /**
   * Get capabilities by type
   */
  static async getCapabilitiesByType(type: Capability['type']): Promise<Capability[]> {
    const allCapabilities = await this.discoverCapabilities()
    return allCapabilities.filter(capability => capability.type === type)
  }

  /**
   * Get capabilities by capability string (e.g., 'text_generation', 'image_generation')
   */
  static async getCapabilitiesByCapability(capabilityString: string): Promise<Capability[]> {
    const allCapabilities = await this.discoverCapabilities()
    return allCapabilities.filter(capability => 
      capability.capabilities.includes(capabilityString)
    )
  }

  /**
   * Register a new capability class for auto-discovery
   */
  static registerCapabilityClass(CapabilityClass: any): void {
    if (!this.capabilityClasses.includes(CapabilityClass)) {
      this.capabilityClasses.push(CapabilityClass)
      console.log(`📝 Registered new capability class: ${CapabilityClass.name}`)
    }
  }

  /**
   * Validate that an object is a valid capability
   */
  private static isValidCapability(obj: any): obj is Capability {
    return (
      obj &&
      typeof obj.id === 'string' &&
      typeof obj.name === 'string' &&
      typeof obj.type === 'string' &&
      ['model', 'agent', 'tool', 'effect'].includes(obj.type) &&
      Array.isArray(obj.capabilities) &&
      typeof obj.status === 'string' &&
      obj.metadata &&
      typeof obj.metadata === 'object'
    )
  }
}

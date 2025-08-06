import type { Capability } from '../../../types/engine'
import { BaseCapability } from '../base-capability'
import { ElevenLabsService } from '../../../services/voice/elevenlabs-service'

export interface VoiceSynthesisModel extends Capability {
  type: 'model'
  modelType: 'voice_synthesis'
  pricing: {
    costPerCharacter: number
    currency: 'USD'
  }
  synthesizeVoice: (text: string, options?: VoiceSynthesisOptions) => Promise<VoiceSynthesisResult>
}

export interface VoiceSynthesisOptions {
  voiceId?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

export interface VoiceSynthesisResult {
  audioUrl: string
  audioBuffer?: ArrayBuffer
  duration: number // in seconds
  cost: number
  metadata: {
    model: string
    voiceId: string
    characterCount: number
    generationTime: number
  }
}

/**
 * ElevenLabs Voice Synthesis Model
 * Wraps the existing ElevenLabsService for engine integration
 */
export class ElevenLabsVoiceModel extends BaseCapability implements VoiceSynthesisModel {
  id = 'elevenlabs-voice'
  name = 'ElevenLabs Voice Synthesis'
  type = 'model' as const
  modelType = 'voice_synthesis' as const
  description = 'High-quality AI voice synthesis with natural-sounding speech'
  version = '1.0.0'
  provider = 'ElevenLabs'
  capabilities = [
    'voice_synthesis',
    'text_to_speech',
    'natural_voice',
    'multilingual'
  ]
  
  pricing = {
    costPerCharacter: 0.0002, // $0.02 per 100 characters
    currency: 'USD' as const
  }
  
  metadata = {
    costPerUse: 0.02, // Average for ~100 characters
    averageLatency: 3000, // 3 seconds average
    qualityScore: 0.92,
    supportedFormats: ['audio/mpeg', 'audio/wav'],
    limitations: ['Character limits per request', 'API rate limits'],
    examples: [
      {
        input: 'Hello, how are you today?',
        output: '[Generated audio file]',
        description: 'Natural voice synthesis example'
      }
    ]
  }
  
  status = 'active' as const

  private elevenLabsService: ElevenLabsService | null = null

  constructor(config?: {
    apiKey?: string
    voiceId?: string
  }) {
    super() // Call parent constructor first
    // Initialize with config or environment variables
    const apiKey = config?.apiKey || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY
    const voiceId = config?.voiceId || process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || 'default'

    if (apiKey) {
      this.elevenLabsService = new ElevenLabsService({
        apiKey,
        voiceId,
        voiceSettings: {
          stability: 0.75,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true
        }
      })
    } else {
      console.warn('ElevenLabs API key not provided, voice synthesis will be unavailable')
    }
  }

  async synthesizeVoice(
    text: string, 
    options: VoiceSynthesisOptions = {}
  ): Promise<VoiceSynthesisResult> {
    const startTime = Date.now()
    
    if (!this.elevenLabsService) {
      throw new Error('ElevenLabs service not initialized - API key required')
    }
    
    try {
      // Use the existing ElevenLabsService for actual synthesis
      const audioBuffer = await this.elevenLabsService.synthesizeText(text)
      
      const generationTime = Date.now() - startTime
      const characterCount = text.length
      const cost = characterCount * this.pricing.costPerCharacter
      
      // Estimate duration (rough calculation: ~150 words per minute, ~5 chars per word)
      const estimatedDuration = (characterCount / 5) / (150 / 60) // seconds
      
      // Create audio URL from buffer (in a real implementation, this would be uploaded to storage)
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' })
      const audioUrl = URL.createObjectURL(audioBlob)
      
      return {
        audioUrl,
        audioBuffer,
        duration: estimatedDuration,
        cost,
        metadata: {
          model: this.name,
          voiceId: options.voiceId || 'default',
          characterCount,
          generationTime
        }
      }
    } catch (error) {
      console.error('ElevenLabs voice synthesis failed:', error)
      throw new Error(`Voice synthesis failed: ${error}`)
    }
  }

  /**
   * Check if the service is available
   */
  isAvailable(): boolean {
    return this.elevenLabsService !== null
  }

  /**
   * Get available voices (if supported by the service)
   */
  async getAvailableVoices(): Promise<Array<{
    id: string
    name: string
    description: string
  }>> {
    // This would require extending the ElevenLabsService to support voice listing
    // For now, return a default set
    return [
      {
        id: 'default',
        name: 'One (Default)',
        description: 'The default voice for One AI assistant'
      }
    ]
  }
}

/**
 * Browser Speech Synthesis Model (fallback)
 * Uses the browser's built-in speech synthesis as a free alternative
 */
export class BrowserSpeechModel extends BaseCapability implements VoiceSynthesisModel {
  id = 'browser-speech'
  name = 'Browser Speech Synthesis'
  type = 'model' as const
  modelType = 'voice_synthesis' as const
  description = 'Browser-based text-to-speech synthesis (free but lower quality)'
  version = '1.0.0'
  provider = 'Browser'
  capabilities = [
    'voice_synthesis',
    'text_to_speech',
    'offline_capable'
  ]
  
  pricing = {
    costPerCharacter: 0, // Free
    currency: 'USD' as const
  }
  
  metadata = {
    costPerUse: 0,
    averageLatency: 1000,
    qualityScore: 0.6, // Lower quality than ElevenLabs
    supportedFormats: ['audio/wav'],
    limitations: ['Browser-dependent quality', 'Limited voice options'],
    examples: [
      {
        input: 'This is browser speech synthesis',
        output: '[Browser-generated audio]',
        description: 'Browser speech example'
      }
    ]
  }
  
  status = 'active' as const

  async synthesizeVoice(
    text: string, 
    options: VoiceSynthesisOptions = {}
  ): Promise<VoiceSynthesisResult> {
    const startTime = Date.now()
    
    try {
      // Use browser's speech synthesis API
      if (!('speechSynthesis' in window)) {
        throw new Error('Speech synthesis not supported in this browser')
      }

      const utterance = new SpeechSynthesisUtterance(text)
      
      // Configure voice settings
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) {
        utterance.voice = voices[0] // Use first available voice
      }
      
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 1.0

      // Create a promise to handle the async speech synthesis
      const audioBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        utterance.onend = () => {
          // Browser speech synthesis doesn't provide audio buffer
          // Return empty buffer as placeholder
          resolve(new ArrayBuffer(0))
        }
        
        utterance.onerror = (event) => {
          reject(new Error(`Speech synthesis error: ${event.error}`))
        }
        
        speechSynthesis.speak(utterance)
      })

      const generationTime = Date.now() - startTime
      const characterCount = text.length
      const cost = 0 // Free
      
      // Estimate duration
      const estimatedDuration = (characterCount / 5) / (150 / 60)
      
      return {
        audioUrl: '', // Browser speech doesn't provide URL
        audioBuffer,
        duration: estimatedDuration,
        cost,
        metadata: {
          model: this.name,
          voiceId: 'browser-default',
          characterCount,
          generationTime
        }
      }
    } catch (error) {
      console.error('Browser speech synthesis failed:', error)
      throw new Error(`Voice synthesis failed: ${error}`)
    }
  }

  isAvailable(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  async getAvailableVoices(): Promise<Array<{
    id: string
    name: string
    description: string
  }>> {
    if (!this.isAvailable()) {
      return []
    }

    const voices = speechSynthesis.getVoices()
    return voices.map((voice, index) => ({
      id: `browser-voice-${index}`,
      name: voice.name,
      description: `${voice.lang} - ${voice.name}`
    }))
  }
}

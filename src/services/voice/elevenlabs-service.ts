/**
 * ElevenLabs Voice Synthesis Service
 * Handles text-to-speech conversion using ElevenLabs API
 */

export interface VoiceSettings {
  stability: number
  similarity_boost: number
  style?: number
  use_speaker_boost?: boolean
}

export interface ElevenLabsConfig {
  apiKey: string
  voiceId: string // Default voice ID for One
  modelId?: string
  voiceSettings?: VoiceSettings
}

export class ElevenLabsService {
  private config: ElevenLabsConfig
  private audioContext: AudioContext | null = null
  private isPlaying = false

  constructor(config: ElevenLabsConfig) {
    this.config = config
    this.initAudioContext()
  }

  private initAudioContext() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    } catch (error) {
      console.error('Failed to initialize AudioContext:', error)
    }
  }

  /**
   * Convert text to speech using ElevenLabs API
   */
  async synthesizeSpeech(
    text: string, 
    voiceId?: string,
    options?: {
      voiceSettings?: VoiceSettings
      modelId?: string
    }
  ): Promise<ArrayBuffer> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || this.config.voiceId}`
    
    const requestBody = {
      text,
      model_id: options?.modelId || this.config.modelId || 'eleven_monolingual_v1',
      voice_settings: options?.voiceSettings || this.config.voiceSettings || {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': this.config.apiKey
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`)
    }

    return await response.arrayBuffer()
  }

  /**
   * Play synthesized audio
   */
  async playAudio(audioBuffer: ArrayBuffer): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized')
    }

    if (this.isPlaying) {
      return // Prevent overlapping audio
    }

    try {
      this.isPlaying = true
      
      // Resume audio context if suspended (required for user interaction)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume()
      }

      const audioBufferDecoded = await this.audioContext.decodeAudioData(audioBuffer)
      const source = this.audioContext.createBufferSource()
      
      source.buffer = audioBufferDecoded
      source.connect(this.audioContext.destination)
      
      return new Promise((resolve) => {
        source.onended = () => {
          this.isPlaying = false
          resolve()
        }
        source.start()
      })
    } catch (error) {
      this.isPlaying = false
      throw error
    }
  }

  /**
   * Synthesize and play text in one call
   */
  async speakText(
    text: string,
    voiceId?: string,
    options?: {
      voiceSettings?: VoiceSettings
      modelId?: string
    }
  ): Promise<void> {
    try {
      const audioBuffer = await this.synthesizeSpeech(text, voiceId, options)
      await this.playAudio(audioBuffer)
    } catch (error) {
      console.error('Failed to speak text:', error)
      throw error
    }
  }

  /**
   * Get available voices from ElevenLabs
   */
  async getVoices(): Promise<any[]> {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': this.config.apiKey
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.status}`)
    }

    const data = await response.json()
    return data.voices || []
  }

  /**
   * Check if currently playing audio
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Stop current audio playback
   */
  stopPlayback(): void {
    this.isPlaying = false
    // Note: AudioBufferSourceNode cannot be stopped once started
    // This flag prevents new audio from starting
  }
}

// Default configuration for One's voice
export const DEFAULT_ONE_VOICE_CONFIG: Partial<ElevenLabsConfig> = {
  voiceSettings: {
    stability: 0.4,
    similarity_boost: 0.8,
    style: 0.2,
    use_speaker_boost: true
  },
  modelId: 'eleven_multilingual_v2' // Supports multiple languages
}

// Recommended voice IDs for different personalities
export const VOICE_PRESETS = {
  // Professional and clear
  PROFESSIONAL: 'pNInz6obpgDQGcFmaJgB', // Adam
  
  // Warm and friendly
  FRIENDLY: 'Xb7hH8MSUJpSbSDYk0k2', // Alice
  
  // Calm and soothing
  CALM: 'pqHfZKP75CvOlQylNhV4', // Bill
  
  // Energetic and enthusiastic  
  ENERGETIC: 'IKne3meq5aSn9XLyUdCD', // Charlie
  
  // Custom One voice (you'll need to create this)
  ONE: 'YOUR_CUSTOM_VOICE_ID_HERE'
}

/**
 * OpenAI API Adapter
 * Handles actual API calls to OpenAI services (GPT-4, DALL-E 3)
 */

export interface OpenAITextRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  max_tokens?: number
  temperature?: number
}

export interface OpenAIImageRequest {
  model: string
  prompt: string
  size?: '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  n?: number
}

export class OpenAIAdapter {
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1'

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('OpenAI API key not provided')
    }
  }

  /**
   * Generate text using GPT-4
   */
  async generateText(request: OpenAITextRequest): Promise<any> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Generate image using DALL-E 3
   */
  async generateImage(request: OpenAIImageRequest): Promise<any> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const response = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
    }

    return await response.json()
  }

  /**
   * Calculate cost for text generation
   */
  calculateTextCost(inputTokens: number, outputTokens: number, model: string): number {
    const pricing = {
      'gpt-4': { input: 0.03 / 1000, output: 0.06 / 1000 },
      'gpt-4-turbo': { input: 0.01 / 1000, output: 0.03 / 1000 }
    }

    const modelPricing = pricing[model as keyof typeof pricing] || pricing['gpt-4']
    return (inputTokens * modelPricing.input) + (outputTokens * modelPricing.output)
  }

  /**
   * Calculate cost for image generation
   */
  calculateImageCost(size: string, quality: string, quantity: number): number {
    const baseCost = 0.08 // $0.08 for 1024x1024 standard
    const qualityMultiplier = quality === 'hd' ? 2 : 1
    const sizeMultiplier = size.includes('1792') ? 1.5 : 1
    
    return baseCost * qualityMultiplier * sizeMultiplier * quantity
  }
}

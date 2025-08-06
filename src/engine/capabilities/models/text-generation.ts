import type { Capability } from '../../../types/engine'
import { BaseCapability } from '../base-capability'
import { OpenAIService } from '../../../services/llm/openai-service'

export interface TextGenerationModel extends Capability {
  type: 'model'
  modelType: 'text_generation'
  pricing: {
    costPerToken: number
    currency: 'USD'
    inputTokenCost: number
    outputTokenCost: number
  }
  generateText: (prompt: string, options?: TextGenerationOptions) => Promise<TextGenerationResult>
}

export interface TextGenerationOptions {
  maxTokens?: number
  temperature?: number
  model?: string
  systemPrompt?: string
}

export interface TextGenerationResult {
  text: string
  cost: number
  metadata: {
    model: string
    tokensUsed: {
      input: number
      output: number
      total: number
    }
    generationTime: number
  }
}

/**
 * GPT-4 Text Generation Model
 * Wraps the existing OpenAIService for engine integration
 */
export class GPT4Model extends BaseCapability implements TextGenerationModel {
  id = 'openai-gpt-4'
  name = 'GPT-4 Text Generation'
  type = 'model' as const
  modelType = 'text_generation' as const
  description = 'Advanced language model for text generation, editing, and analysis'
  version = '1.0.0'
  provider = 'OpenAI'
  capabilities = [
    'text_generation',
    'text_editing',
    'creative_writing',
    'analysis',
    'summarization',
    'translation'
  ]
  
  pricing = {
    costPerToken: 0.00003, // $0.03 per 1K tokens average
    currency: 'USD' as const,
    inputTokenCost: 0.00003, // $0.03 per 1K input tokens
    outputTokenCost: 0.00006  // $0.06 per 1K output tokens
  }
  
  metadata = {
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
  }
  
  status = 'active' as const

  private openaiService: OpenAIService

  constructor() {
    super() // Call parent constructor first
    this.openaiService = new OpenAIService()
  }

  async generateText(
    prompt: string, 
    options: TextGenerationOptions = {}
  ): Promise<TextGenerationResult> {
    const startTime = Date.now()
    
    try {
      // Use the existing OpenAIService for actual generation
      // This maintains compatibility with existing functionality
      const userContext = {
        userId: 'engine-user',
        sessionId: `session_${Date.now()}`,
        name: '',
        currentStep: 'completed' as const,
        timeContext: {
          timeOfDay: 'morning' as const,
          dayOfWeek: 'Monday',
          timezone: 'UTC'
        },
        emotionalState: {
          mood: 'curious' as const,
          energy: 'medium' as const,
          creativity: 'high' as const
        },
        preferences: {
          communicationStyle: 'casual' as const,
          creativityLevel: 'balanced' as const,
          contentTypes: ['text'] as const
        },
        recentInteractions: []
      }

      const context = {
        userInput: prompt,
        intent: { primaryGoal: 'generate_text' },
        scenario: null,
        userContext,
        conversationStep: 'text_generation'
      }

      const response = await this.openaiService.generateContextualResponse(context)
      
      const generationTime = Date.now() - startTime
      
      // Estimate tokens (rough calculation)
      const inputTokens = this.estimateTokens(prompt)
      const outputTokens = this.estimateTokens(response.content)
      const totalTokens = inputTokens + outputTokens
      
      // Calculate cost
      const cost = (inputTokens * this.pricing.inputTokenCost) + 
                   (outputTokens * this.pricing.outputTokenCost)
      
      return {
        text: response.content,
        cost,
        metadata: {
          model: this.name,
          tokensUsed: {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens
          },
          generationTime
        }
      }
    } catch (error) {
      console.error('GPT-4 generation failed:', error)
      throw new Error(`Text generation failed: ${error}`)
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }
}

/**
 * GPT-3.5 Turbo Model (lower cost alternative)
 */
export class GPT35TurboModel extends BaseCapability implements TextGenerationModel {
  id = 'openai-gpt-3.5-turbo'
  name = 'GPT-3.5 Turbo'
  type = 'model' as const
  modelType = 'text_generation' as const
  description = 'Fast and cost-effective language model for general text generation'
  version = '1.0.0'
  provider = 'OpenAI'
  capabilities = [
    'text_generation',
    'text_editing',
    'creative_writing',
    'analysis'
  ]
  
  pricing = {
    costPerToken: 0.000002, // Much cheaper
    currency: 'USD' as const,
    inputTokenCost: 0.000001, // $0.001 per 1K input tokens
    outputTokenCost: 0.000002  // $0.002 per 1K output tokens
  }
  
  metadata = {
    costPerUse: 0.005, // Much lower cost
    averageLatency: 1500, // Faster
    qualityScore: 0.85, // Lower quality
    supportedFormats: ['text/plain', 'text/markdown'],
    limitations: ['Less creative than GPT-4', 'Token limit: 4096'],
    examples: [
      {
        input: 'Summarize this text',
        output: 'Here is a concise summary...',
        description: 'Text summarization example'
      }
    ]
  }
  
  status = 'active' as const

  private openaiService: OpenAIService

  constructor() {
    super() // Call parent constructor first
    this.openaiService = new OpenAIService()
  }

  async generateText(
    prompt: string, 
    options: TextGenerationOptions = {}
  ): Promise<TextGenerationResult> {
    const startTime = Date.now()
    
    try {
      // Similar implementation to GPT-4 but with different pricing
      const userContext = {
        userId: 'engine-user',
        sessionId: `session_${Date.now()}`,
        name: '',
        currentStep: 'completed' as const,
        timeContext: {
          timeOfDay: 'morning' as const,
          dayOfWeek: 'Monday',
          timezone: 'UTC'
        },
        emotionalState: {
          mood: 'curious' as const,
          energy: 'medium' as const,
          creativity: 'high' as const
        },
        preferences: {
          communicationStyle: 'casual' as const,
          creativityLevel: 'balanced' as const,
          contentTypes: ['text'] as const
        },
        recentInteractions: []
      }

      const context = {
        userInput: prompt,
        intent: { primaryGoal: 'generate_text' },
        scenario: null,
        userContext,
        conversationStep: 'text_generation'
      }

      const response = await this.openaiService.generateContextualResponse(context)
      
      const generationTime = Date.now() - startTime
      
      const inputTokens = this.estimateTokens(prompt)
      const outputTokens = this.estimateTokens(response.content)
      const totalTokens = inputTokens + outputTokens
      
      const cost = (inputTokens * this.pricing.inputTokenCost) + 
                   (outputTokens * this.pricing.outputTokenCost)
      
      return {
        text: response.content,
        cost,
        metadata: {
          model: this.name,
          tokensUsed: {
            input: inputTokens,
            output: outputTokens,
            total: totalTokens
          },
          generationTime
        }
      }
    } catch (error) {
      console.error('GPT-3.5 Turbo generation failed:', error)
      throw new Error(`Text generation failed: ${error}`)
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }
}

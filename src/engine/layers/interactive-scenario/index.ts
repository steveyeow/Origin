import type { UserContext, Scenario, EngineResponse, OnboardingStep, IInteractiveScenarioLayer, Capability } from '../../../types/engine'
import { ONBOARDING_SCENARIOS, GENERAL_SCENARIOS } from './scenarios'
import { generateScenarioId, selectScenarioByContext } from './utils'
import { OpenAIService } from '../../../services/llm/openai-service'

/**
 * Interactive Scenario Layer (ISL)
 * Enhanced with AI-driven scenario generation
 */
export class InteractiveScenarioLayer implements IInteractiveScenarioLayer {
  private userContexts = new Map<string, UserContext>()
  private llmService: OpenAIService

  constructor() {
    this.llmService = new OpenAIService()
  }

  /**
   * Propose a scenario based on user context
   * MVP: Select from predefined scenarios based on context
   */
  async proposeScenario(context: UserContext): Promise<Scenario> {
    // Store/update user context
    this.userContexts.set(context.userId, context)

    // Handle onboarding scenarios
    if (context.currentStep !== 'completed') {
      return this.getOnboardingScenario(context.currentStep, context)
    }

    // Handle general scenarios (post-onboarding)
    return this.selectGeneralScenario(context)
  }

  /**
   * Get onboarding-specific scenarios
   */
  async getOnboardingScenario(step: OnboardingStep, context: UserContext): Promise<Scenario> {
    const scenarios = ONBOARDING_SCENARIOS[step]
    
    if (!scenarios || scenarios.length === 0) {
      // Fallback scenario
      return {
        id: generateScenarioId(),
        type: 'onboarding',
        title: 'Welcome',
        description: 'Getting to know each other',
        prompt: "Hello! I'm One, your creative companion. Let's start our journey together!",
        difficulty: 'beginner',
        estimatedTime: 2,
        tags: ['onboarding', 'introduction']
      }
    }

    // MVP: Simple selection based on context
    return selectScenarioByContext(scenarios, context)
  }

  /**
   * Handle user response and determine next action
   */
  async handleUserResponse(response: string, context: UserContext): Promise<EngineResponse> {
    const updatedContext = { ...context }

    // Process response based on current onboarding step
    switch (context.currentStep) {
      case 'naming-one':
        updatedContext.oneName = response.trim()
        updatedContext.currentStep = 'naming-user'
        
        // Update stored context
        this.userContexts.set(context.userId, updatedContext)
        
        return {
          message: `Thank you for calling me ${response.trim()}! Now, what should I call you? I'd love to know your name so we can have a more personal connection.`,
          nextStep: 'naming-user'
        }

      case 'naming-user':
        updatedContext.name = response.trim()
        updatedContext.currentStep = 'scenario'
        
        // Update stored context
        this.userContexts.set(context.userId, updatedContext)
        
        // Propose first creative scenario
        const scenario = await this.proposeScenario(updatedContext)
        
        return {
          message: `Nice to meet you, ${response.trim()}!`,
          scenario,
          nextStep: 'scenario'
        }

      case 'scenario':
        // User has responded to a scenario - this would trigger the next phase
        // For now, just acknowledge
        return {
          message: `That's wonderful, ${context.name}! I can sense the creative energy in your words. Let's start creating something amazing together! 🌟`,
          nextStep: 'completed'
        }

      default:
        return {
          message: "I'm not sure how to respond to that right now. Let's continue our conversation!",
          error: 'Unknown onboarding step'
        }
    }
  }

  /**
   * Update user context
   */
  async updateUserContext(userId: string, updates: Partial<UserContext>): Promise<void> {
    const existingContext = this.userContexts.get(userId)
    if (existingContext) {
      const updatedContext = { ...existingContext, ...updates }
      this.userContexts.set(userId, updatedContext)
    }
  }

  /**
   * Get user context
   */
  getUserContext(userId: string): UserContext | undefined {
    return this.userContexts.get(userId)
  }

  /**
   * Select general scenario (post-onboarding)
   * MVP: Simple time-based and preference-based selection
   */
  private selectGeneralScenario(context: UserContext): Scenario {
    const timeOfDay = context.timeContext.timeOfDay
    const mood = context.emotionalState?.mood || 'curious'
    
    // Filter scenarios by time and mood
    const suitableScenarios = GENERAL_SCENARIOS.filter((scenario: Scenario) => {
      const hasTimeTag = scenario.tags.includes(timeOfDay)
      const hasMoodTag = scenario.tags.includes(mood)
      return hasTimeTag || hasMoodTag || scenario.tags.includes('universal')
    })

    if (suitableScenarios.length === 0) {
      return GENERAL_SCENARIOS[0] // Fallback
    }

    // MVP: Random selection from suitable scenarios
    const randomIndex = Math.floor(Math.random() * suitableScenarios.length)
    return suitableScenarios[randomIndex]
  }

  /**
   * Generate dynamic scenario based on context and available capabilities
   * AI-driven scenario generation using LLM
   */
  async generateDynamicScenario(context: UserContext, availableCapabilities: Capability[]): Promise<Scenario> {
    try {
      // Try AI-powered generation first
      if (this.llmService.isReady()) {
        console.log('🤖 Generating AI-powered scenario...')
        const aiScenario = await this.llmService.generateDynamicScenario(context, availableCapabilities)
        
        return {
          id: generateScenarioId(),
          type: 'creative_prompt',
          title: aiScenario.title,
          description: aiScenario.description,
          prompt: aiScenario.prompt,
          difficulty: this.inferDifficultyFromContext(context),
          estimatedTime: this.estimateTimeFromContext(context),
          tags: [...aiScenario.tags, 'ai-generated', 'personalized']
        }
      }
    } catch (error) {
      console.warn('AI scenario generation failed, falling back to enhanced static:', error)
    }
    
    // Fallback to enhanced static selection
    console.log('📝 Using enhanced static scenario generation...')
    return this.generateEnhancedStaticScenario(context, availableCapabilities)
  }

  /**
   * Explain a capability in user-friendly terms
   * AI-powered personalized explanations
   */
  async explainCapability(capability: Capability, userContext: UserContext): Promise<string> {
    try {
      // Try AI-powered explanation first
      if (this.llmService.isReady()) {
        console.log('🤖 Generating AI-powered capability explanation...')
        const aiExplanation = await this.llmService.explainCapability(capability, userContext)
        return aiExplanation
      }
    } catch (error) {
      console.warn('AI capability explanation failed, falling back to template:', error)
    }
    
    // Fallback to template-based explanation
    console.log('📝 Using template-based capability explanation...')
    return this.generateTemplateExplanation(capability, userContext)
  }

  /**
   * Create initial user context
   */
  createUserContext(userId: string): UserContext {
    const now = new Date()
    const hour = now.getHours()
    
    let timeOfDay: UserContext['timeContext']['timeOfDay']
    if (hour < 12) timeOfDay = 'morning'
    else if (hour < 17) timeOfDay = 'afternoon'
    else if (hour < 21) timeOfDay = 'evening'
    else timeOfDay = 'night'

    const context: UserContext = {
      userId,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      recentInteractions: [],
      preferences: {
        communicationStyle: 'casual',
        creativityLevel: 'balanced'
      },
      timeContext: {
        timeOfDay,
        dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        lastActiveTime: now
      },
      currentStep: 'landing'
    }

    this.userContexts.set(userId, context)
    return context
  }

  // ===== PRIVATE AI-ENHANCEMENT METHODS =====

  private enhanceDescriptionWithCapabilities(baseDescription: string, capabilities: Capability[]): string {
    const capabilityCount = capabilities.length
    const modelCount = capabilities.filter(c => c.type === 'model').length
    const agentCount = capabilities.filter(c => c.type === 'agent').length
    
    if (capabilityCount === 0) {
      return baseDescription
    }
    
    const enhancement = capabilityCount > 5 
      ? ` I have access to ${capabilityCount} different AI capabilities to help bring your ideas to life!`
      : modelCount > 0 
        ? ` I can use advanced AI models to help you create amazing content!`
        : ` I have specialized tools and agents ready to assist you!`
    
    return baseDescription + enhancement
  }

  private enhancePromptWithCapabilities(basePrompt: string, context: UserContext, capabilities: Capability[]): string {
    if (capabilities.length === 0) {
      return basePrompt
    }
    
    // Find the most relevant capability based on context
    const relevantCapability = this.findMostRelevantCapability(capabilities, context)
    
    if (!relevantCapability) {
      return basePrompt
    }
    
    // Add capability-specific enhancement
    const capabilityHint = this.getCapabilityHint(relevantCapability, context)
    
    return `${basePrompt} ${capabilityHint}`
  }

  private findMostRelevantCapability(capabilities: Capability[], context: UserContext): Capability | null {
    // Simple relevance scoring based on user context
    const timeOfDay = context.timeContext.timeOfDay
    const mood = context.emotionalState?.mood || 'curious'
    
    // Score capabilities based on context
    const scoredCapabilities = capabilities.map(capability => {
      let score = 0
      
      // Time-based scoring
      if (timeOfDay === 'morning' && capability.capabilities.includes('text_generation')) score += 2
      if (timeOfDay === 'evening' && capability.capabilities.includes('image_generation')) score += 2
      
      // Mood-based scoring
      if (mood === 'creative' && capability.type === 'model') score += 3
      if (mood === 'focused' && capability.type === 'agent') score += 2
      
      // Quality-based scoring
      score += (capability.metadata.qualityScore || 0.5) * 2
      
      return { capability, score }
    })
    
    // Return the highest scoring capability
    const best = scoredCapabilities.sort((a, b) => b.score - a.score)[0]
    return best ? best.capability : null
  }

  /**
   * Helper methods for scenario enhancement and AI integration
   */
  private inferDifficultyFromContext(context: UserContext): 'beginner' | 'intermediate' | 'advanced' {
    const creativityLevel = context.preferences.creativityLevel
    if (creativityLevel === 'conservative') return 'beginner'
    if (creativityLevel === 'experimental') return 'advanced'
    return 'intermediate'
  }

  private estimateTimeFromContext(context: UserContext): string {
    const timeOfDay = context.timeContext.timeOfDay
    if (timeOfDay === 'morning') return '15-30 minutes'
    if (timeOfDay === 'evening') return '10-20 minutes'
    return '20-40 minutes'
  }

  private async generateEnhancedStaticScenario(context: UserContext, availableCapabilities: Capability[]): Promise<Scenario> {
    const capabilityTypes = availableCapabilities.map(cap => cap.type)
    
    // Create a more sophisticated scenario based on available capabilities
    const baseScenario = this.selectGeneralScenario(context)
    
    // Enhance the scenario with capability-aware content
    const enhancedScenario: Scenario = {
      ...baseScenario,
      id: generateScenarioId(),
      description: this.enhanceDescriptionWithCapabilities(baseScenario.description, availableCapabilities),
      prompt: this.enhancePromptWithCapabilities(baseScenario.prompt, context, availableCapabilities),
      tags: [...baseScenario.tags, 'ai-enhanced', ...capabilityTypes]
    }
    
    return enhancedScenario
  }

  private generateTemplateExplanation(capability: Capability, userContext: UserContext): string {
    const explanationTemplates = {
      model: `I have access to ${capability.name}, which is a powerful AI model that can help with ${capability.capabilities.join(', ')}. This means I can ${this.getCapabilityBenefits(capability)} for you!`,
      agent: `I can use ${capability.name}, a specialized assistant that excels at ${capability.capabilities.join(', ')}. This agent can ${this.getCapabilityBenefits(capability)} to make your content even better!`,
      tool: `I have ${capability.name} in my toolkit, which allows me to ${capability.capabilities.join(', ')}. This tool helps me ${this.getCapabilityBenefits(capability)} with precision!`,
      effect: `I can apply ${capability.name}, a special effect that enhances content through ${capability.capabilities.join(', ')}. This effect can ${this.getCapabilityBenefits(capability)} to make your content more engaging!`
    }
    
    const baseExplanation = explanationTemplates[capability.type] || `I can use ${capability.name} to help you with ${capability.capabilities.join(', ')}.`
    
    // Personalize based on user context
    const personalizedExplanation = this.personalizeExplanation(baseExplanation, userContext)
    
    return personalizedExplanation
  }

  private enhanceDescriptionWithCapabilities(description: string, capabilities: Capability[]): string {
    const capabilityCount = capabilities.length
    const capabilityTypes = [...new Set(capabilities.map(cap => cap.type))]
    
    return `${description} I have ${capabilityCount} AI capabilities available, including ${capabilityTypes.join(', ')} to help bring your ideas to life.`
  }

  private enhancePromptWithCapabilities(prompt: string, context: UserContext, capabilities: Capability[]): string {
    const relevantCapabilities = capabilities.slice(0, 3) // Show top 3
    const capabilityList = relevantCapabilities.map(cap => cap.name).join(', ')
    
    return `${prompt} With my ${capabilityList} capabilities, I can help you create something truly special. What would you like to explore?`
  }

  private getCapabilityBenefits(capability: Capability): string {
    const benefitMap = {
      model: 'generate high-quality content',
      agent: 'provide specialized assistance',
      tool: 'perform precise operations',
      effect: 'enhance and transform content'
    }
    
    return benefitMap[capability.type] || 'assist you effectively'
  }

  private personalizeExplanation(explanation: string, context: UserContext): string {
    const name = context.name || 'friend'
    const mood = context.emotionalState?.mood || 'curious'
    
    if (mood === 'excited') {
      return `Hey ${name}! ${explanation} This is going to be amazing! ✨`
    } else if (mood === 'focused') {
      return `${name}, ${explanation} Let's create something professional and polished.`
    } else {
      return `${name}, ${explanation} I'm here to help you explore your creativity!`
    }
  }
}

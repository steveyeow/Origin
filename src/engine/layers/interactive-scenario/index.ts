/**
 * INTERACTIVE SCENARIO LAYER (ISL) - CONVERSATION ORCHESTRATOR
 * 
 * PURPOSE: Manages conversation flow, user onboarding, and scenario generation
 * RESPONSIBILITY: Core conversation logic, user context management, and AI scenario creation
 * 
 * KEY FUNCTIONS:
 * - handleUserResponse(): Processes user input and determines conversation flow
 * - Onboarding Management: Handles naming-one, naming-user, and scenario steps
 * - Context Management: Creates, stores, and updates user conversation context
 * - Name Extraction: AI-powered intelligent name extraction from user input
 * - Dynamic Scenarios: AI-generated conversation scenarios based on user context
 * 
 * CONVERSATION FLOW:
 * New User → naming-one (AI name) → naming-user (user name) → scenario (creative conversation)
 * 
 * USAGE: Used by Core Engine as the primary conversation management layer
 * DEPENDENCIES: OpenAI Service, UnifiedInvocation, scenario definitions, utility functions
 */

import type { UserContext, Scenario, EngineResponse, ConversationStep, IInteractiveScenarioLayer, Capability } from '../../../types/engine'
import { ONBOARDING_SCENARIOS, GENERAL_SCENARIOS } from './scenarios'
import { generateScenarioId, selectScenarioByContext, extractNameFromInput } from './utils'
import { unifiedInvocation } from '../invocation/unified-invocation'
import { openAIService } from '../../../services/llm/openai-service'
export class InteractiveScenarioLayer implements IInteractiveScenarioLayer {
  private userContexts = new Map<string, UserContext>()
  private capabilitiesInitialized = false
  private static instance: InteractiveScenarioLayer | null = null

  constructor() {
    // Singleton pattern to prevent multiple instances
    if (InteractiveScenarioLayer.instance) {
      console.log('♻️ Reusing existing InteractiveScenarioLayer instance')
      return InteractiveScenarioLayer.instance
    }
    
    console.log('🏭 Creating new InteractiveScenarioLayer instance')
    // Initialize capabilities
    this.initializeCapabilities()
    InteractiveScenarioLayer.instance = this
  }

  private async initializeCapabilities(): Promise<void> {
    try {
      await unifiedInvocation.initialize()
      this.capabilitiesInitialized = true
      console.log('✅ ISL: Capabilities initialized')
    } catch (error) {
      console.error('❌ ISL: Failed to initialize capabilities:', error)
    }
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
  async getOnboardingScenario(step: ConversationStep | undefined, context: UserContext): Promise<Scenario> {
    // Default to 'landing' if step is undefined
    const safeStep = step || 'landing'
    const scenarios = ONBOARDING_SCENARIOS[safeStep]
    
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
    console.log(`🔄 ISL: Processing user response in step: ${context.currentStep}`, { 
      response, 
      userId: context.userId,
      userName: context.name,
      oneName: context.oneName,
      currentStep: context.currentStep,
      storedContext: this.userContexts.get(context.userId)
    })
    
    // CRITICAL: Ensure we have the latest stored context to prevent data loss
    const storedContext = this.userContexts.get(context.userId)
    if (storedContext) {
      console.log('🔄 ISL: Using stored context instead of passed context', {
        passedContextName: context.name,
        storedContextName: storedContext.name,
        passedContextStep: context.currentStep,
        storedContextStep: storedContext.currentStep
      })
      // Use stored context as base and merge with any updates from passed context
      Object.assign(updatedContext, storedContext)
      console.log('🔄 ISL: Context merged - using stored context as authoritative source')
    }

    // Handle special __GREETING__ input for dynamic greeting generation
    if (response === '__GREETING__') {
      console.log('🎯 ISL: Generating dynamic greeting based on context')
      
      // CRITICAL: Store the context BEFORE generating greeting to ensure persistence
      this.userContexts.set(context.userId, context)
      console.log('💾 ISL: User context stored for greeting generation:', {
        userId: context.userId,
        currentStep: context.currentStep,
        storedContexts: Array.from(this.userContexts.keys())
      })
      
      return await this.generateDynamicGreeting(context)
    }

    // REMOVED: Duplicate name extraction function - now using centralized version from utils

    // Process response based on current onboarding step
    switch (context.currentStep) {
      case 'naming-one':
        // This is where the user provides the AI's name
        const extractedAIName = await extractNameFromInput(response, true, updatedContext, openAIService)
        console.log(`🤖 ISL: NAMING-ONE step - Extracted AI name: ${extractedAIName} (original: ${response})`)
        console.log('🔍 ISL: Context before naming-one processing:', {
          userId: context.userId,
          currentStep: context.currentStep,
          existingOneName: context.oneName,
          existingUserName: context.name
        })
        
        updatedContext.oneName = extractedAIName
        updatedContext.currentStep = 'naming-user'
        
        console.log('🔄 ISL: Context after naming-one processing:', {
          userId: updatedContext.userId,
          currentStep: updatedContext.currentStep,
          newOneName: updatedContext.oneName,
          userName: updatedContext.name
        })
        
        // Update stored context
        this.userContexts.set(context.userId, updatedContext)
        
        return {
          message: `Thank you! I'll be happy to be called ${extractedAIName}. Now, what should I call you? I'd love to know your name so we can have a more personal connection.`,
          nextStep: 'naming-user',
          requestId: `isl_${Date.now()}` // Add unique request ID for UI synchronization
        }

      case 'naming-user':
        // This is where the user provides their own name
        const extractedUserName = await extractNameFromInput(response, false, updatedContext, openAIService)
        console.log(`👤 ISL: NAMING-USER step - Extracted user name: ${extractedUserName} (original: ${response})`)
        console.log('🔍 ISL: Context before naming-user processing:', {
          userId: context.userId,
          currentStep: context.currentStep,
          oneName: context.oneName,
          existingUserName: context.name
        })
        
        updatedContext.name = extractedUserName
        updatedContext.currentStep = 'scenario'
        
        console.log('🔄 ISL: Context after naming-user processing:', {
          userId: updatedContext.userId,
          currentStep: updatedContext.currentStep,
          oneName: updatedContext.oneName,
          newUserName: updatedContext.name,
          onboardingStatus: 'COMPLETED' // Log that onboarding is now complete
        })
        
        // Update stored context
        this.userContexts.set(context.userId, updatedContext)
        
        // Get a scenario to propose
        const scenario = await this.proposeScenario(updatedContext)
        
        return {
          message: `Perfect! I like that name, ${extractedUserName}. ${scenario.prompt}`,
          scenario,
          nextStep: 'scenario',
          requestId: `isl_${Date.now()}` // Add unique request ID for UI synchronization
        }

      case 'scenario':
        // User has responded to a scenario - continue the conversation
        // Keep the step as 'scenario' to continue the conversation flow
        updatedContext.currentStep = 'scenario'
        // REMOVED duplicate context storage - will store once at the end
        
        // Ensure we have the user's name - use updatedContext or fallback
        const userName = updatedContext.name || context.name || 'there'
        console.log(`🎉 ISL: Processing scenario response for user: ${userName}`, {
          updatedContextName: updatedContext.name,
          originalContextName: context.name,
          finalUserName: userName,
          fullUpdatedContext: updatedContext
        })
        
        // CRITICAL: Store the updated context BEFORE returning response
        // Ensure we have a valid userId to prevent context loss
        const userId = context.userId || 'mock-user-123';
        
        // Add timestamp to help with debugging
        updatedContext.lastUpdated = Date.now();
        
        // Store with consistent userId
        this.userContexts.set(userId, updatedContext);
        
        console.log('💾 ISL: Context stored after scenario response:', {
          userId: userId,
          storedContext: this.userContexts.get(userId),
          timestamp: updatedContext.lastUpdated,
          step: updatedContext.currentStep
        });
        
        // Verify storage was successful
        const verifiedContext = this.userContexts.get(userId);
        if (!verifiedContext) {
          console.error('⚠️ ISL: CRITICAL ERROR - Context storage verification failed!', {
            userId: userId,
            attemptedToStore: updatedContext
          });
        }
        
        return {
          message: `That's wonderful, ${userName}! I can sense the creative energy in your words. Let's start creating something amazing together! 🌟`,
          nextStep: 'scenario', // Keep the conversation going instead of ending it
          requestId: `isl_${Date.now()}` // Add unique request ID for UI synchronization
        }

      default:
        console.warn(`Unknown onboarding step: ${context.currentStep}`);
        // Fallback to a more helpful response
        return {
          message: `I heard you say "${response}". That's fascinating! Let me help you with that. What would you like to explore or create together?`,
          nextStep: 'completed'
        }
    }
  }

  /**
   * Update user context
   */
  async updateUserContext(userId: string, updates: Partial<UserContext>): Promise<void> {
    // Ensure we have a valid userId to prevent context loss
    const safeUserId = userId || 'mock-user-123';
    
    console.log(`🔄 ISL: updateUserContext called for userId: ${safeUserId}`, {
      hasUpdates: !!updates,
      updatedStep: updates?.currentStep,
      timestamp: new Date().toISOString()
    });
    
    // Get existing context with consistent userId
    let existingContext = this.userContexts.get(safeUserId);
    
    // If context not found with provided ID but we're using a fallback ID,
    // try to find it with the original ID for backwards compatibility
    if (!existingContext && safeUserId === 'mock-user-123' && userId !== safeUserId) {
      const legacyContext = this.userContexts.get(userId);
      if (legacyContext) {
        console.log(`⚠️ ISL: Found context to update with legacy userId: ${userId}`, {
          legacyStep: legacyContext.currentStep,
          migratingToId: safeUserId
        });
        
        // Migrate the context to the new consistent ID
        existingContext = legacyContext;
        this.userContexts.delete(userId); // Remove from old ID
      }
    }
    
    if (existingContext) {
      // Add timestamp to track updates
      const updatedContext = { 
        ...existingContext, 
        ...updates,
        lastUpdated: Date.now()
      };
      
      // Store with consistent userId
      this.userContexts.set(safeUserId, updatedContext);
      
      console.log(`✅ ISL: Context updated successfully for userId: ${safeUserId}`, {
        previousStep: existingContext.currentStep,
        newStep: updatedContext.currentStep,
        timestamp: updatedContext.lastUpdated
      });
    } else {
      // Create new context if none exists
      const newContext = {
        ...this.createDefaultUserContext(),
        ...updates,
        lastUpdated: Date.now()
      };
      
      this.userContexts.set(safeUserId, newContext);
      
      console.log(`🆕 ISL: Created new context for userId: ${safeUserId}`, {
        step: newContext.currentStep,
        timestamp: newContext.lastUpdated
      });
    }
  }

  /**
   * Creates a default user context with safe initial values
   * Used when no existing context is found
   */
  private createDefaultUserContext(): UserContext {
    const now = new Date();
    return {
      currentStep: 'naming-one', // Start at the first step of onboarding
      name: '',
      aiName: '',
      timeContext: {
        timeOfDay: now.getHours() < 12 ? 'morning' : 
                  now.getHours() < 18 ? 'afternoon' : 'evening',
        dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
        season: [2, 3, 4].includes(now.getMonth()) ? 'spring' :
                [5, 6, 7].includes(now.getMonth()) ? 'summer' :
                [8, 9, 10].includes(now.getMonth()) ? 'fall' : 'winter'
      },
      emotionalState: {
        mood: 'curious',
        energy: 'neutral'
      },
      createdAt: Date.now(),
      lastUpdated: Date.now()
    };
  }
  
  /**
   * Get user context
   */
  getUserContext(userId: string): UserContext | undefined {
    // Ensure we have a valid userId to prevent context loss
    const safeUserId = userId || 'mock-user-123';
    
    // Get context with consistent userId
    const context = this.userContexts.get(safeUserId);
    
    console.log(`🔍 ISL: getUserContext called for userId: ${safeUserId}`, {
      found: !!context,
      step: context?.currentStep || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    // If context not found with provided ID but we're using a fallback ID,
    // try to find it with the original ID for backwards compatibility
    if (!context && safeUserId === 'mock-user-123' && userId !== safeUserId) {
      const legacyContext = this.userContexts.get(userId);
      if (legacyContext) {
        console.log(`⚠️ ISL: Found context with legacy userId: ${userId}`, {
          legacyStep: legacyContext.currentStep,
          migratingToId: safeUserId
        });
        
        // Migrate the context to the new consistent ID
        this.userContexts.set(safeUserId, legacyContext);
        return legacyContext;
      }
    }
    
    return context;
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
   * AI-driven scenario generation using LLM and unified capabilities
   */
  async generateDynamicScenario(context: UserContext, availableCapabilities?: Capability[]): Promise<Scenario> {
    // Get capabilities from unified invocation if not provided
    if (!availableCapabilities && this.capabilitiesInitialized) {
      try {
        availableCapabilities = await unifiedInvocation.getAvailableCapabilities()
      } catch (error) {
        console.warn('Failed to get capabilities, using fallback scenario')
        availableCapabilities = []
      }
    } else if (!availableCapabilities) {
      availableCapabilities = []
    }
    try {
      // Try AI-powered generation first
      if (openAIService.isReady()) {
        console.log('🤖 Generating AI-powered scenario...')
        const aiScenario = await openAIService.generateDynamicScenario(context, availableCapabilities) as any // Type cast to avoid type error
        
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
    
    // Enhanced scenario generation with capability awareness
    if (availableCapabilities.length > 0) {
      return this.generateEnhancedStaticScenario(context, availableCapabilities)
    } else {
      // Fallback to basic scenario if no capabilities available
      return this.selectGeneralScenario(context)
    }
  }

  /**
   * Explain a capability in user-friendly terms
   * AI-powered personalized explanations
   */
  async explainCapability(capability: Capability, userContext: UserContext): Promise<string> {
    try {
      // Try AI-powered explanation first
      if (openAIService.isReady()) {
        console.log('🤖 Generating AI-powered capability explanation...')
        const aiExplanation = await openAIService.explainCapability(capability, userContext)
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
      currentStep: 'naming-one' // Start directly with naming-one for new users
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
    const capabilityName = relevantCapability.name
    const capabilityType = relevantCapability.type
    
    // Generate a simple hint based on capability type
    const capabilityHint = capabilityType === 'model' 
      ? `I can use ${capabilityName} to help with this!`
      : `I have ${capabilityName} available to assist you!`
    
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

  private estimateTimeFromContext(context: UserContext): number {
    const timeOfDay = context.timeContext.timeOfDay
    if (timeOfDay === 'morning') return 20 // 15-30 minutes average
    if (timeOfDay === 'evening') return 15 // 10-20 minutes average
    return 30 // 20-40 minutes average
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

  // These methods are already defined above, removing duplicates

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

  /**
   * Generate dynamic greeting based on user context
   * Uses AI to create personalized welcome messages
   */
  private async generateDynamicGreeting(context: UserContext): Promise<EngineResponse> {
    try {
      console.log('🎨 ISL: Generating AI-powered dynamic greeting')
      
      // Get available capabilities for context-aware greeting
      const availableCapabilities = this.capabilitiesInitialized ? 
        await unifiedInvocation.getAvailableCapabilities() : []
      
      // Create contextual greeting prompt based on user status and current step
      let greetingPrompt: string
      const timeOfDay = context.timeContext.timeOfDay
      const userName = context.name || 'traveler'
      const oneName = context.oneName || 'One'
      
      if (context.currentStep === 'naming-one') {
        // New user greeting - ask for AI name
        greetingPrompt = `You are One, an AI navigator in Origin, a generative universe. Create a warm, engaging welcome message for a new user. It's ${timeOfDay} time. Introduce yourself as their AI companion and ask if they'd like to give you a new name. Make it feel personal, exciting, and mention that you can help them create amazing content. Keep it conversational and friendly, around 2-3 sentences.`
      } else if (context.currentStep === 'scenario') {
        // Returning user greeting
        greetingPrompt = `You are ${oneName}, an AI companion in Origin. Create a personalized welcome back message for ${userName}. It's ${timeOfDay} time. Reference your relationship as their creative partner and ask what they'd like to explore or create today. Mention some of your capabilities like generating images, videos, or helping with creative projects. Keep it warm and engaging, around 2-3 sentences.`
      } else {
        // Default greeting
        greetingPrompt = `You are One, an AI navigator. Create a friendly greeting for ${userName}. It's ${timeOfDay} time. Ask how you can help them today and mention your creative capabilities. Keep it warm and concise.`
      }
      
      // Add capability context to the prompt if available
      if (availableCapabilities.length > 0) {
        const capabilityTypes = [...new Set(availableCapabilities.map(cap => cap.type))]
        greetingPrompt += ` You have access to ${capabilityTypes.join(', ')} capabilities to help bring their ideas to life.`
      }
      
      // TEMPORARY: Use static greetings during onboarding to prevent OpenAI service fallback issues
    // TODO: Re-enable dynamic greetings once OpenAI service fallback is properly configured
    console.log('⚠️ ISL: Using static greeting to prevent fallback issues during onboarding')
    
    let staticGreeting: string
    
    if (context.currentStep === 'naming-one') {
      const greetings = [
        "Welcome to Origin! I'm One, your AI navigator in this creative universe. I'm here to help you explore, create, and bring your wildest ideas to life. Would you like to give me a new name?",
        "Hello! I'm One, your creative companion in this generative universe. I can help you turn imagination into reality. What would you like to call me?",
        "Hi there! I'm One, your AI guide in Origin. Together we can create incredible content and experiences. Would you like to give me a special name?"
      ]
      staticGreeting = greetings[Math.floor(Math.random() * greetings.length)]
    } else if (context.currentStep === 'scenario') {
      const userName = context.name || 'friend'
      const oneName = context.oneName || 'One'
      const greetings = [
        `Welcome back, ${userName}! It's ${oneName} here, ready to help you create something amazing today. What would you like to explore or bring to life?`,
        `Hello ${userName}! I'm ${oneName}, excited to continue our creative journey. What shall we create together today?`,
        `Hi ${userName}! ${oneName} here, ready for our next adventure. What creative project are you thinking about?`
      ]
      staticGreeting = greetings[Math.floor(Math.random() * greetings.length)]
    } else {
      staticGreeting = "Hello! I'm One, your creative AI companion. How can I help you explore and create today?"
    }
    
    console.log('✅ ISL: Static greeting selected successfully')
    
    return {
      message: staticGreeting,
      nextStep: context.currentStep,
      requestId: `greeting_${Date.now()}`
    }  
    } catch (error) {
      console.error('❌ ISL: Failed to generate dynamic greeting:', error)
      
      // Fallback to context-appropriate static greeting
      let fallbackMessage: string
      
      if (context.currentStep === 'naming-one') {
        fallbackMessage = "Welcome to Origin! I'm One, your AI navigator in this creative universe. I'm here to help you explore, create, and bring your wildest ideas to life. Would you like to give me a new name?"
      } else if (context.currentStep === 'scenario') {
        const userName = context.name || 'friend'
        const oneName = context.oneName || 'One'
        fallbackMessage = `Welcome back, ${userName}! It's ${oneName} here, ready to help you create something amazing today. What would you like to explore or bring to life?`
      } else {
        fallbackMessage = "Hello! I'm One, your creative AI companion. How can I help you explore and create today?"
      }
      
      return {
        message: fallbackMessage,
        nextStep: context.currentStep,
        requestId: `greeting_fallback_${Date.now()}`
      }
    }
  }
}

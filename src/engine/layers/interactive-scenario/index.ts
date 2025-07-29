import type { UserContext, Scenario, EngineResponse, OnboardingStep, IInteractiveScenarioLayer } from '../../../types/engine'
import { ONBOARDING_SCENARIOS, GENERAL_SCENARIOS } from './scenarios'
import { generateScenarioId, selectScenarioByContext } from './utils'

/**
 * Interactive Scenario Layer (ISL)
 * MVP Implementation: Static scenario selection with basic context awareness
 * Future: Dynamic LLM-powered scenario generation
 */
export class InteractiveScenarioLayer implements IInteractiveScenarioLayer {
  private userContexts = new Map<string, UserContext>()

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
}

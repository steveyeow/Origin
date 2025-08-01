import type {
  RawIntent,
  EnrichedIntent,
  OptimizedPrompt,
  UserContext,
  IIntentionReasoningLayer
} from '../../../types/engine'
import { OpenAIService } from '../../../services/llm/openai-service'

/**
 * Intention Reasoning Layer (IRL)
 * Processes user input to understand intentions and generate optimized prompts
 */
export class IntentionReasoningLayer implements IIntentionReasoningLayer {
  private llmService: OpenAIService

  constructor() {
    this.llmService = new OpenAIService()
  }

  /**
   * Process user input to extract raw intent
   */
  async processUserInput(input: string, context: UserContext): Promise<RawIntent> {
    // For MVP: Simple keyword-based intent extraction
    // TODO: Replace with actual LLM-powered intent processing
    
    const primaryGoal = this.extractPrimaryGoal(input)
    const contentType = this.inferContentType(input)
    const explicitRequirements = this.extractExplicitRequirements(input)
    const implicitNeeds = this.inferImplicitNeeds(input, context)
    const emotionalTone = this.detectEmotionalTone(input)
    const urgency = this.assessUrgency(input)
    const confidence = this.calculateConfidence(input)

    const rawIntent: RawIntent = {
      text: input,
      primaryGoal,
      contentType,
      explicitRequirements,
      implicitNeeds,
      emotionalTone,
      urgency,
      confidence
    }

    return rawIntent
  }

  /**
   * Enrich the raw intent with additional context and details using AI
   */
  async enrichIntent(rawIntent: RawIntent, userContext: UserContext): Promise<EnrichedIntent> {
    try {
      // Try AI-powered intent enrichment first
      if (this.llmService.isReady()) {
        console.log(' Enriching intent with AI...')
        const aiEnrichment = await this.llmService.enrichIntent(rawIntent, userContext)
        
        return {
          id: `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          rawIntent,
          refinedGoal: aiEnrichment.refinedGoal,
          contextualBackground: aiEnrichment.contextualBackground,
          targetAudience: aiEnrichment.targetAudience,
          successCriteria: aiEnrichment.successCriteria,
          estimatedComplexity: this.estimateComplexity(rawIntent),
          suggestedApproaches: this.suggestApproaches(rawIntent, userContext),
          potentialChallenges: this.identifyPotentialChallenges(rawIntent),
          qualityExpectations: this.setQualityExpectations(rawIntent, userContext)
        }
      }
    } catch (error) {
      console.warn('AI intent enrichment failed, falling back to basic enrichment:', error)
    }
    
    // Fallback to basic enrichment
    console.log(' Using basic intent enrichment...')
    return this.enrichIntentWithBasicLogic(rawIntent, userContext)
  }

  /**
   * Generate optimized prompt for content creation using AI
   */
  async generateOptimizedPrompt(enrichedIntent: EnrichedIntent): Promise<OptimizedPrompt> {
    try {
      // Try AI-powered prompt generation first
      if (this.llmService.isReady()) {
        console.log(' Generating optimized prompt with AI...')
        const aiPrompt = await this.llmService.generateOptimizedPrompt(enrichedIntent)
        
        return {
          id: `prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          mainPrompt: aiPrompt,
          styleModifiers: this.generateStyleModifiers(enrichedIntent),
          qualityEnhancers: this.generateQualityEnhancers(enrichedIntent),
          contextualCues: this.generateContextualCues(enrichedIntent),
          negativePrompts: this.generateNegativePrompts(enrichedIntent),
          technicalParameters: this.generateTechnicalParameters(enrichedIntent),
          estimatedTokens: this.estimateTokenCount(aiPrompt)
        }
      }
    } catch (error) {
      console.warn('AI prompt generation failed, falling back to template-based:', error)
      mainPrompt,
      styleModifiers,
      qualityEnhancers,
      contextualCues,
      negativePrompts,
      technicalParameters,
      estimatedTokens
    }

    return optimizedPrompt
  }

  /**
   * Validate if intent is feasible with available capabilities
   */
  async validateIntentFeasibility(intent: EnrichedIntent, availableCapabilities: Capability[]): Promise<boolean> {
    // Check if we have capabilities that can handle the intent
    const requiredCapabilityTypes = this.getRequiredCapabilityTypes(intent)
    
    const hasRequiredCapabilities = requiredCapabilityTypes.every(requiredType => 
      availableCapabilities.some(capability => 
        capability.type === requiredType && capability.status === 'active'
      )
    )

    // Check complexity vs available capability quality
    const averageQuality = availableCapabilities.reduce((sum, cap) => 
      sum + (cap.metadata.qualityScore || 0.5), 0
    ) / availableCapabilities.length

    const complexityFeasible = this.isComplexityFeasible(intent.estimatedComplexity, averageQuality)

    return hasRequiredCapabilities && complexityFeasible
  }

  // ===== PRIVATE METHODS =====

  private extractPrimaryGoal(input: string): string {
    // Simple goal extraction based on keywords
    const goalKeywords = {
      'create': ['create', 'make', 'build', 'generate', 'produce'],
      'edit': ['edit', 'modify', 'change', 'update', 'improve'],
      'analyze': ['analyze', 'review', 'examine', 'study', 'evaluate'],
      'explain': ['explain', 'describe', 'tell me about', 'what is'],
      'help': ['help', 'assist', 'support', 'guide']
    }

    for (const [goal, keywords] of Object.entries(goalKeywords)) {
      if (keywords.some(keyword => input.toLowerCase().includes(keyword))) {
        return goal
      }
    }

    return 'create' // Default goal
  }

  private inferContentType(input: string): ContentType {
    const contentKeywords = {
      'image': ['image', 'picture', 'photo', 'visual', 'artwork', 'illustration'],
      'video': ['video', 'animation', 'movie', 'clip'],
      'audio': ['audio', 'sound', 'music', 'voice'],
      'story': ['story', 'narrative', 'tale', 'fiction'],
      'character': ['character', 'persona', 'avatar'],
      'text': ['text', 'article', 'content', 'writing']
    }

    for (const [type, keywords] of Object.entries(contentKeywords)) {
      if (keywords.some(keyword => input.toLowerCase().includes(keyword))) {
        return type as ContentType
      }
    }

    return 'text' // Default content type
  }

  private extractExplicitRequirements(input: string): string[] {
    // Extract explicit requirements from user input
    const requirements: string[] = []
    
    // Look for specific format requirements
    if (input.includes('format')) requirements.push('specific_format')
    if (input.includes('style')) requirements.push('specific_style')
    if (input.includes('length')) requirements.push('specific_length')
    if (input.includes('tone')) requirements.push('specific_tone')
    
    return requirements
  }

  private inferImplicitNeeds(input: string, context: UserContext): string[] {
    const needs: string[] = []
    
    // Infer needs based on context
    if (context.preferences.creativityLevel === 'experimental') {
      needs.push('creative_exploration')
    }
    
    if (context.timeContext.timeOfDay === 'morning') {
      needs.push('energetic_tone')
    }
    
    return needs
  }

  private detectEmotionalTone(input: string): string {
    const toneKeywords = {
      'excited': ['amazing', 'awesome', 'fantastic', '!'],
      'professional': ['business', 'formal', 'professional'],
      'casual': ['hey', 'hi', 'cool', 'nice'],
      'creative': ['creative', 'artistic', 'imaginative']
    }

    for (const [tone, keywords] of Object.entries(toneKeywords)) {
      if (keywords.some(keyword => input.toLowerCase().includes(keyword))) {
        return tone
      }
    }

    return 'neutral'
  }

  private assessUrgency(input: string): 'low' | 'medium' | 'high' {
    if (input.includes('urgent') || input.includes('asap') || input.includes('quickly')) {
      return 'high'
    }
    if (input.includes('soon') || input.includes('today')) {
      return 'medium'
    }
    return 'low'
  }

  private calculateConfidence(input: string): number {
    // Simple confidence calculation based on input clarity
    const words = input.split(' ').length
    const hasSpecificTerms = /\b(create|make|generate|write|design)\b/i.test(input)
    
    let confidence = 0.5 // Base confidence
    
    if (words > 5) confidence += 0.2 // More detailed input
    if (hasSpecificTerms) confidence += 0.2 // Clear action words
    if (input.includes('?')) confidence -= 0.1 // Questions are less certain
    
    return Math.min(Math.max(confidence, 0), 1)
  }

  private refineGoal(primaryGoal: string, context: UserContext): string {
    // Refine goal based on user context
    const refinements = {
      create: context.preferences.creativityLevel === 'experimental' 
        ? 'create innovative and experimental content'
        : 'create high-quality content',
      edit: 'improve and refine existing content',
      analyze: 'provide detailed analysis and insights',
      explain: 'provide clear and comprehensive explanation',
      help: 'provide helpful assistance and guidance'
    }

    return refinements[primaryGoal as keyof typeof refinements] || primaryGoal
  }

  private generateDetailedRequirements(rawIntent: RawIntent, context: UserContext): any[] {
    // Generate detailed requirements based on intent and context
    const requirements = [
      {
        type: 'functional',
        description: `Generate ${rawIntent.contentType} content that fulfills: ${rawIntent.primaryGoal}`,
        priority: 'must-have',
        measurable: true
      }
    ]

    if (context.preferences.communicationStyle) {
      requirements.push({
        type: 'aesthetic',
        description: `Match ${context.preferences.communicationStyle} communication style`,
        priority: 'should-have',
        measurable: false
      })
    }

    return requirements
  }

  private inferStylePreferences(rawIntent: RawIntent, context: UserContext): any[] {
    const preferences = []

    if (context.preferences.communicationStyle) {
      preferences.push({
        category: 'tone',
        value: context.preferences.communicationStyle,
        strength: 0.8
      })
    }

    if (rawIntent.emotionalTone !== 'neutral') {
      preferences.push({
        category: 'tone',
        value: rawIntent.emotionalTone,
        strength: 0.6
      })
    }

    return preferences
  }

  private buildContextualBackground(context: UserContext): string {
    const parts = []
    
    if (context.name) {
      parts.push(`User name: ${context.name}`)
    }
    
    parts.push(`Time context: ${context.timeContext.timeOfDay} on ${context.timeContext.dayOfWeek}`)
    
    if (context.emotionalState) {
      parts.push(`User mood: ${context.emotionalState.mood}`)
    }

    return parts.join('. ')
  }

  private identifyTargetAudience(rawIntent: RawIntent, context: UserContext): string {
    // Simple audience identification
    if (rawIntent.text.includes('professional') || rawIntent.text.includes('business')) {
      return 'professional audience'
    }
    if (rawIntent.text.includes('casual') || rawIntent.text.includes('friends')) {
      return 'casual audience'
    }
    return 'general audience'
  }

  private defineSuccessCriteria(rawIntent: RawIntent): string[] {
    return [
      `Successfully addresses the primary goal: ${rawIntent.primaryGoal}`,
      `Matches the requested content type: ${rawIntent.contentType}`,
      `Maintains appropriate emotional tone: ${rawIntent.emotionalTone}`
    ]
  }

  private identifyConstraints(rawIntent: RawIntent, context: UserContext): any[] {
    const constraints = []

    if (rawIntent.urgency === 'high') {
      constraints.push({
        type: 'time',
        description: 'High urgency - prioritize speed over perfection',
        severity: 'soft'
      })
    }

    return constraints
  }

  private estimateComplexity(rawIntent: RawIntent): 'simple' | 'moderate' | 'complex' {
    const factors = [
      rawIntent.explicitRequirements.length,
      rawIntent.implicitNeeds.length,
      rawIntent.text.split(' ').length
    ]

    const totalComplexity = factors.reduce((sum, factor) => sum + factor, 0)

    if (totalComplexity < 5) return 'simple'
    if (totalComplexity < 15) return 'moderate'
    return 'complex'
  }

  private buildMainPrompt(intent: EnrichedIntent): string {
    return `${intent.refinedGoal}. ${intent.contextualBackground}. Target audience: ${intent.targetAudience}.`
  }

  private generateStyleModifiers(intent: EnrichedIntent): string[] {
    return intent.stylePreferences.map(pref => `${pref.category}: ${pref.value}`)
  }

  private generateQualityEnhancers(intent: EnrichedIntent): string[] {
    const enhancers = ['high quality', 'engaging', 'well-structured']
    
    if (intent.estimatedComplexity === 'complex') {
      enhancers.push('comprehensive', 'detailed')
    }
    
    return enhancers
  }

  private generateContextualCues(intent: EnrichedIntent): string[] {
    return [intent.contextualBackground]
  }

  private generateNegativePrompts(intent: EnrichedIntent): string[] {
    const negative = ['low quality', 'inappropriate content', 'off-topic']
    
    intent.constraints.forEach(constraint => {
      if (constraint.type === 'content') {
        negative.push(constraint.description)
      }
    })
    
    return negative
  }

  private generateTechnicalParameters(intent: EnrichedIntent): any {
    const baseParams = {
      temperature: 0.7,
      maxTokens: 1000
    }

    // Adjust based on complexity
    if (intent.estimatedComplexity === 'complex') {
      baseParams.maxTokens = 2000
      baseParams.temperature = 0.8
    } else if (intent.estimatedComplexity === 'simple') {
      baseParams.maxTokens = 500
      baseParams.temperature = 0.6
    }

    return baseParams
  }

  private estimateTokenCount(prompt: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(prompt.length / 4)
  }

  private getRequiredCapabilityTypes(intent: EnrichedIntent): string[] {
    const types = ['model'] // Always need at least a model
    
    if (intent.rawIntent.contentType === 'image') {
      types.push('model') // Image generation model
    }
    
    return types
  }

  private isComplexityFeasible(complexity: string, averageQuality: number): boolean {
    const thresholds = {
      simple: 0.3,
      moderate: 0.6,
      complex: 0.8
    }
    
    return averageQuality >= thresholds[complexity as keyof typeof thresholds]
  }
}

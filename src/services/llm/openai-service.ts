import OpenAI from 'openai'
import type { 
  UserContext, 
  Capability, 
  RawIntent, 
  EnrichedIntent, 
  OptimizedPrompt 
} from '../../types/engine'

/**
 * OpenAI LLM Service
 * Handles all interactions with OpenAI's API for AI-driven functionality
 * Implemented as a true singleton to prevent multiple instances during hot reloads
 */
// Define global type for singleton instance
declare global {
  var __OPENAI_SERVICE_INSTANCE__: OpenAIService | undefined
}

export class OpenAIService {
  private client: OpenAI | null = null;
  private isInitialized = false;
  
  constructor() {
    // Singleton initialization happens in the exported instance
    // This constructor should only be called once via the singleton pattern
    console.log('🏭 OpenAIService constructor called')
    this.initializeClient();
  }

  /**
   * Clean JSON response by removing markdown formatting
   */
  private cleanJsonResponse(response: string): string {
    // Remove markdown code blocks
    let cleaned = response.replace(/```json\s*/, '').replace(/```\s*$/, '')
    // Remove any leading/trailing whitespace
    cleaned = cleaned.trim()
    return cleaned
  }

  private initializeClient(): void {
    // Try different environment variable sources
    const apiKey = process.env.OPENAI_API_KEY || 
                   process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
                   (typeof window !== 'undefined' && (window as any).OPENAI_API_KEY)

    if (!apiKey) {
      console.warn('⚠️  OpenAI API key not found in environment variables.')
      console.warn('   Expected: OPENAI_API_KEY in .env.local')
      console.warn('   LLM features will use fallback implementations.')
      return
    }

    try {
      this.client = new OpenAI({
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true // For client-side usage in development
      })
      this.isInitialized = true
      console.log('✅ OpenAI service initialized successfully')
      console.log('🤖 AI-powered features are now active!')
    } catch (error) {
      console.error('❌ Failed to initialize OpenAI client:', error)
      console.warn('   Falling back to template-based responses')
    }
  }

  /**
   * Check if the service is ready to use
   */
  isReady(): boolean {
    return this.isInitialized && this.client !== null
  }

  /**
   * Generate dynamic scenario based on user context and available capabilities
   */
  async generateDynamicScenario(
    userContext: UserContext, 
    availableCapabilities: Capability[]
  ): Promise<{
    title: string
    description: string
    prompt: string
    tags: string[]
  }> {
    if (!this.isReady()) {
      return this.fallbackScenarioGeneration(userContext, availableCapabilities)
    }

    try {
      const capabilityDescriptions = availableCapabilities
        .slice(0, 5) // Limit to top 5 to avoid token overflow
        .map(cap => `${cap.name}: ${cap.description} (${cap.capabilities.join(', ')})`)
        .join('\n')

      const systemPrompt = `You are One, an AI creative companion in OriginX. Generate an engaging, personalized scenario for the user based on their context and available AI capabilities.

User Context:
- Name: ${userContext.name || 'User'}
- Time: ${userContext.timeContext.timeOfDay} on ${userContext.timeContext.dayOfWeek}
- Mood: ${userContext.emotionalState?.mood || 'curious'}
- Communication Style: ${userContext.preferences.communicationStyle || 'casual'}
- Creativity Level: ${userContext.preferences.creativityLevel || 'balanced'}

Available AI Capabilities:
${capabilityDescriptions}

Generate a scenario that:
1. Feels personal and engaging for this specific user
2. Showcases relevant AI capabilities naturally
3. Matches their mood and time context
4. Encourages creative exploration

Respond with a JSON object containing:
- title: A catchy, personalized title
- description: A brief, engaging description
- prompt: A conversational prompt that feels natural and inviting
- tags: Array of relevant tags`

      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt + '\n\nRespond with valid JSON only.' },
          { role: 'user', content: 'Generate a personalized scenario for me.' }
        ],
        temperature: 0.8,
        max_tokens: 500
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      const cleanedResponse = this.cleanJsonResponse(response)
      const scenarioData = JSON.parse(cleanedResponse)
      return {
        title: scenarioData.title || 'Creative Exploration',
        description: scenarioData.description || 'Let\'s create something amazing together!',
        prompt: scenarioData.prompt || 'What would you like to create today?',
        tags: Array.isArray(scenarioData.tags) ? scenarioData.tags : ['creative', 'ai-generated']
      }

    } catch (error) {
      console.error('Error generating dynamic scenario:', error)
      return this.fallbackScenarioGeneration(userContext, availableCapabilities)
    }
  }

  /**
   * Generate capability explanation in user-friendly terms
   */
  async explainCapability(
    capability: Capability, 
    userContext: UserContext
  ): Promise<string> {
    if (!this.isReady()) {
      return this.fallbackCapabilityExplanation(capability, userContext)
    }

    try {
      const systemPrompt = `You are One, an AI creative companion. Explain this AI capability to the user in a friendly, engaging way that makes them excited to use it.

User Context:
- Name: ${userContext.name || 'friend'}
- Mood: ${userContext.emotionalState?.mood || 'curious'}
- Communication Style: ${userContext.preferences.communicationStyle || 'casual'}

Capability to Explain:
- Name: ${capability.name}
- Type: ${capability.type}
- Description: ${capability.description}
- What it can do: ${capability.capabilities.join(', ')}

Explain this capability in a way that:
1. Matches the user's communication style
2. Feels personal and engaging
3. Shows practical benefits
4. Creates excitement about possibilities
5. Uses the user's name naturally
6. Keeps it concise (2-3 sentences max)

Be conversational and enthusiastic, like you're genuinely excited to share this cool tool with a friend.`

      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Explain this capability to me!' }
        ],
        temperature: 0.7,
        max_tokens: 200
      })

      const explanation = completion.choices[0]?.message?.content
      return explanation || this.fallbackCapabilityExplanation(capability, userContext)

    } catch (error) {
      console.error('Error explaining capability:', error)
      return this.fallbackCapabilityExplanation(capability, userContext)
    }
  }

  /**
   * Process user input to extract intent using LLM
   */
  async processUserIntent(input: string, userContext: UserContext): Promise<{
    primaryGoal: string
    contentType: string
    explicitRequirements: string[]
    implicitNeeds: string[]
    emotionalTone: string
    urgency: 'low' | 'medium' | 'high'
    confidence: number
  }> {
    if (!this.isReady()) {
      return this.fallbackIntentProcessing(input, userContext)
    }

    try {
      const systemPrompt = `You are an AI intent analyzer. Analyze the user's input to understand what they want to create or do.

User Context:
- Name: ${userContext.name || 'User'}
- Previous interactions: ${userContext.recentInteractions.length} messages
- Communication style: ${userContext.preferences.communicationStyle || 'casual'}

Analyze this input and respond with a JSON object containing:
- primaryGoal: Main action they want (create, edit, analyze, explain, help)
- contentType: Type of content (text, image, video, audio, story, character, mixed)
- explicitRequirements: Array of explicitly stated requirements
- implicitNeeds: Array of implied needs based on context
- emotionalTone: Detected emotional tone (excited, professional, casual, creative, neutral)
- urgency: How urgent this seems (low, medium, high)
- confidence: How confident you are in this analysis (0.0 to 1.0)

Be precise and analytical.`

      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt + '\n\nRespond with valid JSON only.' },
          { role: 'user', content: input }
        ],
        temperature: 0.3,
        max_tokens: 300
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      const cleanedResponse = this.cleanJsonResponse(response)
      const intentData = JSON.parse(cleanedResponse)
      return {
        primaryGoal: intentData.primaryGoal || 'create',
        contentType: intentData.contentType || 'text',
        explicitRequirements: Array.isArray(intentData.explicitRequirements) ? intentData.explicitRequirements : [],
        implicitNeeds: Array.isArray(intentData.implicitNeeds) ? intentData.implicitNeeds : [],
        emotionalTone: intentData.emotionalTone || 'neutral',
        urgency: ['low', 'medium', 'high'].includes(intentData.urgency) ? intentData.urgency : 'low',
        confidence: typeof intentData.confidence === 'number' ? Math.max(0, Math.min(1, intentData.confidence)) : 0.7
      }

    } catch (error) {
      console.error('Error processing user intent:', error)
      return this.fallbackIntentProcessing(input, userContext)
    }
  }

  /**
   * Enrich intent with additional context and details
   */
  async enrichIntent(
    rawIntent: RawIntent, 
    userContext: UserContext
  ): Promise<{
    refinedGoal: string
    contextualBackground: string
    targetAudience: string
    successCriteria: string[]
  }> {
    if (!this.isReady()) {
      return this.fallbackIntentEnrichment(rawIntent, userContext)
    }

    try {
      const systemPrompt = `You are an AI intent enrichment specialist. Take the user's basic intent and enrich it with helpful context and details.

User Context:
- Name: ${userContext.name || 'User'}
- Time: ${userContext.timeContext.timeOfDay} on ${userContext.timeContext.dayOfWeek}
- Mood: ${userContext.emotionalState?.mood || 'curious'}
- Creativity Level: ${userContext.preferences.creativityLevel || 'balanced'}

Raw Intent:
- Goal: ${rawIntent.primaryGoal}
- Content Type: ${rawIntent.contentType}
- Original Text: "${rawIntent.text}"
- Emotional Tone: ${rawIntent.emotionalTone}
- Requirements: ${rawIntent.explicitRequirements.join(', ')}

Enrich this intent and respond with JSON containing:
- refinedGoal: A more detailed, actionable version of their goal
- contextualBackground: Relevant context that should inform the creation
- targetAudience: Who this content is likely for
- successCriteria: Array of 3-5 specific criteria for success

Make it helpful and actionable while staying true to their original intent.`

      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt + '\n\nRespond with valid JSON only.' },
          { role: 'user', content: 'Enrich my intent with helpful details.' }
        ],
        temperature: 0.6,
        max_tokens: 400
      })

      const response = completion.choices[0]?.message?.content
      if (!response) {
        throw new Error('No response from OpenAI')
      }

      const cleanedResponse = this.cleanJsonResponse(response)
      const enrichedData = JSON.parse(cleanedResponse)
      return {
        refinedGoal: enrichedData.refinedGoal || rawIntent.primaryGoal,
        contextualBackground: enrichedData.contextualBackground || 'General creative context',
        targetAudience: enrichedData.targetAudience || 'General audience',
        successCriteria: Array.isArray(enrichedData.successCriteria) ? enrichedData.successCriteria : ['Meets user requirements', 'High quality output', 'Engaging content']
      }

    } catch (error) {
      console.error('Error enriching intent:', error)
      return this.fallbackIntentEnrichment(rawIntent, userContext)
    }
  }

  /**
   * Generate optimized prompt for content creation
   */
  async generateOptimizedPrompt(enrichedIntent: EnrichedIntent): Promise<string> {
    if (!this.isReady()) {
      return this.fallbackPromptGeneration(enrichedIntent)
    }

    try {
      const systemPrompt = `You are an expert prompt engineer. Create an optimized prompt for AI content generation based on the enriched user intent.

Intent Details:
- Refined Goal: ${enrichedIntent.refinedGoal}
- Content Type: ${enrichedIntent.rawIntent.contentType}
- Target Audience: ${enrichedIntent.targetAudience}
- Contextual Background: ${enrichedIntent.contextualBackground}
- Success Criteria: ${enrichedIntent.successCriteria.join(', ')}
- Complexity: ${enrichedIntent.estimatedComplexity}

Create a clear, specific prompt that will generate high-quality ${enrichedIntent.rawIntent.contentType} content. The prompt should:
1. Be specific and actionable
2. Include relevant context
3. Specify quality expectations
4. Be optimized for AI generation
5. Stay focused on the core goal

Return just the optimized prompt text, nothing else.`

      const completion = await this.client!.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Generate the optimized prompt.' }
        ],
        temperature: 0.4,
        max_tokens: 300
      })

      const prompt = completion.choices[0]?.message?.content
      return prompt || this.fallbackPromptGeneration(enrichedIntent)

    } catch (error) {
      console.error('Error generating optimized prompt:', error)
      return this.fallbackPromptGeneration(enrichedIntent)
    }
  }

  // ===== FALLBACK METHODS =====

  private fallbackScenarioGeneration(userContext: UserContext, capabilities: Capability[]) {
    const timeGreeting = {
      morning: 'Good morning',
      afternoon: 'Good afternoon', 
      evening: 'Good evening',
      night: 'Hello'
    }[userContext.timeContext.timeOfDay]

    const capabilityCount = capabilities.length
    const name = userContext.name || 'friend'

    return {
      title: `${timeGreeting}, ${name}!`,
      description: `I have ${capabilityCount} AI capabilities ready to help you create something amazing.`,
      prompt: `${timeGreeting}, ${name}! I'm excited to create with you today. With my ${capabilityCount} AI capabilities, we can bring any idea to life. What would you like to explore?`,
      tags: ['personalized', 'capability-aware', userContext.timeContext.timeOfDay]
    }
  }

  private fallbackCapabilityExplanation(capability: Capability, userContext: UserContext): string {
    const name = userContext.name || 'friend'
    const benefits = capability.capabilities.slice(0, 2).join(' and ')
    
    return `Hey ${name}! I have ${capability.name} which is amazing for ${benefits}. This means I can help you create really cool ${capability.type === 'model' ? 'AI-generated content' : 'enhanced results'} with this tool! ✨`
  }

  /**
   * Generate contextual response based on engine analysis
   */
  async generateContextualResponse(context: {
    userInput: string
    intent: any
    scenario: any
    userContext: UserContext
    conversationStep: string
  }): Promise<{ content: string; followUp?: string }> {
    try {
      if (!this.isReady()) {
        return this.fallbackContextualResponse(context)
      }

      const prompt = `You are One, an AI assistant in the OriginX platform. Generate a contextual response based on:

User Input: "${context.userInput}"
User Intent: ${JSON.stringify(context.intent)}
Conversation Step: ${context.conversationStep}
User Context: ${context.userContext.name || 'User'} (${context.userContext.timeContext.timeOfDay})

Guidelines:
1. Be natural and conversational
2. Address the user's actual input first
3. If this is a naming step, extract the name and acknowledge it
4. IMPORTANT: Be proactive and propose specific scenarios instead of asking "what do you want to do?"
5. Suggest concrete creative activities based on user's mood, time of day, or interests
6. Examples of good proposals:
   - "I sense you might be feeling creative today. How about we turn your current mood into a beautiful piece of art?"
   - "It's ${context.userContext.timeContext.timeOfDay} - perfect time for some creative expression. Want to create a short story about your day?"
   - "I can help you create something amazing! Let's make a personalized playlist that captures your vibe right now."
7. Keep responses concise and engaging
8. Use English only
9. Don't mention specific AI models or technical details
10. IMPORTANT: Combine everything into a single "content" field - do not use "followUp"

Generate a JSON response with:
{
  "content": "complete response with specific creative proposals"
}`

      const response = await this.client!.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.7
      })

      const responseText = response.choices[0]?.message?.content?.trim()
      if (responseText) {
        const cleanedResponse = this.cleanJsonResponse(responseText)
        try {
          return JSON.parse(cleanedResponse)
        } catch {
          return { content: responseText }
        }
      }

      return this.fallbackContextualResponse(context)
    } catch (error) {
      console.error('Contextual response generation failed:', error)
      return this.fallbackContextualResponse(context)
    }
  }

  private fallbackContextualResponse(context: {
    userInput: string
    intent: any
    scenario: any
    userContext: UserContext
    conversationStep: string
  }): { content: string; followUp?: string } {
    // Extract user name if available
    const userName = context.userContext.name || 'there'
    const timeOfDay = context.userContext.timeContext.timeOfDay
    const userInput = context.userInput.toLowerCase()
    
    // Handle different conversation steps
    if (context.conversationStep === 'naming-one') {
      // For naming-one step, this should be an initial greeting asking for AI name
      // NOT a response to user giving AI a name
      const greetingResponses = [
        `Welcome to Origin! I'm One, your AI navigator. I'm here to help you create amazing content and bring your ideas to life. Would you like to give me a new name?`,
        `Hi there! I'm One, your creative companion in this generative universe. I can help you explore endless possibilities. What would you like to call me?`,
        `Hello! I'm One, your AI guide in Origin. Together we can create incredible content and experiences. Would you like to give me a special name?`
      ]
      return {
        content: greetingResponses[Math.floor(Math.random() * greetingResponses.length)]
      }
    }
    
    if (context.conversationStep === 'naming-user' || context.conversationStep === 'naming-user-complete') {
      const greetings = [
        `Nice to meet you, ${userName}! I'm excited to create with you today. What would you like to explore or create together?`,
        `Hello ${userName}! It's wonderful to meet you. What brings you here today - are you looking to create something special?`,
        `Hi ${userName}! Great to connect with you. What kind of creative project are you thinking about?`
      ]
      return {
        content: greetings[Math.floor(Math.random() * greetings.length)]
      }
    }
    
    // Analyze user input for dynamic responses with specific proposals
    if (userInput.includes('create') || userInput.includes('make') || userInput.includes('build')) {
      const createResponses = [
        `I can sense your creative energy! How about we start with something visual - let's create a mood board that captures your current inspiration?`,
        `Creating something new sounds exciting! I'm thinking we could make a short story based on your day, or maybe design a personal logo that represents you?`,
        `I love helping with creative projects! Let's create a personalized playlist that matches your vibe right now, or we could design a digital artwork together.`
      ]
      return {
        content: createResponses[Math.floor(Math.random() * createResponses.length)]
      }
    }
    
    if (userInput.includes('help') || userInput.includes('assist') || userInput.includes('can do')) {
      const helpResponses = [
        `I'm here to help! Since it's ${timeOfDay}, how about we create something that captures this moment - maybe a quick sketch of your thoughts or a haiku about your day?`,
        `Absolutely! I can help you express yourself creatively. Want to turn your current mood into a color palette, or create a short poem about what's on your mind?`,
        `Of course! Let's start with something fun - I could help you design a personal avatar, create a motivational quote image, or write a creative story together.`
      ]
      return {
        content: helpResponses[Math.floor(Math.random() * helpResponses.length)]
      }
    }
    
    // Time-aware proactive responses
    const timeAwareResponses = [
      `Good ${timeOfDay}! Perfect timing for some creativity. How about we create a visual representation of your morning energy, or write a short reflection on what today might bring?`,
      `I find that fascinating! Let's explore that through creativity - we could create an abstract artwork inspired by your thoughts, or compose a short piece of music that captures this feeling.`,
      `That sounds intriguing! Want to turn that into something creative? We could design an infographic about it, create a story around the concept, or make a visual mind map.`,
      `I'd love to dive deeper into that with you. How about we create something together - maybe a digital collage that represents your ideas, or a creative writing piece that explores the topic?`
    ]
    
    return {
      content: timeAwareResponses[Math.floor(Math.random() * timeAwareResponses.length)]
    }
  }

  private fallbackIntentProcessing(input: string, userContext: UserContext) {
    // Simple keyword-based fallback
    const createWords = ['create', 'make', 'build', 'generate', 'write']
    const imageWords = ['image', 'picture', 'photo', 'visual']
    const storyWords = ['story', 'narrative', 'tale']
    
    const primaryGoal = createWords.some(word => input.toLowerCase().includes(word)) ? 'create' : 'help'
    const contentType = imageWords.some(word => input.toLowerCase().includes(word)) ? 'image' :
                       storyWords.some(word => input.toLowerCase().includes(word)) ? 'story' : 'text'
    
    return {
      primaryGoal,
      contentType,
      explicitRequirements: [],
      implicitNeeds: [],
      emotionalTone: input.includes('!') ? 'excited' : 'neutral',
      urgency: input.includes('urgent') || input.includes('quickly') ? 'high' as const : 'low' as const,
      confidence: 0.6
    }
  }

  private fallbackIntentEnrichment(rawIntent: RawIntent, userContext: UserContext) {
    return {
      refinedGoal: `Create high-quality ${rawIntent.contentType} content that ${rawIntent.primaryGoal}s user expectations`,
      contextualBackground: `User wants to ${rawIntent.primaryGoal} ${rawIntent.contentType} content`,
      targetAudience: 'general audience',
      successCriteria: [
        `Successfully ${rawIntent.primaryGoal}s ${rawIntent.contentType} content`,
        'Meets quality standards',
        'Aligns with user intent'
      ]
    }
  }

  private fallbackPromptGeneration(enrichedIntent: EnrichedIntent): string {
    return `Create ${enrichedIntent.rawIntent.contentType} content that ${enrichedIntent.refinedGoal}. Target audience: ${enrichedIntent.targetAudience}. Context: ${enrichedIntent.contextualBackground}`
  }
}

// Create global singleton instance
if (!globalThis.__OPENAI_SERVICE_INSTANCE__) {
  console.log('🌍 Creating global OpenAIService instance')
  globalThis.__OPENAI_SERVICE_INSTANCE__ = new OpenAIService()
}

// Export the singleton instance
export const openAIService = globalThis.__OPENAI_SERVICE_INSTANCE__

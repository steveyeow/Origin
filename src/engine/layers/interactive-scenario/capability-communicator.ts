import { unifiedInvocation } from '../invocation/unified-invocation'
import type { Capability } from '../../../types/engine'

export interface UserFriendlyCapability {
  name: string
  description: string
  whatItDoes: string
  whenToUse: string
  exampleUseCase: string
  difficulty: 'easy' | 'medium' | 'advanced'
  cost: {
    range: string
    description: string
  }
}

export interface CapabilityProposal {
  capability: UserFriendlyCapability
  relevanceScore: number
  suggestedPrompt: string
  estimatedCost: number
  benefits: string[]
}

export class CapabilityCommunicator {
  constructor() {
    // Initialize unified invocation layer
    unifiedInvocation.initialize().catch(console.error)
  }

  /**
   * Get all available capabilities in user-friendly format
   */
  async getAvailableCapabilities(): Promise<UserFriendlyCapability[]> {
    const capabilities = await unifiedInvocation.getAvailableCapabilities()
    
    return capabilities.map(capability => this.translateCapabilityToUserLanguage(capability))
  }

  /**
   * Propose relevant capabilities based on user context
   */
  async proposeCapabilities(
    userInput: string,
    conversationHistory: any[] = []
  ): Promise<CapabilityProposal[]> {
    const capabilities = await unifiedInvocation.getAvailableCapabilities()
    const proposals: CapabilityProposal[] = []

    for (const capability of capabilities) {
      const relevanceScore = this.calculateRelevance(userInput, capability)
      
      if (relevanceScore > 0.3) { // Only propose relevant capabilities
        const userFriendly = this.translateCapabilityToUserLanguage(capability)
        const suggestedPrompt = this.generateSuggestedPrompt(userInput, capability)
        
        proposals.push({
          capability: userFriendly,
          relevanceScore,
          suggestedPrompt,
          estimatedCost: capability.metadata.costPerUse || 0,
          benefits: this.generateBenefits(capability, userInput)
        })
      }
    }

    // Sort by relevance score
    return proposals.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Generate capability-aware scenario suggestions
   */
  async generateScenarioSuggestions(userContext: any): Promise<string[]> {
    const capabilities = await unifiedInvocation.getAvailableCapabilities()
    const scenarios: string[] = []

    // Image generation scenarios
    const imageModels = capabilities.filter(c => c.capabilities.includes('image_generation'))
    if (imageModels.length > 0) {
      scenarios.push(
        "Create a stunning visual for your project - I can generate custom images from your descriptions",
        "Design a logo or artwork - Let's bring your creative vision to life",
        "Visualize concepts - Turn your ideas into compelling images"
      )
    }

    // Video generation scenarios
    const videoModels = capabilities.filter(c => c.capabilities.includes('video_generation'))
    if (videoModels.length > 0) {
      scenarios.push(
        "Create engaging video content - I can generate short videos from text descriptions",
        "Animate your ideas - Transform static concepts into dynamic video content",
        "Produce marketing videos - Create compelling visual stories for your brand"
      )
    }

    // Text generation scenarios (always available)
    scenarios.push(
      "Write compelling content - From articles to creative stories, I can help with any writing task",
      "Brainstorm and ideate - Let's explore creative solutions to your challenges",
      "Analyze and summarize - I can help you understand complex information"
    )

    return scenarios
  }

  /**
   * Explain what a capability can do in user-friendly terms
   */
  private translateCapabilityToUserLanguage(capability: Capability): UserFriendlyCapability {
    const translations = {
      'dalle-3': {
        whatItDoes: "Creates high-quality, realistic images from your text descriptions",
        whenToUse: "When you need professional-looking images, artwork, or visual content",
        exampleUseCase: "Generate a product mockup, create artwork for a presentation, or visualize a concept",
        difficulty: 'easy' as const
      },
      'midjourney-v6': {
        whatItDoes: "Generates artistic, stylized images with creative interpretation",
        whenToUse: "When you want unique, artistic visuals with creative flair",
        exampleUseCase: "Create artistic illustrations, concept art, or stylized marketing visuals",
        difficulty: 'easy' as const
      },
      'runway-gen3': {
        whatItDoes: "Creates realistic video clips from text descriptions",
        whenToUse: "When you need short video content or want to animate concepts",
        exampleUseCase: "Generate product demos, create social media content, or visualize motion",
        difficulty: 'medium' as const
      },
      'pika-labs-v1': {
        whatItDoes: "Generates artistic, creative video animations",
        whenToUse: "When you want stylized or artistic video content",
        exampleUseCase: "Create animated logos, artistic video backgrounds, or creative transitions",
        difficulty: 'medium' as const
      }
    }

    const translation = translations[capability.id as keyof typeof translations] || {
      whatItDoes: capability.description,
      whenToUse: "When you need this type of content generation",
      exampleUseCase: "Various creative and professional use cases",
      difficulty: 'medium' as const
    }

    return {
      name: capability.name,
      description: capability.description,
      whatItDoes: translation.whatItDoes,
      whenToUse: translation.whenToUse,
      exampleUseCase: translation.exampleUseCase,
      difficulty: translation.difficulty,
      cost: {
        range: this.formatCostRange(capability.metadata.costPerUse || 0),
        description: this.generateCostDescription(capability)
      }
    }
  }

  private calculateRelevance(userInput: string, capability: Capability): number {
    const input = userInput.toLowerCase()
    let score = 0

    // Check for direct capability mentions
    for (const cap of capability.capabilities) {
      const capWords = cap.split('_')
      for (const word of capWords) {
        if (input.includes(word)) {
          score += 0.3
        }
      }
    }

    // Check for related keywords
    const keywords = {
      image: ['image', 'picture', 'photo', 'visual', 'artwork', 'illustration', 'design'],
      video: ['video', 'animation', 'motion', 'movie', 'clip', 'animate'],
      text: ['write', 'text', 'content', 'article', 'story', 'copy']
    }

    if (capability.capabilities.includes('image_generation')) {
      for (const keyword of keywords.image) {
        if (input.includes(keyword)) score += 0.2
      }
    }

    if (capability.capabilities.includes('video_generation')) {
      for (const keyword of keywords.video) {
        if (input.includes(keyword)) score += 0.2
      }
    }

    return Math.min(score, 1.0) // Cap at 1.0
  }

  private generateSuggestedPrompt(userInput: string, capability: Capability): string {
    if (capability.capabilities.includes('image_generation')) {
      return `Create an image: ${userInput}`
    }
    
    if (capability.capabilities.includes('video_generation')) {
      return `Generate a video showing: ${userInput}`
    }
    
    return userInput
  }

  private generateBenefits(capability: Capability, userInput: string): string[] {
    const benefits = []
    
    if (capability.capabilities.includes('image_generation')) {
      benefits.push(
        "Professional-quality visuals without design skills",
        "Unlimited creative possibilities",
        "Fast turnaround compared to traditional design"
      )
    }
    
    if (capability.capabilities.includes('video_generation')) {
      benefits.push(
        "Engaging video content without filming",
        "Perfect for social media and marketing",
        "Bring static ideas to life with motion"
      )
    }
    
    return benefits
  }

  private formatCostRange(cost: number): string {
    if (cost === 0) return "Free"
    if (cost < 0.05) return "Very Low ($0.01-$0.05)"
    if (cost < 0.20) return "Low ($0.05-$0.20)"
    if (cost < 0.50) return "Medium ($0.20-$0.50)"
    return "High ($0.50+)"
  }

  private generateCostDescription(capability: Capability): string {
    const cost = capability.metadata.costPerUse || 0
    
    if (cost === 0) {
      return "No additional cost"
    }
    
    if (capability.capabilities.includes('image_generation')) {
      return `Approximately $${cost.toFixed(2)} per image generated`
    }
    
    if (capability.capabilities.includes('video_generation')) {
      return `Approximately $${cost.toFixed(2)} per video (5-10 seconds)`
    }
    
    return `Approximately $${cost.toFixed(2)} per use`
  }
}

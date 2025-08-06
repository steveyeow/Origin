/**
 * ITERATION LAYER
 * 
 * PURPOSE: Handle feedback and continuous improvement of generated content
 * RESPONSIBILITY: Process feedback, refine content, and learn from user interactions
 * 
 * KEY FUNCTIONS:
 * - processFeedback(): Analyze user feedback and extract actionable insights
 * - refineContent(): Improve content based on feedback
 * - learnFromInteraction(): Update user preferences and model behavior
 * - trackQualityMetrics(): Monitor content quality over time
 * 
 * USAGE: Called by the Engine to handle user feedback and improve future outputs
 * DEPENDENCIES: Output Layer, Invocation Layer
 */

import type {
  UserFeedback,
  GeneratedContent,
  LearningPoint,
  ContentQuality,
  UserContext,
  Capability
} from '../../../types/engine'
import { openAIService } from '../../../services/ai/openai-service'
import { EventEmitter } from 'events'

export class IterationLayer {
  private feedbackHistory: Map<string, UserFeedback[]> = new Map()
  private learningPoints: Map<string, LearningPoint[]> = new Map()
  private qualityMetrics: Map<string, ContentQuality[]> = new Map()
  private eventEmitter: EventEmitter = new EventEmitter()
  private static instance: IterationLayer

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): IterationLayer {
    if (!IterationLayer.instance) {
      IterationLayer.instance = new IterationLayer()
    }
    return IterationLayer.instance
  }

  /**
   * Process user feedback on generated content
   */
  async processFeedback(
    contentId: string,
    feedback: UserFeedback,
    userContext: UserContext
  ): Promise<void> {
    console.log(`📝 Processing feedback for content: ${contentId}`)
    
    // Store feedback
    if (!this.feedbackHistory.has(contentId)) {
      this.feedbackHistory.set(contentId, [])
    }
    this.feedbackHistory.get(contentId)?.push(feedback)
    
    // Extract learning points
    const learningPoints = await this.extractLearningPoints(feedback, userContext)
    
    if (!this.learningPoints.has(userContext.userId)) {
      this.learningPoints.set(userContext.userId, [])
    }
    this.learningPoints.get(userContext.userId)?.push(...learningPoints)
    
    // Update quality metrics
    this.updateQualityMetrics(contentId, feedback)
    
    // Emit feedback processed event
    this.eventEmitter.emit('feedbackProcessed', {
      contentId,
      feedback,
      learningPoints
    })
  }

  /**
   * Refine content based on feedback
   */
  async refineContent(
    content: GeneratedContent,
    feedback: UserFeedback,
    availableCapabilities: Capability[]
  ): Promise<GeneratedContent> {
    console.log(`🔄 Refining content based on feedback: ${content.id}`)
    
    // Only refine text content for now
    if (!content.textContent) {
      console.log('Cannot refine content: No text content available')
      return content
    }
    
    try {
      // Create refinement prompt
      const refinementPrompt = `
        I need to improve the following content based on specific feedback.
        
        ORIGINAL CONTENT:
        ${content.textContent.substring(0, 2000)}
        
        USER FEEDBACK:
        ${feedback.comment || 'No specific comment provided'}
        Rating: ${feedback.rating}/5
        Specific aspects:
        - Relevance: ${feedback.aspects?.relevance || 'Not rated'}
        - Clarity: ${feedback.aspects?.clarity || 'Not rated'}
        - Creativity: ${feedback.aspects?.creativity || 'Not rated'}
        - Accuracy: ${feedback.aspects?.accuracy || 'Not rated'}
        
        Please provide an improved version that addresses the feedback while maintaining the original purpose.
        Focus specifically on improving the aspects that received lower ratings.
        
        IMPROVED CONTENT:
      `
      
      // Generate refined content
      const response = await openAIService.generateText(refinementPrompt, {
        temperature: 0.7,
        max_tokens: 2000
      })
      
      // Create refined content object
      const refinedContent: GeneratedContent = {
        ...content,
        id: `refined_${content.id}`,
        textContent: response.text.trim(),
        metadata: {
          ...content.metadata,
          refinedAt: new Date(),
          originalContentId: content.id,
          refinementFeedback: feedback
        }
      }
      
      return refinedContent
    } catch (error) {
      console.error('Failed to refine content:', error)
      return content
    }
  }

  /**
   * Learn from user interaction to improve future outputs
   */
  async learnFromInteraction(
    userContext: UserContext,
    interaction: { input: string; output: GeneratedContent; feedback?: UserFeedback }
  ): Promise<LearningPoint[]> {
    console.log(`🧠 Learning from interaction for user: ${userContext.userId}`)
    
    const learningPoints: LearningPoint[] = []
    
    // Extract learning points from interaction
    if (interaction.feedback) {
      // If we have explicit feedback, use it
      const feedbackLearningPoints = await this.extractLearningPoints(
        interaction.feedback,
        userContext
      )
      learningPoints.push(...feedbackLearningPoints)
    } else {
      // Otherwise, try to infer preferences from the interaction
      const inferredPoints = await this.inferPreferences(
        userContext,
        interaction.input,
        interaction.output
      )
      learningPoints.push(...inferredPoints)
    }
    
    // Store learning points
    if (!this.learningPoints.has(userContext.userId)) {
      this.learningPoints.set(userContext.userId, [])
    }
    this.learningPoints.get(userContext.userId)?.push(...learningPoints)
    
    // Emit learning event
    this.eventEmitter.emit('learningPointsAdded', {
      userId: userContext.userId,
      learningPoints
    })
    
    return learningPoints
  }

  /**
   * Get quality metrics for a user or content
   */
  getQualityMetrics(id: string): ContentQuality[] {
    return this.qualityMetrics.get(id) || []
  }

  /**
   * Get learning points for a user
   */
  getLearningPoints(userId: string): LearningPoint[] {
    return this.learningPoints.get(userId) || []
  }

  /**
   * Subscribe to iteration events
   */
  onFeedbackProcessed(callback: (data: any) => void): void {
    this.eventEmitter.on('feedbackProcessed', callback)
  }

  /**
   * Subscribe to learning events
   */
  onLearningPointsAdded(callback: (data: any) => void): void {
    this.eventEmitter.on('learningPointsAdded', callback)
  }

  // ===== PRIVATE METHODS =====

  /**
   * Extract learning points from feedback
   */
  private async extractLearningPoints(
    feedback: UserFeedback,
    userContext: UserContext
  ): Promise<LearningPoint[]> {
    const learningPoints: LearningPoint[] = []
    
    // Extract from rating
    if (feedback.rating !== undefined) {
      if (feedback.rating <= 2) {
        // Low rating - high impact learning point
        learningPoints.push({
          category: 'user_preference',
          insight: `User ${userContext.name || userContext.userId} gave low rating (${feedback.rating}/5)${
            feedback.comment ? `: "${feedback.comment}"` : ''
          }`,
          impact: 'high',
          actionable: true
        })
      } else if (feedback.rating >= 4) {
        // High rating - positive reinforcement
        learningPoints.push({
          category: 'user_preference',
          insight: `User ${userContext.name || userContext.userId} gave high rating (${feedback.rating}/5)${
            feedback.comment ? `: "${feedback.comment}"` : ''
          }`,
          impact: 'medium',
          actionable: true
        })
      }
    }
    
    // Extract from aspect ratings
    if (feedback.aspects) {
      for (const [aspect, rating] of Object.entries(feedback.aspects)) {
        if (rating <= 2) {
          learningPoints.push({
            category: 'capability_performance',
            insight: `Low rating (${rating}/5) for ${aspect}`,
            impact: 'medium',
            actionable: true
          })
        } else if (rating >= 4) {
          learningPoints.push({
            category: 'capability_performance',
            insight: `High rating (${rating}/5) for ${aspect}`,
            impact: 'low',
            actionable: true
          })
        }
      }
    }
    
    // Extract from comment using AI
    if (feedback.comment && feedback.comment.length > 5) {
      try {
        const prompt = `
          Analyze the following user feedback and extract 1-2 specific learning points:
          
          USER FEEDBACK: "${feedback.comment}"
          
          For each learning point:
          1. Categorize as: user_preference, capability_performance, or process_optimization
          2. Provide a clear, actionable insight
          3. Rate impact as: low, medium, or high
          4. Is it actionable? (true/false)
          
          Format as JSON array with objects containing: category, insight, impact, actionable
        `
        
        const response = await openAIService.generateText(prompt, {
          temperature: 0.3,
          max_tokens: 300
        })
        
        try {
          const aiLearningPoints = JSON.parse(response.text)
          learningPoints.push(...aiLearningPoints)
        } catch (error) {
          console.error('Failed to parse AI learning points:', error)
        }
      } catch (error) {
        console.error('Failed to extract learning points from comment:', error)
      }
    }
    
    return learningPoints
  }

  /**
   * Infer user preferences from interaction
   */
  private async inferPreferences(
    userContext: UserContext,
    input: string,
    output: GeneratedContent
  ): Promise<LearningPoint[]> {
    // For MVP, use simple heuristics
    const learningPoints: LearningPoint[] = []
    
    // Infer content type preference
    if (output.primaryContent) {
      const contentType = output.primaryContent.type
      
      learningPoints.push({
        category: 'user_preference',
        insight: `User interacted with ${contentType} content`,
        impact: 'low',
        actionable: true
      })
    }
    
    // Infer complexity preference from text length
    if (output.textContent) {
      const wordCount = output.textContent.split(/\s+/).length
      
      if (wordCount > 500) {
        learningPoints.push({
          category: 'user_preference',
          insight: 'User engaged with detailed, longer content',
          impact: 'low',
          actionable: true
        })
      } else if (wordCount < 100) {
        learningPoints.push({
          category: 'user_preference',
          insight: 'User engaged with concise, shorter content',
          impact: 'low',
          actionable: true
        })
      }
    }
    
    return learningPoints
  }

  /**
   * Update quality metrics based on feedback
   */
  private updateQualityMetrics(contentId: string, feedback: UserFeedback): void {
    // Create quality metrics object from feedback
    const quality: ContentQuality = {
      overall: feedback.rating ? feedback.rating / 5 : 0.5,
      creativity: feedback.aspects?.creativity ? feedback.aspects.creativity / 5 : 0.5,
      relevance: feedback.aspects?.relevance ? feedback.aspects.relevance / 5 : 0.5,
      technical: feedback.aspects?.accuracy ? feedback.aspects.accuracy / 5 : 0.5,
      userSatisfaction: feedback.rating ? feedback.rating / 5 : undefined
    }
    
    // Store for content
    if (!this.qualityMetrics.has(contentId)) {
      this.qualityMetrics.set(contentId, [])
    }
    this.qualityMetrics.get(contentId)?.push(quality)
    
    // Store for user
    if (feedback.userId) {
      if (!this.qualityMetrics.has(feedback.userId)) {
        this.qualityMetrics.set(feedback.userId, [])
      }
      this.qualityMetrics.get(feedback.userId)?.push(quality)
    }
  }
}

// Export singleton instance
export const iterationLayer = IterationLayer.getInstance()

/**
 * OUTPUT LAYER
 * 
 * PURPOSE: Format and present execution results to the user
 * RESPONSIBILITY: Content formatting, preview generation, and export functionality
 * 
 * KEY FUNCTIONS:
 * - formatResults(): Transforms raw task results into coherent content
 * - generatePreview(): Creates preview data for UI display
 * - suggestImprovements(): Analyzes content and suggests enhancements
 * - exportContent(): Prepares content for export in various formats
 * 
 * USAGE: Called by the Engine after execution to prepare results for presentation
 * DEPENDENCIES: Execution Layer
 */

import type {
  IOutputLayer,
  TaskResult,
  GeneratedContent,
  PreviewData,
  EditingSuggestion,
  ContentQuality
} from '../../../types/engine'
import { openAIService } from '../../../services/ai/openai-service'

export class OutputLayer implements IOutputLayer {
  private static instance: OutputLayer

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): OutputLayer {
    if (!OutputLayer.instance) {
      OutputLayer.instance = new OutputLayer()
    }
    return OutputLayer.instance
  }

  /**
   * Format raw task results into coherent content
   */
  async formatResults(results: TaskResult[]): Promise<GeneratedContent> {
    console.log(`🎨 Formatting ${results.length} task results`)
    
    // Group results by content type
    const textResults = results.filter(r => r.contentType === 'text')
    const imageResults = results.filter(r => r.contentType === 'image')
    const videoResults = results.filter(r => r.contentType === 'video')
    const audioResults = results.filter(r => r.contentType === 'audio')
    
    // Create content object
    const content: GeneratedContent = {
      id: `content_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      primaryContent: this.determinePrimaryContent(results),
      textContent: this.combineTextResults(textResults),
      mediaContent: [
        ...this.formatImageResults(imageResults),
        ...this.formatVideoResults(videoResults),
        ...this.formatAudioResults(audioResults)
      ],
      metadata: {
        generatedAt: new Date(),
        sources: results.map(r => ({
          taskId: r.taskId,
          capability: r.metadata.capability
        })),
        totalCost: results.reduce((sum, r) => sum + (r.metadata.cost || 0), 0),
        totalExecutionTime: results.reduce((sum, r) => sum + (r.metadata.executionTime || 0), 0)
      },
      quality: await this.assessContentQuality(results)
    }
    
    return content
  }

  /**
   * Generate preview data for UI display
   */
  async generatePreview(content: GeneratedContent): Promise<PreviewData> {
    console.log(`🔍 Generating preview for content: ${content.id}`)
    
    // Create preview data
    const preview: PreviewData = {
      title: this.generateTitle(content),
      summary: await this.generateSummary(content),
      thumbnailUrl: this.selectThumbnail(content),
      previewText: this.truncateText(content.textContent || '', 150),
      mediaCount: content.mediaContent.length,
      estimatedReadingTime: this.calculateReadingTime(content.textContent || ''),
      primaryContentType: content.primaryContent?.type || 'text'
    }
    
    return preview
  }

  /**
   * Suggest improvements for the generated content
   */
  async suggestImprovements(content: GeneratedContent): Promise<EditingSuggestion[]> {
    console.log(`💡 Suggesting improvements for content: ${content.id}`)
    
    const suggestions: EditingSuggestion[] = []
    
    // Only suggest improvements for text content
    if (content.textContent) {
      // Use AI to suggest improvements
      try {
        const prompt = `
          Analyze the following content and suggest up to 3 specific improvements:
          
          ${content.textContent.substring(0, 2000)}
          
          For each suggestion:
          1. Provide a clear title for the improvement
          2. Explain why this would enhance the content
          3. Give a specific example of how to implement it
          
          Format as JSON array with objects containing: title, reason, example
        `
        
        const response = await openAIService.generateText(prompt, {
          temperature: 0.7,
          max_tokens: 500
        })
        
        try {
          const parsedSuggestions = JSON.parse(response.text)
          
          // Format suggestions
          for (const suggestion of parsedSuggestions) {
            suggestions.push({
              title: suggestion.title,
              description: suggestion.reason,
              example: suggestion.example,
              type: this.determineSuggestionType(suggestion.title),
              impact: 'medium',
              implementationDifficulty: 'easy'
            })
          }
        } catch (error) {
          console.error('Failed to parse AI suggestions:', error)
          // Add fallback suggestion
          suggestions.push(this.createFallbackSuggestion())
        }
      } catch (error) {
        console.error('Failed to generate AI suggestions:', error)
        // Add fallback suggestion
        suggestions.push(this.createFallbackSuggestion())
      }
    }
    
    // Add generic media suggestions if applicable
    if (content.mediaContent.length > 0) {
      suggestions.push({
        title: 'Optimize media placement',
        description: 'Consider strategic placement of media elements to enhance the narrative flow',
        type: 'structure',
        impact: 'medium',
        implementationDifficulty: 'medium'
      })
    }
    
    return suggestions
  }

  /**
   * Export content in various formats
   */
  async exportContent(content: GeneratedContent, format: string): Promise<any> {
    console.log(`📤 Exporting content in format: ${format}`)
    
    switch (format) {
      case 'json':
        return this.exportAsJson(content)
      
      case 'markdown':
        return this.exportAsMarkdown(content)
      
      case 'html':
        return this.exportAsHtml(content)
      
      case 'text':
        return this.exportAsText(content)
      
      default:
        throw new Error(`Unsupported export format: ${format}`)
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Determine the primary content from results
   */
  private determinePrimaryContent(results: TaskResult[]): { type: string; content: any } | null {
    // Prioritize image and video content
    const imageResult = results.find(r => r.contentType === 'image')
    if (imageResult) {
      return { type: 'image', content: imageResult.content }
    }
    
    const videoResult = results.find(r => r.contentType === 'video')
    if (videoResult) {
      return { type: 'video', content: videoResult.content }
    }
    
    // Fall back to text content
    const textResult = results.find(r => r.contentType === 'text')
    if (textResult) {
      return { type: 'text', content: textResult.content }
    }
    
    return null
  }

  /**
   * Combine multiple text results into a single coherent text
   */
  private combineTextResults(textResults: TaskResult[]): string {
    if (textResults.length === 0) {
      return ''
    }
    
    if (textResults.length === 1) {
      return textResults[0].content
    }
    
    // Combine multiple text results
    return textResults
      .sort((a, b) => a.metadata.executionTime - b.metadata.executionTime)
      .map(r => r.content)
      .join('\n\n')
  }

  /**
   * Format image results
   */
  private formatImageResults(imageResults: TaskResult[]): Array<{ type: string; url: string; alt: string; metadata: any }> {
    return imageResults.map(result => ({
      type: 'image',
      url: result.content.url || result.content,
      alt: result.content.alt || 'Generated image',
      metadata: {
        ...result.metadata,
        width: result.content.width || 512,
        height: result.content.height || 512
      }
    }))
  }

  /**
   * Format video results
   */
  private formatVideoResults(videoResults: TaskResult[]): Array<{ type: string; url: string; caption: string; metadata: any }> {
    return videoResults.map(result => ({
      type: 'video',
      url: result.content.url || result.content,
      caption: result.content.caption || 'Generated video',
      metadata: {
        ...result.metadata,
        duration: result.content.duration || 0,
        format: result.content.format || 'mp4'
      }
    }))
  }

  /**
   * Format audio results
   */
  private formatAudioResults(audioResults: TaskResult[]): Array<{ type: string; url: string; caption: string; metadata: any }> {
    return audioResults.map(result => ({
      type: 'audio',
      url: result.content.url || result.content,
      caption: result.content.caption || 'Generated audio',
      metadata: {
        ...result.metadata,
        duration: result.content.duration || 0,
        format: result.content.format || 'mp3'
      }
    }))
  }

  /**
   * Generate a title for the content
   */
  private generateTitle(content: GeneratedContent): string {
    // Extract title from text content if possible
    if (content.textContent) {
      const lines = content.textContent.split('\n')
      const firstLine = lines[0].trim()
      
      // Check if first line looks like a title
      if (firstLine.length < 100 && !firstLine.endsWith('.')) {
        return firstLine
      }
    }
    
    // Fallback to generic title
    return `Generated Content (${new Date().toLocaleString()})`
  }

  /**
   * Generate a summary of the content
   */
  private async generateSummary(content: GeneratedContent): Promise<string> {
    // For text content, use AI to generate summary
    if (content.textContent && content.textContent.length > 200) {
      try {
        const prompt = `
          Summarize the following content in 1-2 sentences:
          
          ${content.textContent.substring(0, 1500)}
        `
        
        const response = await openAIService.generateText(prompt, {
          temperature: 0.3,
          max_tokens: 100
        })
        
        return response.text.trim()
      } catch (error) {
        console.error('Failed to generate summary:', error)
      }
    }
    
    // Fallback for non-text content or if AI summary fails
    if (content.primaryContent) {
      switch (content.primaryContent.type) {
        case 'image':
          return 'Generated image content'
        case 'video':
          return 'Generated video content'
        case 'audio':
          return 'Generated audio content'
      }
    }
    
    // Generic fallback
    return 'Generated content'
  }

  /**
   * Select a thumbnail for the content
   */
  private selectThumbnail(content: GeneratedContent): string | null {
    // Use first image as thumbnail if available
    const firstImage = content.mediaContent.find(m => m.type === 'image')
    if (firstImage) {
      return firstImage.url
    }
    
    // Use video thumbnail if available
    const firstVideo = content.mediaContent.find(m => m.type === 'video')
    if (firstVideo && firstVideo.metadata.thumbnailUrl) {
      return firstVideo.metadata.thumbnailUrl
    }
    
    return null
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text
    }
    
    return text.substring(0, maxLength - 3) + '...'
  }

  /**
   * Calculate estimated reading time for text
   */
  private calculateReadingTime(text: string): number {
    // Average reading speed: 200 words per minute
    const wordCount = text.split(/\s+/).length
    const readingTimeMinutes = Math.ceil(wordCount / 200)
    return Math.max(1, readingTimeMinutes)
  }

  /**
   * Assess content quality
   */
  private async assessContentQuality(results: TaskResult[]): Promise<ContentQuality> {
    // For MVP, use simple heuristics
    // TODO: Implement more sophisticated quality assessment
    
    const quality: ContentQuality = {
      overall: 0.8, // Default good quality
      creativity: 0.7,
      relevance: 0.8,
      technical: 0.9
    }
    
    // Adjust based on execution time (faster = better technical score)
    const avgExecutionTime = results.reduce((sum, r) => sum + (r.metadata.executionTime || 0), 0) / results.length
    if (avgExecutionTime < 2000) { // Less than 2 seconds
      quality.technical = 0.95
    } else if (avgExecutionTime > 5000) { // More than 5 seconds
      quality.technical = 0.7
    }
    
    // Calculate overall score as weighted average
    quality.overall = (
      quality.creativity * 0.3 +
      quality.relevance * 0.4 +
      quality.technical * 0.3
    )
    
    return quality
  }

  /**
   * Determine suggestion type based on title
   */
  private determineSuggestionType(title: string): 'clarity' | 'structure' | 'style' | 'technical' {
    const lowerTitle = title.toLowerCase()
    
    if (lowerTitle.includes('structure') || lowerTitle.includes('organization') || lowerTitle.includes('flow')) {
      return 'structure'
    } else if (lowerTitle.includes('style') || lowerTitle.includes('tone') || lowerTitle.includes('voice')) {
      return 'style'
    } else if (lowerTitle.includes('technical') || lowerTitle.includes('accuracy')) {
      return 'technical'
    } else {
      return 'clarity'
    }
  }

  /**
   * Create fallback suggestion when AI fails
   */
  private createFallbackSuggestion(): EditingSuggestion {
    return {
      title: 'Review for clarity and conciseness',
      description: 'Consider reviewing the content to ensure it communicates the main points clearly and concisely',
      type: 'clarity',
      impact: 'medium',
      implementationDifficulty: 'easy'
    }
  }

  /**
   * Export content as JSON
   */
  private exportAsJson(content: GeneratedContent): string {
    return JSON.stringify(content, null, 2)
  }

  /**
   * Export content as Markdown
   */
  private exportAsMarkdown(content: GeneratedContent): string {
    let markdown = ''
    
    // Add title
    markdown += `# ${this.generateTitle(content)}\n\n`
    
    // Add text content
    if (content.textContent) {
      markdown += `${content.textContent}\n\n`
    }
    
    // Add media content
    if (content.mediaContent.length > 0) {
      markdown += '## Media\n\n'
      
      for (const media of content.mediaContent) {
        if (media.type === 'image') {
          markdown += `![${media.alt || 'Image'}](${media.url})\n\n`
        } else if (media.type === 'video' || media.type === 'audio') {
          markdown += `[${media.caption || media.type}](${media.url})\n\n`
        }
      }
    }
    
    // Add metadata
    markdown += '---\n'
    markdown += `Generated: ${content.metadata.generatedAt.toISOString()}\n`
    
    return markdown
  }

  /**
   * Export content as HTML
   */
  private exportAsHtml(content: GeneratedContent): string {
    let html = '<!DOCTYPE html>\n<html>\n<head>\n'
    html += `  <title>${this.generateTitle(content)}</title>\n`
    html += '  <meta charset="UTF-8">\n'
    html += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n'
    html += '  <style>\n'
    html += '    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }\n'
    html += '    img { max-width: 100%; height: auto; }\n'
    html += '    .media-container { margin: 20px 0; }\n'
    html += '    footer { margin-top: 30px; font-size: 0.8em; color: #666; border-top: 1px solid #eee; padding-top: 10px; }\n'
    html += '  </style>\n'
    html += '</head>\n<body>\n'
    
    // Add title
    html += `  <h1>${this.generateTitle(content)}</h1>\n`
    
    // Add text content
    if (content.textContent) {
      html += `  <div class="content">\n    ${content.textContent.replace(/\n/g, '<br>\n    ')}\n  </div>\n`
    }
    
    // Add media content
    if (content.mediaContent.length > 0) {
      html += '  <div class="media-section">\n'
      html += '    <h2>Media</h2>\n'
      
      for (const media of content.mediaContent) {
        html += '    <div class="media-container">\n'
        
        if (media.type === 'image') {
          html += `      <img src="${media.url}" alt="${media.alt || 'Generated image'}">\n`
          if (media.alt) {
            html += `      <p>${media.alt}</p>\n`
          }
        } else if (media.type === 'video') {
          html += `      <video controls width="100%">\n        <source src="${media.url}" type="video/${media.metadata.format || 'mp4'}">\n        Your browser does not support the video tag.\n      </video>\n`
          if (media.caption) {
            html += `      <p>${media.caption}</p>\n`
          }
        } else if (media.type === 'audio') {
          html += `      <audio controls>\n        <source src="${media.url}" type="audio/${media.metadata.format || 'mp3'}">\n        Your browser does not support the audio tag.\n      </audio>\n`
          if (media.caption) {
            html += `      <p>${media.caption}</p>\n`
          }
        }
        
        html += '    </div>\n'
      }
      
      html += '  </div>\n'
    }
    
    // Add footer with metadata
    html += '  <footer>\n'
    html += `    <p>Generated: ${content.metadata.generatedAt.toLocaleString()}</p>\n`
    html += '  </footer>\n'
    
    html += '</body>\n</html>'
    
    return html
  }

  /**
   * Export content as plain text
   */
  private exportAsText(content: GeneratedContent): string {
    let text = ''
    
    // Add title
    text += `${this.generateTitle(content)}\n\n`
    
    // Add text content
    if (content.textContent) {
      text += `${content.textContent}\n\n`
    }
    
    // Add media content references
    if (content.mediaContent.length > 0) {
      text += 'Media:\n\n'
      
      for (const media of content.mediaContent) {
        text += `- ${media.type}: ${media.url}\n`
        if (media.type === 'image' && media.alt) {
          text += `  Description: ${media.alt}\n`
        } else if ((media.type === 'video' || media.type === 'audio') && media.caption) {
          text += `  Caption: ${media.caption}\n`
        }
        text += '\n'
      }
    }
    
    // Add metadata
    text += '---\n'
    text += `Generated: ${content.metadata.generatedAt.toISOString()}\n`
    
    return text
  }
}

// Export singleton instance
export const outputLayer = OutputLayer.getInstance()

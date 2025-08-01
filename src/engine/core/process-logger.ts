import type {
  ProcessStep,
  ProcessTrace,
  Decision,
  LearningPoint
} from '../../types/engine'

/**
 * Process Logger
 * Tracks and stores all processing steps for transparency and debugging
 */
export class ProcessLogger {
  private steps: Map<string, ProcessStep[]> = new Map()
  private traces: Map<string, ProcessTrace> = new Map()

  /**
   * Log a processing step
   */
  async logStep(step: ProcessStep): Promise<void> {
    const sessionId = this.extractSessionId(step)
    
    if (!this.steps.has(sessionId)) {
      this.steps.set(sessionId, [])
    }
    
    this.steps.get(sessionId)!.push(step)
    
    // Update trace if it exists
    if (this.traces.has(sessionId)) {
      const trace = this.traces.get(sessionId)!
      trace.steps.push(step)
      trace.totalDuration = this.calculateTotalDuration(trace.steps)
    }
  }

  /**
   * Log a decision point
   */
  async logDecision(sessionId: string, decision: Decision): Promise<void> {
    if (!this.traces.has(sessionId)) {
      this.initializeTrace(sessionId)
    }
    
    const trace = this.traces.get(sessionId)!
    trace.keyDecisions.push(decision)
  }

  /**
   * Log a learning point
   */
  async logLearning(sessionId: string, learning: LearningPoint): Promise<void> {
    if (!this.traces.has(sessionId)) {
      this.initializeTrace(sessionId)
    }
    
    const trace = this.traces.get(sessionId)!
    trace.learningPoints.push(learning)
  }

  /**
   * Get complete process trace for a session
   */
  async getProcessTrace(sessionId: string): Promise<ProcessTrace> {
    if (!this.traces.has(sessionId)) {
      this.initializeTrace(sessionId)
    }
    
    const trace = this.traces.get(sessionId)!
    
    // Ensure steps are included
    const steps = this.steps.get(sessionId) || []
    trace.steps = steps
    trace.totalDuration = this.calculateTotalDuration(steps)
    
    return { ...trace } // Return a copy
  }

  /**
   * Get steps for a specific layer
   */
  async getLayerSteps(sessionId: string, layer: string): Promise<ProcessStep[]> {
    const steps = this.steps.get(sessionId) || []
    return steps.filter(step => step.layer === layer)
  }

  /**
   * Get recent steps (last N steps)
   */
  async getRecentSteps(sessionId: string, count: number = 10): Promise<ProcessStep[]> {
    const steps = this.steps.get(sessionId) || []
    return steps.slice(-count)
  }

  /**
   * Clear old traces to prevent memory leaks
   */
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now()
    const cutoff = now - maxAge

    for (const [sessionId, trace] of this.traces.entries()) {
      const lastStep = trace.steps[trace.steps.length - 1]
      if (lastStep && lastStep.timestamp.getTime() < cutoff) {
        this.traces.delete(sessionId)
        this.steps.delete(sessionId)
      }
    }
  }

  /**
   * Get processing statistics
   */
  async getStatistics(sessionId: string): Promise<{
    totalSteps: number
    averageStepDuration: number
    layerBreakdown: Record<string, number>
    confidenceDistribution: Record<string, number>
  }> {
    const steps = this.steps.get(sessionId) || []
    
    if (steps.length === 0) {
      return {
        totalSteps: 0,
        averageStepDuration: 0,
        layerBreakdown: {},
        confidenceDistribution: {}
      }
    }

    // Calculate statistics
    const totalDuration = steps.reduce((sum, step) => sum + step.duration, 0)
    const averageStepDuration = totalDuration / steps.length

    // Layer breakdown
    const layerBreakdown: Record<string, number> = {}
    steps.forEach(step => {
      layerBreakdown[step.layer] = (layerBreakdown[step.layer] || 0) + 1
    })

    // Confidence distribution
    const confidenceDistribution: Record<string, number> = {
      'high (0.8-1.0)': 0,
      'medium (0.5-0.8)': 0,
      'low (0.0-0.5)': 0
    }
    
    steps.forEach(step => {
      if (step.confidence >= 0.8) {
        confidenceDistribution['high (0.8-1.0)']++
      } else if (step.confidence >= 0.5) {
        confidenceDistribution['medium (0.5-0.8)']++
      } else {
        confidenceDistribution['low (0.0-0.5)']++
      }
    })

    return {
      totalSteps: steps.length,
      averageStepDuration,
      layerBreakdown,
      confidenceDistribution
    }
  }

  // ===== PRIVATE METHODS =====

  private extractSessionId(step: ProcessStep): string {
    // For now, use a simple approach to extract session ID
    // In the future, this could be more sophisticated
    if (step.input && typeof step.input === 'object' && 'sessionId' in step.input) {
      return step.input.sessionId as string
    }
    
    if (step.input && typeof step.input === 'object' && 'userId' in step.input) {
      return `session_${step.input.userId}`
    }
    
    // Fallback to a default session
    return 'default_session'
  }

  private initializeTrace(sessionId: string): void {
    const trace: ProcessTrace = {
      sessionId,
      intentId: '', // Will be set when intent is processed
      steps: this.steps.get(sessionId) || [],
      totalDuration: 0,
      keyDecisions: [],
      learningPoints: []
    }
    
    this.traces.set(sessionId, trace)
  }

  private calculateTotalDuration(steps: ProcessStep[]): number {
    return steps.reduce((total, step) => total + step.duration, 0)
  }

  /**
   * Format step for display
   * Useful for debugging and user-facing transparency
   */
  formatStepForDisplay(step: ProcessStep): {
    title: string
    description: string
    details: string
    confidence: string
    duration: string
  } {
    const confidenceLevel = step.confidence >= 0.8 ? 'High' : 
                           step.confidence >= 0.5 ? 'Medium' : 'Low'
    
    const durationMs = step.duration
    const durationText = durationMs < 1000 ? 
      `${durationMs}ms` : 
      `${(durationMs / 1000).toFixed(2)}s`

    return {
      title: `${step.layer.toUpperCase()}: ${step.action.replace(/_/g, ' ')}`,
      description: step.reasoning,
      details: JSON.stringify(step.output, null, 2),
      confidence: `${confidenceLevel} (${(step.confidence * 100).toFixed(0)}%)`,
      duration: durationText
    }
  }

  /**
   * Export trace for analysis
   */
  async exportTrace(sessionId: string): Promise<string> {
    const trace = await this.getProcessTrace(sessionId)
    return JSON.stringify(trace, null, 2)
  }
}

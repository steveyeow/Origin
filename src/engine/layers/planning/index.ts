import type {
  IPlanningLayer,
  EnrichedIntent,
  Capability,
  ExecutionPlan,
  Task,
  PlannedTask
} from '../../../types/engine'

/**
 * Planning Layer
 * Creates execution plans by matching user intents with available capabilities
 */
export class PlanningLayer implements IPlanningLayer {

  /**
   * Create execution plan from enriched intent and available capabilities
   */
  async createExecutionPlan(enrichedIntent: EnrichedIntent, availableCapabilities: Capability[]): Promise<ExecutionPlan> {
    // Decompose intent into tasks
    const tasks = await this.decomposeIntentIntoTasks(enrichedIntent)
    
    // Match tasks with capabilities
    const plannedTasks = await this.matchTasksWithCapabilities(tasks, availableCapabilities)
    
    // Calculate estimates
    const totalEstimatedDuration = this.calculateTotalDuration(plannedTasks)
    const totalEstimatedCost = this.calculateTotalCost(plannedTasks)
    const qualityExpectation = this.calculateQualityExpectation(plannedTasks)
    const riskLevel = this.assessRiskLevel(plannedTasks, enrichedIntent)
    
    // Generate fallback options
    const fallbackOptions = await this.generateFallbackOptions(plannedTasks, availableCapabilities)

    const executionPlan: ExecutionPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      intentId: enrichedIntent.id,
      tasks: plannedTasks,
      totalEstimatedDuration,
      totalEstimatedCost,
      qualityExpectation,
      riskLevel,
      fallbackOptions,
      createdAt: new Date()
    }

    return executionPlan
  }

  /**
   * Optimize execution plan for better performance or cost
   */
  async optimizePlan(plan: ExecutionPlan): Promise<ExecutionPlan> {
    // For MVP: Simple optimization strategies
    // TODO: Implement sophisticated optimization algorithms
    
    const optimizedTasks = [...plan.tasks]
    
    // Optimize for parallel execution where possible
    const parallelizableTasks = this.identifyParallelizableTasks(optimizedTasks)
    
    // Reorder tasks for better efficiency
    const reorderedTasks = this.reorderTasksForEfficiency(optimizedTasks)
    
    // Recalculate estimates with optimizations
    const optimizedPlan: ExecutionPlan = {
      ...plan,
      id: `optimized_${plan.id}`,
      tasks: reorderedTasks,
      totalEstimatedDuration: this.calculateTotalDuration(reorderedTasks),
      totalEstimatedCost: this.calculateTotalCost(reorderedTasks),
      qualityExpectation: this.calculateQualityExpectation(reorderedTasks)
    }

    return optimizedPlan
  }

  /**
   * Validate if execution plan is feasible
   */
  async validatePlan(plan: ExecutionPlan): Promise<boolean> {
    // Check if all tasks have assigned capabilities
    const allTasksAssigned = plan.tasks.every(task => task.assignedCapability)
    
    // Check if capabilities are available and healthy
    const capabilitiesHealthy = plan.tasks.every(task => 
      task.assignedCapability.status === 'active'
    )
    
    // Check if dependencies are resolvable
    const dependenciesResolvable = this.validateDependencies(plan.tasks)
    
    // Check if estimated cost is reasonable
    const costReasonable = plan.totalEstimatedCost < 10.0 // Simple threshold
    
    return allTasksAssigned && capabilitiesHealthy && dependenciesResolvable && costReasonable
  }

  /**
   * Estimate total cost of execution plan
   */
  async estimateCost(plan: ExecutionPlan): Promise<number> {
    return this.calculateTotalCost(plan.tasks)
  }

  // ===== PRIVATE METHODS =====

  private async decomposeIntentIntoTasks(intent: EnrichedIntent): Promise<Task[]> {
    const tasks: Task[] = []
    
    // Main content generation task
    const mainTask: Task = {
      id: `task_main_${Date.now()}`,
      type: 'generation',
      description: `Generate ${intent.rawIntent.contentType} content for: ${intent.refinedGoal}`,
      requiredCapabilities: this.getRequiredCapabilitiesForContentType(intent.rawIntent.contentType),
      input: {
        intent: intent,
        prompt: intent.refinedGoal
      },
      expectedOutput: {
        type: intent.rawIntent.contentType,
        quality: 'high'
      },
      priority: 1,
      estimatedDuration: this.estimateTaskDuration(intent),
      dependencies: []
    }
    
    tasks.push(mainTask)
    
    // Add formatting task if needed
    if (intent.stylePreferences.length > 0) {
      const formattingTask: Task = {
        id: `task_format_${Date.now()}`,
        type: 'formatting',
        description: 'Apply style preferences and formatting',
        requiredCapabilities: ['formatting', 'structure_optimization'],
        input: {
          content: 'output_from_main_task',
          stylePreferences: intent.stylePreferences
        },
        expectedOutput: {
          type: intent.rawIntent.contentType,
          formatted: true
        },
        priority: 2,
        estimatedDuration: 1000, // 1 second
        dependencies: [mainTask.id]
      }
      
      tasks.push(formattingTask)
    }
    
    // Add analysis task for complex intents
    if (intent.estimatedComplexity === 'complex') {
      const analysisTask: Task = {
        id: `task_analysis_${Date.now()}`,
        type: 'analysis',
        description: 'Analyze and validate generated content',
        requiredCapabilities: ['analysis', 'quality_assessment'],
        input: {
          content: 'output_from_previous_tasks',
          successCriteria: intent.successCriteria
        },
        expectedOutput: {
          type: 'analysis_report',
          qualityScore: 'number'
        },
        priority: 3,
        estimatedDuration: 2000, // 2 seconds
        dependencies: tasks.map(t => t.id)
      }
      
      tasks.push(analysisTask)
    }

    return tasks
  }

  private async matchTasksWithCapabilities(tasks: Task[], availableCapabilities: Capability[]): Promise<PlannedTask[]> {
    const plannedTasks: PlannedTask[] = []
    const now = new Date()
    let currentTime = now.getTime()

    for (const task of tasks) {
      // Find best matching capability
      const matchingCapability = this.findBestCapabilityForTask(task, availableCapabilities)
      
      if (!matchingCapability) {
        throw new Error(`No suitable capability found for task: ${task.description}`)
      }

      // Calculate scheduling
      const scheduledStart = new Date(currentTime)
      const estimatedCompletion = new Date(currentTime + task.estimatedDuration)
      
      const plannedTask: PlannedTask = {
        ...task,
        assignedCapability: matchingCapability,
        scheduledStart,
        estimatedCompletion,
        status: 'pending'
      }
      
      plannedTasks.push(plannedTask)
      
      // Update current time for next task
      currentTime = estimatedCompletion.getTime()
    }

    return plannedTasks
  }

  private findBestCapabilityForTask(task: Task, availableCapabilities: Capability[]): Capability | null {
    // Filter capabilities that can handle the task
    const suitableCapabilities = availableCapabilities.filter(capability => {
      // Check if capability is active
      if (capability.status !== 'active') return false
      
      // Check if capability has required capabilities
      return task.requiredCapabilities.some(required =>
        capability.capabilities.some(cap =>
          cap.toLowerCase().includes(required.toLowerCase())
        )
      )
    })

    if (suitableCapabilities.length === 0) return null

    // Score capabilities based on quality, cost, and latency
    const scoredCapabilities = suitableCapabilities.map(capability => {
      const qualityScore = capability.metadata.qualityScore || 0.5
      const costScore = 1 - Math.min((capability.metadata.costPerUse || 0.01) / 0.1, 1) // Lower cost = higher score
      const latencyScore = 1 - Math.min((capability.metadata.averageLatency || 1000) / 10000, 1) // Lower latency = higher score
      
      const totalScore = (qualityScore * 0.5) + (costScore * 0.3) + (latencyScore * 0.2)
      
      return { capability, score: totalScore }
    })

    // Return the highest scoring capability
    const best = scoredCapabilities.sort((a, b) => b.score - a.score)[0]
    return best.capability
  }

  private getRequiredCapabilitiesForContentType(contentType: string): string[] {
    const capabilityMap: Record<string, string[]> = {
      text: ['text_generation', 'creative_writing'],
      image: ['image_generation', 'visual_creation'],
      video: ['video_generation', 'animation'],
      audio: ['audio_generation', 'sound_creation'],
      story: ['creative_writing', 'narrative_generation'],
      character: ['character_creation', 'persona_generation']
    }

    return capabilityMap[contentType] || ['text_generation']
  }

  private estimateTaskDuration(intent: EnrichedIntent): number {
    // Base duration estimates in milliseconds
    const baseDurations = {
      simple: 2000,    // 2 seconds
      moderate: 5000,  // 5 seconds
      complex: 10000   // 10 seconds
    }

    const baseDuration = baseDurations[intent.estimatedComplexity]
    
    // Adjust based on content type
    const contentTypeMultipliers = {
      text: 1.0,
      image: 3.0,
      video: 5.0,
      audio: 2.0,
      story: 1.5,
      character: 1.2
    }

    const multiplier = contentTypeMultipliers[intent.rawIntent.contentType as keyof typeof contentTypeMultipliers] || 1.0
    
    return Math.round(baseDuration * multiplier)
  }

  private calculateTotalDuration(tasks: PlannedTask[]): number {
    // For sequential execution, sum all durations
    // TODO: Account for parallel execution opportunities
    return tasks.reduce((total, task) => total + task.estimatedDuration, 0)
  }

  private calculateTotalCost(tasks: PlannedTask[]): number {
    return tasks.reduce((total, task) => {
      const capabilityCost = task.assignedCapability.metadata.costPerUse || 0.01
      return total + capabilityCost
    }, 0)
  }

  private calculateQualityExpectation(tasks: PlannedTask[]): number {
    // Average quality score of assigned capabilities
    const totalQuality = tasks.reduce((sum, task) => {
      return sum + (task.assignedCapability.metadata.qualityScore || 0.5)
    }, 0)
    
    return totalQuality / tasks.length
  }

  private assessRiskLevel(tasks: PlannedTask[], intent: EnrichedIntent): 'low' | 'medium' | 'high' {
    let riskScore = 0
    
    // Risk factors
    if (intent.estimatedComplexity === 'complex') riskScore += 2
    if (tasks.length > 3) riskScore += 1
    if (tasks.some(task => (task.assignedCapability.metadata.qualityScore || 1) < 0.7)) riskScore += 2
    if (intent.rawIntent.urgency === 'high') riskScore += 1
    
    if (riskScore >= 4) return 'high'
    if (riskScore >= 2) return 'medium'
    return 'low'
  }

  private async generateFallbackOptions(tasks: PlannedTask[], availableCapabilities: Capability[]): Promise<any[]> {
    // For MVP: Simple fallback generation
    // TODO: Implement sophisticated fallback planning
    
    const fallbacks = []
    
    // Fallback for capability failure
    fallbacks.push({
      trigger: 'capability_failure',
      alternativeTasks: tasks.map(task => ({
        ...task,
        assignedCapability: this.findAlternativeCapability(task, availableCapabilities)
      })).filter(task => task.assignedCapability),
      estimatedImpact: 'May reduce quality or increase duration'
    })
    
    return fallbacks
  }

  private findAlternativeCapability(task: PlannedTask, availableCapabilities: Capability[]): Capability | null {
    // Find alternative capability (not the currently assigned one)
    const alternatives = availableCapabilities.filter(cap => 
      cap.id !== task.assignedCapability.id &&
      cap.status === 'active' &&
      task.requiredCapabilities.some(required =>
        cap.capabilities.some(capCap =>
          capCap.toLowerCase().includes(required.toLowerCase())
        )
      )
    )

    return alternatives.length > 0 ? alternatives[0] : null
  }

  private identifyParallelizableTasks(tasks: PlannedTask[]): PlannedTask[][] {
    // Group tasks that can run in parallel (no dependencies between them)
    const groups: PlannedTask[][] = []
    const processed = new Set<string>()
    
    for (const task of tasks) {
      if (processed.has(task.id)) continue
      
      const parallelGroup = [task]
      processed.add(task.id)
      
      // Find other tasks that can run in parallel with this one
      for (const otherTask of tasks) {
        if (processed.has(otherTask.id)) continue
        
        const canRunInParallel = !task.dependencies.includes(otherTask.id) && 
                                !otherTask.dependencies.includes(task.id)
        
        if (canRunInParallel) {
          parallelGroup.push(otherTask)
          processed.add(otherTask.id)
        }
      }
      
      groups.push(parallelGroup)
    }
    
    return groups
  }

  private reorderTasksForEfficiency(tasks: PlannedTask[]): PlannedTask[] {
    // Simple reordering: prioritize by priority, then by estimated duration
    return [...tasks].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority
      }
      return a.estimatedDuration - b.estimatedDuration
    })
  }

  private validateDependencies(tasks: PlannedTask[]): boolean {
    const taskIds = new Set(tasks.map(task => task.id))
    
    // Check that all dependencies exist
    return tasks.every(task =>
      task.dependencies.every(depId => taskIds.has(depId))
    )
  }
}

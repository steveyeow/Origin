/**
 * EXECUTION LAYER
 * 
 * PURPOSE: Executes plans created by the Planning Layer by coordinating task execution
 * RESPONSIBILITY: Manages execution flow, monitors progress, and handles failures
 * 
 * KEY FUNCTIONS:
 * - executePlan(): Executes a plan created by the Planning Layer
 * - monitorExecution(): Provides real-time updates on execution progress
 * - pauseExecution()/resumeExecution(): Controls execution flow
 * - cancelExecution(): Safely terminates execution
 * 
 * USAGE: Called by the Engine to execute plans
 * DEPENDENCIES: Invocation Layer, Planning Layer
 */

import type {
  IExecutionLayer,
  ExecutionPlan,
  ExecutionContext,
  TaskResult,
  PlannedTask
} from '../../../types/engine'
import { unifiedInvocation } from '../invocation/unified-invocation'
import { EventEmitter } from 'events'

export class ExecutionLayer implements IExecutionLayer {
  private executionContexts: Map<string, ExecutionContext> = new Map()
  private executionEmitter: EventEmitter = new EventEmitter()
  private static instance: ExecutionLayer

  private constructor() {
    // Private constructor for singleton pattern
  }

  public static getInstance(): ExecutionLayer {
    if (!ExecutionLayer.instance) {
      ExecutionLayer.instance = new ExecutionLayer()
    }
    return ExecutionLayer.instance
  }

  /**
   * Execute a plan created by the Planning Layer
   */
  async executePlan(plan: ExecutionPlan): Promise<ExecutionContext> {
    console.log(`🚀 Executing plan: ${plan.id}`)
    
    // Create execution context
    const executionContext: ExecutionContext = {
      id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      planId: plan.id,
      status: 'running',
      tasks: plan.tasks.map(task => ({
        ...task,
        status: 'pending',
        result: null,
        startTime: null,
        endTime: null,
        error: null
      })),
      startTime: new Date(),
      endTime: null,
      progress: 0,
      results: [],
      errors: []
    }
    
    // Store context
    this.executionContexts.set(executionContext.id, executionContext)
    
    // Start execution in background
    this.executeTasksAsync(executionContext)
    
    return executionContext
  }

  /**
   * Monitor execution progress
   */
  async *monitorExecution(contextId: string): AsyncIterator<ExecutionContext> {
    const context = this.executionContexts.get(contextId)
    if (!context) {
      throw new Error(`Execution context not found: ${contextId}`)
    }
    
    // Yield current state immediately
    yield {...context}
    
    // Set up event listener for updates
    const updateHandler = (updatedContext: ExecutionContext) => {
      if (updatedContext.id === contextId) {
        return {...updatedContext}
      }
      return null
    }
    
    this.executionEmitter.on('update', updateHandler)
    
    try {
      // Keep yielding updates until execution completes
      while (context.status === 'running' || context.status === 'paused') {
        // Wait for next update
        const update = await new Promise<ExecutionContext | null>(resolve => {
          const handler = (updatedContext: ExecutionContext) => {
            if (updatedContext.id === contextId) {
              resolve(updatedContext)
            }
          }
          
          this.executionEmitter.once('update', handler)
          
          // Also check for completion
          if (context.status === 'completed' || context.status === 'failed' || context.status === 'cancelled') {
            this.executionEmitter.off('update', handler)
            resolve(null)
          }
        })
        
        if (update) {
          yield {...update}
        } else {
          break
        }
      }
    } finally {
      // Clean up event listener
      this.executionEmitter.off('update', updateHandler)
    }
  }

  /**
   * Pause execution
   */
  async pauseExecution(contextId: string): Promise<void> {
    const context = this.executionContexts.get(contextId)
    if (!context) {
      throw new Error(`Execution context not found: ${contextId}`)
    }
    
    if (context.status === 'running') {
      context.status = 'paused'
      this.executionContexts.set(contextId, context)
      this.executionEmitter.emit('update', {...context})
    }
  }

  /**
   * Resume execution
   */
  async resumeExecution(contextId: string): Promise<void> {
    const context = this.executionContexts.get(contextId)
    if (!context) {
      throw new Error(`Execution context not found: ${contextId}`)
    }
    
    if (context.status === 'paused') {
      context.status = 'running'
      this.executionContexts.set(contextId, context)
      this.executionEmitter.emit('update', {...context})
      
      // Resume execution of pending tasks
      const pendingTasks = context.tasks.filter(task => task.status === 'pending')
      if (pendingTasks.length > 0) {
        this.executeTasksAsync(context)
      }
    }
  }

  /**
   * Cancel execution
   */
  async cancelExecution(contextId: string): Promise<void> {
    const context = this.executionContexts.get(contextId)
    if (!context) {
      throw new Error(`Execution context not found: ${contextId}`)
    }
    
    context.status = 'cancelled'
    context.endTime = new Date()
    this.executionContexts.set(contextId, context)
    this.executionEmitter.emit('update', {...context})
  }

  // ===== PRIVATE METHODS =====

  /**
   * Execute tasks asynchronously
   */
  private async executeTasksAsync(context: ExecutionContext): Promise<void> {
    try {
      // Get all tasks that need to be executed
      const pendingTasks = context.tasks.filter(task => task.status === 'pending')
      
      // Execute tasks in order (respecting dependencies)
      for (const task of pendingTasks) {
        // Skip if execution is paused or cancelled
        if (context.status !== 'running') {
          break
        }
        
        // Check if dependencies are satisfied
        const dependencies = task.dependencies || []
        const dependenciesMet = dependencies.every(depId => {
          const depTask = context.tasks.find(t => t.id === depId)
          return depTask && depTask.status === 'completed'
        })
        
        if (!dependenciesMet) {
          continue
        }
        
        // Update task status
        task.status = 'running'
        task.startTime = new Date()
        this.updateContext(context)
        
        try {
          // Execute task using Invocation Layer
          const result = await this.executeTask(task)
          
          // Update task with result
          task.status = 'completed'
          task.result = result
          task.endTime = new Date()
          
          // Add to results
          context.results.push(result)
        } catch (error) {
          // Handle task failure
          const err = error as Error
          task.status = 'failed'
          task.error = err.message
          task.endTime = new Date()
          
          // Add to errors
          context.errors.push({
            taskId: task.id,
            message: err.message,
            timestamp: new Date()
          })
          
          // Check if this failure is critical
          if (task.priority === 0) { // Critical task
            context.status = 'failed'
            context.endTime = new Date()
            this.updateContext(context)
            return
          }
        }
        
        // Update progress
        this.updateProgress(context)
      }
      
      // Check if all tasks are completed
      const allTasksCompleted = context.tasks.every(
        task => task.status === 'completed' || task.status === 'failed'
      )
      
      if (allTasksCompleted) {
        context.status = 'completed'
        context.endTime = new Date()
        this.updateContext(context)
      }
    } catch (error) {
      // Handle overall execution failure
      const err = error as Error
      context.status = 'failed'
      context.endTime = new Date()
      context.errors.push({
        taskId: 'execution',
        message: err.message,
        timestamp: new Date()
      })
      this.updateContext(context)
    }
  }

  /**
   * Execute a single task using the Invocation Layer
   */
  private async executeTask(task: PlannedTask & { status: string; result: TaskResult | null }): Promise<TaskResult> {
    if (!task.assignedCapability) {
      throw new Error(`No capability assigned to task: ${task.id}`)
    }
    
    // Invoke capability
    const invocationResult = await unifiedInvocation.invoke(
      task.assignedCapability.id,
      task.input,
      {
        maxCost: task.assignedCapability.metadata.costPerUse,
        qualityLevel: 'balanced'
      }
    )
    
    if (!invocationResult.success) {
      throw new Error(invocationResult.error || 'Unknown error during capability invocation')
    }
    
    // Format result
    const taskResult: TaskResult = {
      taskId: task.id,
      content: invocationResult.result,
      contentType: this.determineContentType(invocationResult.result),
      metadata: {
        capability: task.assignedCapability.id,
        executionTime: invocationResult.metadata.executionTime,
        cost: invocationResult.cost
      },
      timestamp: new Date()
    }
    
    return taskResult
  }

  /**
   * Update execution context and emit update event
   */
  private updateContext(context: ExecutionContext): void {
    this.executionContexts.set(context.id, context)
    this.executionEmitter.emit('update', {...context})
  }

  /**
   * Update progress percentage
   */
  private updateProgress(context: ExecutionContext): void {
    const totalTasks = context.tasks.length
    const completedTasks = context.tasks.filter(
      task => task.status === 'completed' || task.status === 'failed'
    ).length
    
    context.progress = Math.round((completedTasks / totalTasks) * 100)
    this.updateContext(context)
  }

  /**
   * Determine content type from result
   */
  private determineContentType(result: any): string {
    if (typeof result === 'string') {
      return 'text'
    } else if (result.url && typeof result.url === 'string') {
      if (result.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        return 'image'
      } else if (result.url.match(/\.(mp4|webm|mov)$/i)) {
        return 'video'
      } else if (result.url.match(/\.(mp3|wav|ogg)$/i)) {
        return 'audio'
      }
    }
    
    return 'unknown'
  }
}

// Export singleton instance
export const executionLayer = ExecutionLayer.getInstance()

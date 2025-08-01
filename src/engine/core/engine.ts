import type {
  IOriginXEngine,
  IInteractiveScenarioLayer,
  IIntentionReasoningLayer,
  IPlanningLayer,
  IInvocationLayer,
  IExecutionLayer,
  IOutputLayer,
  EngineResponse,
  ProcessTrace,
  Capability,
  UserContext
} from '../../types/engine'

import { InteractiveScenarioLayer } from '../layers/interactive-scenario'
import { ProcessLogger } from './process-logger'
import { EventEmitter } from 'events'

/**
 * Core OriginX Engine
 * Orchestrates all layers and manages the AI-driven conversation flow
 */
export class OriginXEngine extends EventEmitter implements IOriginXEngine {
  private scenarioLayer: IInteractiveScenarioLayer
  private intentionLayer: IIntentionReasoningLayer | null = null
  private planningLayer: IPlanningLayer | null = null
  private invocationLayer: IInvocationLayer | null = null
  private executionLayer: IExecutionLayer | null = null
  private outputLayer: IOutputLayer | null = null
  
  private processLogger: ProcessLogger
  private capabilityCallbacks: {
    added: ((capability: Capability) => void)[]
    removed: ((capabilityId: string) => void)[]
  } = { added: [], removed: [] }

  constructor() {
    super()
    
    // Initialize core components
    this.processLogger = new ProcessLogger()
    this.scenarioLayer = new InteractiveScenarioLayer()
    
    // Set up internal event handling
    this.setupEventHandlers()
  }

  /**
   * Main entry point for processing user input
   * This orchestrates the entire AI-driven conversation flow
   */
  async processUserInput(input: string, userId: string): Promise<EngineResponse> {
    const startTime = Date.now()
    
    try {
      // Get or create user context
      let userContext = this.scenarioLayer.getUserContext(userId)
      if (!userContext) {
        userContext = this.scenarioLayer.createUserContext(userId)
      }

      // Log the start of processing
      await this.processLogger.logStep({
        id: `input_${Date.now()}`,
        layer: 'engine',
        action: 'process_user_input',
        input: { text: input, userId },
        output: null,
        reasoning: 'Starting to process user input through the engine layers',
        duration: 0,
        confidence: 1.0,
        timestamp: new Date()
      })

      // For MVP: Use existing ISL logic for onboarding
      if (userContext.currentStep !== 'completed') {
        const response = await this.scenarioLayer.handleUserResponse(input, userContext)
        
        // Log completion
        await this.processLogger.logStep({
          id: `response_${Date.now()}`,
          layer: 'interactive-scenario',
          action: 'handle_onboarding_response',
          input: { text: input, context: userContext },
          output: response,
          reasoning: 'Processed onboarding response using static scenario logic',
          duration: Date.now() - startTime,
          confidence: 0.9,
          timestamp: new Date()
        })

        return response
      }

      // For post-onboarding: This is where we'll implement the full AI pipeline
      // Phase 1: Intention Reasoning (Future implementation)
      if (this.intentionLayer) {
        // TODO: Implement full AI-driven flow
        // 1. Process user input through IRL
        // 2. Create execution plan through Planning Layer
        // 3. Execute through Invocation and Execution layers
        // 4. Format output through Output layer
      }

      // Fallback to scenario-based response for now
      const scenario = await this.scenarioLayer.proposeScenario(userContext)
      
      return {
        message: `I understand you're interested in: "${input}". Let me help you with that!`,
        scenario,
        nextStep: 'completed'
      }

    } catch (error) {
      console.error('Engine processing error:', error)
      
      await this.processLogger.logStep({
        id: `error_${Date.now()}`,
        layer: 'engine',
        action: 'error_handling',
        input: { text: input, userId },
        output: { error: error instanceof Error ? error.message : 'Unknown error' },
        reasoning: 'Error occurred during processing',
        duration: Date.now() - startTime,
        confidence: 0.0,
        timestamp: new Date()
      })

      return {
        message: "I encountered an issue processing your request. Let's try again!",
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // ===== LAYER ACCESS METHODS =====
  
  getScenarioLayer(): IInteractiveScenarioLayer {
    return this.scenarioLayer
  }

  getIntentionLayer(): IIntentionReasoningLayer {
    if (!this.intentionLayer) {
      throw new Error('Intention Reasoning Layer not initialized')
    }
    return this.intentionLayer
  }

  getPlanningLayer(): IPlanningLayer {
    if (!this.planningLayer) {
      throw new Error('Planning Layer not initialized')
    }
    return this.planningLayer
  }

  getInvocationLayer(): IInvocationLayer {
    if (!this.invocationLayer) {
      throw new Error('Invocation Layer not initialized')
    }
    return this.invocationLayer
  }

  getExecutionLayer(): IExecutionLayer {
    if (!this.executionLayer) {
      throw new Error('Execution Layer not initialized')
    }
    return this.executionLayer
  }

  getOutputLayer(): IOutputLayer {
    if (!this.outputLayer) {
      throw new Error('Output Layer not initialized')
    }
    return this.outputLayer
  }

  // ===== PROCESS TRANSPARENCY =====
  
  async getProcessTrace(sessionId: string): Promise<ProcessTrace> {
    return this.processLogger.getProcessTrace(sessionId)
  }

  // ===== CAPABILITY MANAGEMENT =====
  
  onCapabilityAdded(callback: (capability: Capability) => void): void {
    this.capabilityCallbacks.added.push(callback)
  }

  onCapabilityRemoved(callback: (capabilityId: string) => void): void {
    this.capabilityCallbacks.removed.push(callback)
  }

  // ===== LAYER INITIALIZATION METHODS =====
  
  /**
   * Initialize layers as they become available
   * This allows for gradual implementation of the full pipeline
   */
  initializeIntentionLayer(layer: IIntentionReasoningLayer): void {
    this.intentionLayer = layer
    this.emit('layer_initialized', { layer: 'intention-reasoning' })
  }

  initializePlanningLayer(layer: IPlanningLayer): void {
    this.planningLayer = layer
    this.emit('layer_initialized', { layer: 'planning' })
  }

  initializeInvocationLayer(layer: IInvocationLayer): void {
    this.invocationLayer = layer
    this.emit('layer_initialized', { layer: 'invocation' })
    
    // Set up capability event forwarding
    this.setupCapabilityEventForwarding()
  }

  initializeExecutionLayer(layer: IExecutionLayer): void {
    this.executionLayer = layer
    this.emit('layer_initialized', { layer: 'execution' })
  }

  initializeOutputLayer(layer: IOutputLayer): void {
    this.outputLayer = layer
    this.emit('layer_initialized', { layer: 'output' })
  }

  // ===== PRIVATE METHODS =====
  
  private setupEventHandlers(): void {
    this.on('layer_initialized', (data) => {
      console.log(`Layer initialized: ${data.layer}`)
    })
  }

  private setupCapabilityEventForwarding(): void {
    if (!this.invocationLayer) return

    // Forward capability events to registered callbacks
    // This would be implemented when the invocation layer supports events
    // For now, this is a placeholder for future implementation
  }

  /**
   * Trigger capability added callbacks
   * Called by invocation layer when new capabilities are registered
   */
  private triggerCapabilityAdded(capability: Capability): void {
    this.capabilityCallbacks.added.forEach(callback => {
      try {
        callback(capability)
      } catch (error) {
        console.error('Error in capability added callback:', error)
      }
    })
  }

  /**
   * Trigger capability removed callbacks
   * Called by invocation layer when capabilities are removed
   */
  private triggerCapabilityRemoved(capabilityId: string): void {
    this.capabilityCallbacks.removed.forEach(callback => {
      try {
        callback(capabilityId)
      } catch (error) {
        console.error('Error in capability removed callback:', error)
      }
    })
  }
}

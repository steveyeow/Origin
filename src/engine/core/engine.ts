import type {
  IOriginEngine,
  IInteractiveScenarioLayer,
  IIntentionReasoningLayer,
  IPlanningLayer,
  IInvocationLayer,
  IExecutionLayer,
  IOutputLayer,
  IIterationLayer,
  EngineResponse,
  ProcessTrace,
  Capability,
  UserContext
} from '../../types/engine'

import { InteractiveScenarioLayer } from '../layers/interactive-scenario'
import { unifiedInvocation } from '../layers/invocation/unified-invocation'
import { ProcessLogger } from './process-logger'
import { EventEmitter } from 'events'

/**
 * Core OriginX Engine
 * Orchestrates all layers and manages the AI-driven conversation flow
 */
export class OriginEngine extends EventEmitter implements IOriginEngine {
  private scenarioLayer: IInteractiveScenarioLayer
  private intentionLayer: IIntentionReasoningLayer | null = null
  private planningLayer: IPlanningLayer | null = null
  private invocationLayer: IInvocationLayer | null = null
  private executionLayer: IExecutionLayer | null = null
  private outputLayer: IOutputLayer | null = null
  private iterationLayer: IIterationLayer | null = null
  
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
    
    // Initialize unified invocation layer asynchronously (non-blocking)
    this.initializeUnifiedInvocation().catch(error => {
      console.error('❌ Engine: Failed to initialize UnifiedInvocationLayer:', error)
    })
  }

  private async initializeUnifiedInvocation(): Promise<void> {
    try {
      await unifiedInvocation.initialize()
      console.log('✅ Engine: UnifiedInvocationLayer initialized')
    } catch (error) {
      console.error('❌ Engine: Failed to initialize UnifiedInvocationLayer:', error)
    }
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
      
      // CRITICAL: Better detection of existing users during mode switches
      // Check if user has completed onboarding (has names set)
      const hasCompletedOnboarding = userContext && 
        (userContext.name || userContext.oneName || 
         userContext.currentStep === 'scenario' || 
         userContext.currentStep === 'completed')
      
      const isNewUser = !userContext || !hasCompletedOnboarding
      
      console.log('🔍 Engine: User context analysis:', {
        userId,
        hasContext: !!userContext,
        currentStep: userContext?.currentStep,
        hasUserName: !!userContext?.name,
        hasAIName: !!userContext?.oneName,
        hasCompletedOnboarding,
        isNewUser
      })
      
      if (isNewUser && !userContext) {
        userContext = this.scenarioLayer.createUserContext(userId)
      }
      
      // Handle special __INIT__ input for engine-driven greeting
      if (input === '__INIT__') {
        console.log('🚀 Engine received initialization request - generating dynamic greeting')
        
        // CRITICAL: For mode switches, don't reset context if user has completed onboarding
        if (hasCompletedOnboarding) {
          console.log('🚨 CRITICAL: Existing user detected - preserving current conversation step')
          // Don't change the current step for existing users
        } else {
          console.log('🆕 New user detected - setting up initial onboarding')
        }
        
        // Log initialization
        await this.processLogger.logStep({
          id: `init_${Date.now()}`,
          layer: 'engine',
          action: 'initialize_conversation',
          input: { text: input, userId },
          output: null,
          reasoning: hasCompletedOnboarding ? 'Generating greeting for existing user' : 'Initializing conversation with new user greeting',
          duration: 0,
          confidence: 1.0,
          timestamp: new Date()
        })
        
        // Generate a unique request ID for UI synchronization
        const requestId = `init_${Date.now()}`
        console.log(`🆔 Engine: Generated request ID for initialization: ${requestId}`)
        
        // Instead of returning hardcoded messages, let the ISL generate dynamic greeting
        // Ensure we have a valid user context
        if (!userContext) {
          userContext = this.scenarioLayer.createUserContext(userId)
        }
        
        // CRITICAL: Set up the user context for greeting generation based on actual user state
        if (isNewUser) {
          // For new users, set the step to naming-one and let ISL handle the greeting
          userContext.currentStep = 'naming-one'
          console.log('🔄 Engine: Set new user to naming-one step')
        } else {
          // For returning users, preserve their current step or set to scenario if undefined
          if (!userContext.currentStep || userContext.currentStep === 'landing') {
            userContext.currentStep = 'scenario'
          }
          console.log('🔄 Engine: Preserved existing user step:', userContext.currentStep)
        }
        
        // Use the ISL layer to generate appropriate greeting based on context
        // This will create a dynamic, contextual greeting instead of hardcoded text
        const dynamicResponse = await this.scenarioLayer.handleUserResponse('__GREETING__', userContext)
        
        // Ensure we use our initialization request ID
        return {
          ...dynamicResponse,
          requestId // Override with our initialization request ID
        }
      }

      // Ensure userContext is defined before proceeding
      if (!userContext) {
        console.error('⚠️ User context is undefined after creation attempt')
        // Create a new context as fallback
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

      // For post-onboarding: Enhanced capability-aware responses
      try {
        // Ensure userContext is defined before proceeding with post-onboarding flow
        if (!userContext) {
          console.error('⚠️ User context is undefined before capability discovery')
          // Create a new context as fallback
          userContext = this.scenarioLayer.createUserContext(userId)
        }
        
        // Get available capabilities for enhanced responses
        const availableCapabilities = await unifiedInvocation.getAvailableCapabilities()
        
        // Log capability discovery
        await this.processLogger.logStep({
          id: `capabilities_${Date.now()}`,
          layer: 'unified-invocation',
          action: 'discover_capabilities',
          input: { text: input, context: userContext },
          output: availableCapabilities,
          reasoning: 'Discovered available capabilities for this input',
          duration: Date.now() - startTime,
          confidence: 0.8,
          timestamp: new Date()
        })
        
        // Generate dynamic scenario with capability awareness
        const scenario = await this.scenarioLayer.generateDynamicScenario(userContext, availableCapabilities)
        
        // Enhanced response with capability suggestions
        const capabilityHints = this.generateCapabilityHints(input, availableCapabilities)
        const enhancedMessage = `I understand you're interested in: "${input}". ${capabilityHints}`
        
        return {
          message: enhancedMessage,
          scenario,
          nextStep: 'completed',
          availableCapabilities: availableCapabilities.map(cap => ({
            id: cap.id,
            name: cap.name,
            description: cap.description,
            type: cap.type
          }))
        }
      } catch (error) {
        console.warn('Enhanced processing failed, using fallback:', error)
        
        // Fallback to basic scenario-based response
        const scenario = await this.scenarioLayer.proposeScenario(userContext)
        
        return {
          message: `I understand you're interested in: "${input}". Let me help you with that!`,
          scenario,
          nextStep: 'completed'
        }
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

  // ===== LAYER ACCESS - ITERATION =====

  getIterationLayer(): IIterationLayer {
    if (!this.iterationLayer) {
      throw new Error('Iteration Layer not initialized')
    }
    return this.iterationLayer
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

  initializeIterationLayer(layer: IIterationLayer): void {
    this.iterationLayer = layer
    this.emit('layer_initialized', { layer: 'iteration' })
  }

  // ===== PRIVATE METHODS =====
  
  private generateCapabilityHints(input: string, capabilities: Capability[]): string {
    const inputLower = input.toLowerCase()
    const relevantCapabilities: Capability[] = []
    
    // Find relevant capabilities based on input keywords
    capabilities.forEach(cap => {
      const isRelevant = cap.capabilities.some(capType => {
        const keywords = capType.split('_')
        return keywords.some(keyword => inputLower.includes(keyword))
      })
      
      if (isRelevant) {
        relevantCapabilities.push(cap)
      }
    })
    
    if (relevantCapabilities.length === 0) {
      // General capability hint
      const capabilityTypes = [...new Set(capabilities.map(cap => cap.type))]
      return `I have ${capabilities.length} capabilities available including ${capabilityTypes.join(', ')} to help bring your ideas to life!`
    }
    
    // Specific capability hints
    const capNames = relevantCapabilities.slice(0, 2).map(cap => cap.name)
    if (capNames.length === 1) {
      return `I can use ${capNames[0]} to help with that!`
    } else {
      return `I can use ${capNames.join(' or ')} to help with that!`
    }
  }
  
  setupEventHandlers(): void {
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
  triggerCapabilityAdded(capability: Capability): void {
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
  triggerCapabilityRemoved(capabilityId: string): void {
    this.capabilityCallbacks.removed.forEach(callback => {
      try {
        callback(capabilityId)
      } catch (error) {
        console.error('Error in capability removed callback:', error)
      }
    })
  }
}

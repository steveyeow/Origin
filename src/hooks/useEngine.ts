import { useState, useCallback, useRef, useEffect } from 'react'
import { UserContext, Scenario, EngineResponse, OnboardingStep } from '@/types/engine'
import { InteractiveScenarioLayer } from '@/engine/layers/interactive-scenario'

/**
 * Hook for interacting with the OriginX Engine
 * Provides a clean interface between React components and the engine layers
 */
export function useEngine() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null)
  
  // Engine layer instances
  const scenarioLayerRef = useRef<InteractiveScenarioLayer>()
  
  // Initialize engine layers
  useEffect(() => {
    scenarioLayerRef.current = new InteractiveScenarioLayer({})
  }, [])

  /**
   * Create initial user context and get first scenario
   */
  const initializeUser = useCallback(async (userId: string): Promise<UserContext> => {
    if (!scenarioLayerRef.current) {
      throw new Error('Engine not initialized')
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create user context
      const context = scenarioLayerRef.current.createUserContext(userId)
      
      // Get initial scenario (landing)
      const scenario = await scenarioLayerRef.current.proposeScenario(context)
      setCurrentScenario(scenario)
      
      return context
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize user'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Start onboarding process
   */
  const startOnboarding = useCallback(async (userId: string): Promise<Scenario> => {
    if (!scenarioLayerRef.current) {
      throw new Error('Engine not initialized')
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get user context and update to naming-one step
      let context = scenarioLayerRef.current.getUserContext(userId)
      if (!context) {
        // Initialize user context if not found
        console.log('🔧 Initializing user context for userId:', userId)
        context = {
          userId,
          sessionId: `session_${Date.now()}`,
          currentStep: 'naming-one',
          preferences: {},
          recentInteractions: [],
          timeContext: {
            timeOfDay: 'afternoon',
            dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
        await scenarioLayerRef.current.createUserContext(context)
      }

      // Update context to start onboarding
      await scenarioLayerRef.current.updateUserContext({
        ...context,
        currentStep: 'naming-one'
      })

      // Get onboarding scenario
      const updatedContext = { ...context, currentStep: 'naming-one' as OnboardingStep }
      const scenario = await scenarioLayerRef.current.getOnboardingScenario('naming-one', updatedContext)
      setCurrentScenario(scenario)
      
      return scenario
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start onboarding'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Process user response and get next scenario/action
   */
  const processUserResponse = useCallback(async (
    userId: string, 
    response: string
  ): Promise<EngineResponse> => {
    if (!scenarioLayerRef.current) {
      throw new Error('Engine not initialized')
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get current user context
      const context = scenarioLayerRef.current.getUserContext(userId)
      if (!context) {
        throw new Error('User context not found')
      }

      // Process the response
      const engineResponse = await scenarioLayerRef.current.handleUserResponse(response, context)
      
      // Update current scenario if a new one was provided
      if (engineResponse.scenario) {
        setCurrentScenario(engineResponse.scenario)
      }

      return engineResponse
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process response'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Get a new scenario based on current context
   */
  const getNewScenario = useCallback(async (userId: string): Promise<Scenario> => {
    if (!scenarioLayerRef.current) {
      throw new Error('Engine not initialized')
    }

    setIsLoading(true)
    setError(null)

    try {
      const context = scenarioLayerRef.current.getUserContext(userId)
      if (!context) {
        throw new Error('User context not found')
      }

      const scenario = await scenarioLayerRef.current.proposeScenario(context)
      setCurrentScenario(scenario)
      
      return scenario
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get new scenario'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Update user context
   */
  const updateUserContext = useCallback(async (
    userId: string, 
    updates: Partial<UserContext>
  ): Promise<void> => {
    if (!scenarioLayerRef.current) {
      throw new Error('Engine not initialized')
    }

    try {
      await scenarioLayerRef.current.updateUserContext(userId, updates)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user context'
      setError(errorMessage)
      throw err
    }
  }, [])

  /**
   * Get current user context
   */
  const getUserContext = useCallback((userId: string): UserContext | undefined => {
    if (!scenarioLayerRef.current) {
      return undefined
    }
    
    return scenarioLayerRef.current.getUserContext(userId)
  }, [])

  /**
   * Clear any errors
   */
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    isLoading,
    error,
    currentScenario,
    
    // Actions
    initializeUser,
    startOnboarding,
    processUserResponse,
    getNewScenario,
    updateUserContext,
    getUserContext,
    clearError
  }
}

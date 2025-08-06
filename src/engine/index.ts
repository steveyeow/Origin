// Core Engine Exports
export { OriginEngine } from './core/engine'
export { ProcessLogger } from './core/process-logger'

// Layer Exports
export { InteractiveScenarioLayer } from './layers/interactive-scenario'
export { IntentionReasoningLayer } from './layers/intention-reasoning'
export { PlanningLayer } from './layers/planning'
export { InvocationLayer } from './layers/invocation'
export { unifiedInvocation } from './layers/invocation/unified-invocation'

// Capability System Exports
export { CapabilityRegistry } from './capabilities/registry'
export { CapabilityAutoDiscovery } from './capabilities/auto-discovery'
export { BaseCapability } from './capabilities/base-capability'
export { CapabilityCommunicator } from './layers/interactive-scenario/capability-communicator'

// Type Exports
export type * from '../types/engine'

// Convenience singleton for easy access with true singleton pattern
import { OriginEngine } from './core/engine'

// Define a global type to store our engine instance
declare global {
  var __ORIGIN_ENGINE_INSTANCE__: OriginEngine | undefined
}

// Safe engine initialization with lazy loading
let engineInstance: OriginEngine | null = null
let initializationPromise: Promise<OriginEngine> | null = null

// Lazy initialization function
async function initializeEngine(): Promise<OriginEngine> {
  if (engineInstance) {
    return engineInstance
  }
  
  if (initializationPromise) {
    return initializationPromise
  }
  
  console.log('🏭 Starting safe engine initialization...')
  
  initializationPromise = (async () => {
    try {
      // Create engine without immediate capability discovery
      engineInstance = new OriginEngine()
      console.log('✅ Engine created successfully')
      return engineInstance
    } catch (error) {
      console.error('❌ Engine initialization failed:', error)
      // Return a mock engine as fallback
      const mockEngine = {
        getScenarioLayer: () => ({
          getUserContext: async () => null,
          createUserContext: async () => ({})
        }),
        processUserInput: async () => ({ content: 'Engine initialization failed', requestId: 'fallback' })
      } as any
      engineInstance = mockEngine
      return mockEngine
    }
  })()
  
  return initializationPromise
}

// Proxy object that initializes engine on first use
export const originEngine = new Proxy({} as OriginEngine, {
  get(target, prop) {
    if (!engineInstance) {
      // Return a promise-based method for async operations
      if (typeof prop === 'string' && ['getScenarioLayer', 'processUserInput'].includes(prop)) {
        return async (...args: any[]) => {
          const engine = await initializeEngine()
          const method = (engine as any)[prop]
          if (typeof method === 'function') {
            return method.apply(engine, args)
          }
          return method
        }
      }
      // For synchronous access, trigger initialization but return undefined
      initializeEngine().catch(console.error)
      return undefined
    }
    return (engineInstance as any)[prop]
  }
})

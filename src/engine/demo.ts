/**
 * OriginX Engine Demo
 * Demonstrates the AI-driven conversation flow with LLM integration
 */

import { OriginXEngine } from './core/engine'
import type { UserContext } from '../types/engine'
import { OpenAIService } from '../services/llm/openai-service'

/**
 * Demo script showcasing the AI-driven conversation flow with LLM integration
 * This demonstrates the complete pipeline from user input to AI-powered content generation
 */
async function runDemo() {
  console.log('🚀 Starting OriginX Engine Demo with LLM Integration...')
  console.log('=' .repeat(60))

  // Initialize the engine and LLM service
  const engine = new OriginXEngine()
  const llmService = new OpenAIService()
  
  console.log('\n📊 Engine Status:')
  console.log('- Core Engine: Initialized')
  console.log('- LLM Service:', llmService.isReady() ? '✅ Ready (OpenAI Connected)' : '⚠️  Fallback Mode (No API Key)')
  console.log('- Available Capabilities:', engine.getAvailableCapabilities().length)
  console.log('- Process Logger: Active')

  // Test 1: AI-Powered Onboarding Flow
  console.log('\n🎯 Test 1: AI-Powered Onboarding')
  console.log('-'.repeat(35))
    console.error('❌ Demo failed:', error)
  }
}

/**
 * Demo capability management
 */
export async function demonstrateCapabilityManagement() {
  console.log('🔧 Capability Management Demo\n')

  const invocationLayer = new InvocationLayer()
  
  // Show initial capabilities
  const initialCapabilities = await invocationLayer.getAvailableCapabilities()
  console.log(`Initial capabilities: ${initialCapabilities.length}`)
  
  initialCapabilities.forEach(cap => {
    console.log(`  - ${cap.name} (${cap.type}): ${cap.capabilities.join(', ')}`)
  })
  console.log('')

  // Add a new capability
  const newCapability = {
    id: 'demo-translator',
    name: 'Demo Translator',
    type: 'agent' as const,
    description: 'Translates content between languages',
    version: '1.0.0',
    provider: 'Demo',
    capabilities: ['translation', 'language_detection', 'localization'],
    metadata: {
      costPerUse: 0.005,
      averageLatency: 800,
      qualityScore: 0.88,
      supportedFormats: ['text/plain'],
      examples: [
        {
          input: 'Hello world',
          output: 'Hola mundo',
          description: 'English to Spanish translation'
        }
      ]
    },
    status: 'active' as const
  }

  await invocationLayer.registerCapability(newCapability)
  console.log(`✅ Added new capability: ${newCapability.name}`)

  // Show updated capabilities
  const updatedCapabilities = await invocationLayer.getAvailableCapabilities()
  console.log(`Updated capabilities: ${updatedCapabilities.length}`)

  // Get statistics
  const stats = await invocationLayer.getStatistics()
  console.log('\n📊 Capability Statistics:')
  console.log(`  Total: ${stats.capabilities.total}`)
  console.log(`  By type:`, stats.capabilities.byType)
  console.log(`  By status:`, stats.capabilities.byStatus)
  console.log(`  Active invocations: ${stats.activeInvocations}`)
}

// Run demos if this file is executed directly
if (require.main === module) {
  (async () => {
    await demonstrateAIFlow()
    console.log('\n' + '='.repeat(50) + '\n')
    await demonstrateCapabilityManagement()
  })().catch(console.error)
}

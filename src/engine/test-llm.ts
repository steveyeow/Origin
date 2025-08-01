/**
 * Simple test script to verify LLM integration
 */

import { OpenAIService } from '../services/llm/openai-service'
import type { UserContext } from '../types/engine'

async function testLLMIntegration() {
  console.log('🧪 Testing LLM Integration...')
  console.log('=' .repeat(40))

  const llmService = new OpenAIService()
  
  console.log('LLM Service Status:', llmService.isReady() ? '✅ Ready' : '⚠️  Fallback Mode')
  
  // Mock user context for testing
  const mockUserContext: UserContext = {
    userId: 'test_user',
    sessionId: 'test_session',
    name: 'Alex',
    currentStep: 'completed',
    timeContext: {
      timeOfDay: 'afternoon',
      dayOfWeek: 'Tuesday',
      timezone: 'UTC'
    },
    emotionalState: {
      mood: 'curious',
      energy: 'medium',
      engagement: 'high'
    },
    preferences: {
      communicationStyle: 'casual',
      creativityLevel: 'balanced',
      contentTypes: ['text', 'image'],
      topics: ['technology', 'creativity']
    },
    recentInteractions: [],
    capabilities: [],
    goals: []
  }

  // Test 1: Dynamic Scenario Generation
  console.log('\n🎭 Test 1: Dynamic Scenario Generation')
  console.log('-'.repeat(35))
  
  const mockCapabilities = [
    {
      id: 'gpt4-text',
      name: 'GPT-4 Text Generation',
      type: 'model' as const,
      description: 'Advanced text generation model',
      capabilities: ['text_generation', 'creative_writing'],
      metadata: { provider: 'openai', version: '4.0' }
    }
  ]

  try {
    const scenario = await llmService.generateDynamicScenario(mockUserContext, mockCapabilities)
    console.log('Generated Scenario:')
    console.log('  Title:', scenario.title)
    console.log('  Description:', scenario.description)
    console.log('  Prompt:', scenario.prompt)
    console.log('  Tags:', scenario.tags.join(', '))
  } catch (error) {
    console.log('❌ Scenario generation failed:', error)
  }

  // Test 2: Intent Processing
  console.log('\n🧠 Test 2: Intent Processing')
  console.log('-'.repeat(25))
  
  const testInput = "I want to create a short story about a robot learning to paint"
  
  try {
    const intent = await llmService.processUserIntent(testInput, mockUserContext)
    console.log('Processed Intent:')
    console.log('  Primary Goal:', intent.primaryGoal)
    console.log('  Content Type:', intent.contentType)
    console.log('  Emotional Tone:', intent.emotionalTone)
    console.log('  Urgency:', intent.urgency)
    console.log('  Confidence:', (intent.confidence * 100).toFixed(0) + '%')
  } catch (error) {
    console.log('❌ Intent processing failed:', error)
  }

  // Test 3: Capability Explanation
  console.log('\n💡 Test 3: Capability Explanation')
  console.log('-'.repeat(30))
  
  try {
    const explanation = await llmService.explainCapability(mockCapabilities[0], mockUserContext)
    console.log('Capability Explanation:')
    console.log(' ', explanation)
  } catch (error) {
    console.log('❌ Capability explanation failed:', error)
  }

  console.log('\n✅ LLM Integration Test Complete!')
  
  if (!llmService.isReady()) {
    console.log('\n💡 To enable AI features:')
    console.log('  1. Copy env.example to .env.local')
    console.log('  2. Add your OpenAI API key')
    console.log('  3. Run this test again')
  }
}

// Run the test
testLLMIntegration().catch(console.error)

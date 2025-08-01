/**
 * Test script to verify AI integration with proper environment loading
 */

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { OpenAIService } from '../services/llm/openai-service'
import type { UserContext } from '../types/engine'

async function testAIIntegration() {
  console.log('🤖 Testing AI Integration with Environment Variables...')
  console.log('=' .repeat(55))

  // Debug environment variables
  console.log('🔍 Environment Check:')
  console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Found' : '❌ Not found')
  console.log('  Working Directory:', process.cwd())
  console.log('')

  const llmService = new OpenAIService()
  
  console.log('🚀 LLM Service Status:', llmService.isReady() ? '✅ Ready' : '⚠️  Fallback Mode')
  console.log('')
  
  // Mock user context for testing
  const mockUserContext: UserContext = {
    userId: 'test_user',
    sessionId: 'test_session',
    name: 'Alex',
    currentStep: 'completed',
    timeContext: {
      timeOfDay: 'evening',
      dayOfWeek: 'Monday',
      timezone: 'Asia/Shanghai'
    },
    emotionalState: {
      mood: 'excited',
      energy: 'high',
      engagement: 'high'
    },
    preferences: {
      communicationStyle: 'casual',
      creativityLevel: 'experimental',
      contentTypes: ['text', 'image'],
      topics: ['technology', 'creativity', 'art']
    },
    recentInteractions: [],
    capabilities: [],
    goals: []
  }

  // Mock capabilities
  const mockCapabilities = [
    {
      id: 'gpt4-text',
      name: 'GPT-4 Text Generation',
      type: 'model' as const,
      description: 'Advanced text generation model',
      capabilities: ['text_generation', 'creative_writing', 'storytelling'],
      metadata: { provider: 'openai', version: '4.0' }
    },
    {
      id: 'dalle3-image',
      name: 'DALL-E 3 Image Generation',
      type: 'model' as const,
      description: 'AI image generation model',
      capabilities: ['image_generation', 'visual_art'],
      metadata: { provider: 'openai', version: '3.0' }
    }
  ]

  // Test 1: Dynamic Scenario Generation
  console.log('🎭 Test 1: AI-Powered Dynamic Scenario Generation')
  console.log('-'.repeat(45))
  
  try {
    const scenario = await llmService.generateDynamicScenario(mockUserContext, mockCapabilities)
    console.log('✅ Generated Scenario:')
    console.log('  📝 Title:', scenario.title)
    console.log('  📄 Description:', scenario.description)
    console.log('  💬 Prompt:', scenario.prompt)
    console.log('  🏷️  Tags:', scenario.tags.join(', '))
    console.log('')
  } catch (error) {
    console.log('❌ Scenario generation failed:', error)
    console.log('')
  }

  // Test 2: Intent Processing
  console.log('🧠 Test 2: AI-Powered Intent Processing')
  console.log('-'.repeat(35))
  
  const testInputs = [
    "我想创作一个关于机器人学习绘画的科幻故事",
    "Help me design a logo for my startup",
    "I need to write a professional email to my boss"
  ]
  
  for (const input of testInputs) {
    try {
      console.log(`📝 Input: "${input}"`)
      const intent = await llmService.processUserIntent(input, mockUserContext)
      console.log('  🎯 Primary Goal:', intent.primaryGoal)
      console.log('  📊 Content Type:', intent.contentType)
      console.log('  😊 Emotional Tone:', intent.emotionalTone)
      console.log('  ⚡ Urgency:', intent.urgency)
      console.log('  🎯 Confidence:', (intent.confidence * 100).toFixed(0) + '%')
      console.log('')
    } catch (error) {
      console.log('  ❌ Intent processing failed:', error)
      console.log('')
    }
  }

  // Test 3: Capability Explanation
  console.log('💡 Test 3: AI-Powered Capability Explanation')
  console.log('-'.repeat(40))
  
  for (const capability of mockCapabilities) {
    try {
      console.log(`🔧 Explaining: ${capability.name}`)
      const explanation = await llmService.explainCapability(capability, mockUserContext)
      console.log('  💬 Explanation:', explanation)
      console.log('')
    } catch (error) {
      console.log('  ❌ Capability explanation failed:', error)
      console.log('')
    }
  }

  console.log('🎉 AI Integration Test Complete!')
  
  if (llmService.isReady()) {
    console.log('')
    console.log('🚀 AI Features Status: ACTIVE')
    console.log('  ✅ Dynamic scenario generation with GPT-4')
    console.log('  ✅ Intelligent intent processing')
    console.log('  ✅ Personalized capability explanations')
    console.log('  ✅ Context-aware responses')
    console.log('')
    console.log('🎯 Next Steps:')
    console.log('  1. 🖥️  Frontend integration with React')
    console.log('  2. 🔄 Real-time WebSocket communication')
    console.log('  3. ⚡ Execution and Output layers')
    console.log('  4. 🎨 Multi-modal content generation')
  } else {
    console.log('')
    console.log('⚠️  Running in Fallback Mode')
    console.log('💡 To enable AI features:')
    console.log('  1. Ensure .env.local exists in project root')
    console.log('  2. Add: OPENAI_API_KEY=your_actual_api_key')
    console.log('  3. Restart this test')
  }
}

// Run the test
testAIIntegration().catch(console.error)

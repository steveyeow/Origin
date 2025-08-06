/**
 * ISL UTILITY FUNCTIONS - SHARED HELPERS
 * 
 * PURPOSE: Centralized utility functions for the Interactive Scenario Layer
 * RESPONSIBILITY: Reusable helper functions for scenario selection and name processing
 * 
 * KEY FUNCTIONS:
 * - generateScenarioId(): Creates unique identifiers for scenarios
 * - selectScenarioByContext(): Intelligent scenario selection based on user context
 * - extractNameFromInput(): AI-powered name extraction from user input
 * 
 * USAGE: Imported by ISL layer for scenario management and name processing
 * DEPENDENCIES: Engine types, OpenAI service for AI-powered name extraction
 */

import type { Scenario, UserContext } from '../../../types/engine'
import { OpenAIService } from '../../../services/llm/openai-service'

/**
 * Generate a unique scenario ID
 */
export function generateScenarioId(): string {
  return `scenario_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Select scenario based on user context
 * MVP: Simple selection logic, can be enhanced with ML in the future
 */
export function selectScenarioByContext(scenarios: Scenario[], context: UserContext): Scenario {
  if (scenarios.length === 0) {
    throw new Error('No scenarios available')
  }

  if (scenarios.length === 1) {
    return scenarios[0]
  }

  // Filter scenarios based on context preferences
  let suitableScenarios = scenarios

  // Filter by communication style preference
  if (context.preferences.communicationStyle) {
    const styleFiltered = scenarios.filter(scenario => {
      switch (context.preferences.communicationStyle) {
        case 'casual':
          return scenario.tags.includes('casual') || scenario.tags.includes('friendly')
        case 'playful':
          return scenario.tags.includes('playful') || scenario.tags.includes('fun')
        case 'professional':
          return scenario.tags.includes('professional') || scenario.tags.includes('focused')
        case 'formal':
          return scenario.tags.includes('formal') || scenario.tags.includes('structured')
        default:
          return true
      }
    })
    
    if (styleFiltered.length > 0) {
      suitableScenarios = styleFiltered
    }
  }

  // Filter by creativity level
  if (context.preferences.creativityLevel) {
    const creativityFiltered = suitableScenarios.filter(scenario => {
      switch (context.preferences.creativityLevel) {
        case 'conservative':
          return scenario.difficulty === 'beginner'
        case 'balanced':
          return scenario.difficulty === 'beginner' || scenario.difficulty === 'intermediate'
        case 'experimental':
          return true // All levels
        default:
          return true
      }
    })
    
    if (creativityFiltered.length > 0) {
      suitableScenarios = creativityFiltered
    }
  }

  // Filter by time context
  const timeOfDay = context.timeContext.timeOfDay
  const timeFiltered = suitableScenarios.filter(scenario => 
    scenario.tags.includes(timeOfDay) || scenario.tags.includes('universal')
  )
  
  if (timeFiltered.length > 0) {
    suitableScenarios = timeFiltered
  }

  // If we have emotional state, try to match mood
  if (context.emotionalState?.mood) {
    const moodFiltered = suitableScenarios.filter(scenario =>
      scenario.tags.includes(context.emotionalState!.mood)
    )
    
    if (moodFiltered.length > 0) {
      suitableScenarios = moodFiltered
    }
  }

  // Select randomly from suitable scenarios
  const randomIndex = Math.floor(Math.random() * suitableScenarios.length)
  return suitableScenarios[randomIndex]
}

/**
 * Analyze user input to extract emotional state
 * MVP: Simple keyword-based analysis
 * Future: Use NLP/sentiment analysis
 */
export function analyzeEmotionalState(input: string): Partial<UserContext['emotionalState']> {
  const lowerInput = input.toLowerCase()
  
  // Mood detection based on keywords
  let mood: UserContext['emotionalState']['mood'] = 'curious'
  
  if (lowerInput.includes('excited') || lowerInput.includes('amazing') || lowerInput.includes('awesome')) {
    mood = 'excited'
  } else if (lowerInput.includes('creative') || lowerInput.includes('imagine') || lowerInput.includes('create')) {
    mood = 'creative'
  } else if (lowerInput.includes('relaxed') || lowerInput.includes('calm') || lowerInput.includes('peaceful')) {
    mood = 'relaxed'
  } else if (lowerInput.includes('focused') || lowerInput.includes('work') || lowerInput.includes('serious')) {
    mood = 'focused'
  } else if (lowerInput.includes('fun') || lowerInput.includes('play') || lowerInput.includes('silly')) {
    mood = 'playful'
  }

  // Energy level detection
  let energy: UserContext['emotionalState']['energy'] = 'medium'
  
  if (lowerInput.includes('tired') || lowerInput.includes('sleepy') || lowerInput.includes('low')) {
    energy = 'low'
  } else if (lowerInput.includes('energetic') || lowerInput.includes('pumped') || lowerInput.includes('high')) {
    energy = 'high'
  }

  // Creativity level detection
  let creativity: UserContext['emotionalState']['creativity'] = 'medium'
  
  if (lowerInput.includes('creative') || lowerInput.includes('artistic') || lowerInput.includes('innovative')) {
    creativity = 'high'
  } else if (lowerInput.includes('simple') || lowerInput.includes('basic') || lowerInput.includes('easy')) {
    creativity = 'low'
  }

  return { mood, energy, creativity }
}

/**
 * Update user preferences based on interaction patterns
 * MVP: Simple preference learning
 * Future: ML-based preference modeling
 */
export function updatePreferencesFromInteraction(
  currentPreferences: UserContext['preferences'],
  scenario: Scenario,
  userResponse: string,
  responseTime: number
): UserContext['preferences'] {
  const updatedPreferences = { ...currentPreferences }

  // If user responds quickly and positively, they likely enjoyed this type of scenario
  const isPositiveResponse = userResponse.length > 10 && 
    (userResponse.toLowerCase().includes('yes') || 
     userResponse.toLowerCase().includes('love') ||
     userResponse.toLowerCase().includes('great') ||
     userResponse.toLowerCase().includes('awesome'))

  const isQuickResponse = responseTime < 30000 // 30 seconds

  if (isPositiveResponse && isQuickResponse) {
    // Add scenario type to preferred types
    if (!updatedPreferences.preferredScenarioTypes) {
      updatedPreferences.preferredScenarioTypes = []
    }
    
    if (!updatedPreferences.preferredScenarioTypes.includes(scenario.type)) {
      updatedPreferences.preferredScenarioTypes.push(scenario.type)
    }

    // Adjust creativity level based on scenario difficulty
    if (scenario.difficulty === 'advanced' && updatedPreferences.creativityLevel !== 'experimental') {
      updatedPreferences.creativityLevel = 'experimental'
    } else if (scenario.difficulty === 'intermediate' && updatedPreferences.creativityLevel === 'conservative') {
      updatedPreferences.creativityLevel = 'balanced'
    }
  }

  return updatedPreferences
}

/**
 * Calculate scenario relevance score
 * Used for ranking scenarios when multiple options are available
 */
export function calculateScenarioRelevance(scenario: Scenario, context: UserContext): number {
  let score = 0

  // Base score
  score += 1

  // Time relevance
  if (scenario.tags.includes(context.timeContext.timeOfDay)) {
    score += 2
  }
  if (scenario.tags.includes('universal')) {
    score += 1
  }

  // Mood relevance
  if (context.emotionalState?.mood && scenario.tags.includes(context.emotionalState.mood)) {
    score += 3
  }

  // Preference relevance
  if (context.preferences.preferredScenarioTypes?.includes(scenario.type)) {
    score += 2
  }

  // Creativity level match
  if (context.preferences.creativityLevel) {
    switch (context.preferences.creativityLevel) {
      case 'conservative':
        if (scenario.difficulty === 'beginner') score += 2
        break
      case 'balanced':
        if (scenario.difficulty === 'beginner' || scenario.difficulty === 'intermediate') score += 2
        break
      case 'experimental':
        if (scenario.difficulty === 'advanced') score += 2
        break
    }
  }

  // Communication style match
  if (context.preferences.communicationStyle) {
    const hasStyleTag = scenario.tags.some(tag => {
      switch (context.preferences.communicationStyle) {
        case 'casual':
          return ['casual', 'friendly', 'relaxed'].includes(tag)
        case 'playful':
          return ['playful', 'fun', 'whimsical'].includes(tag)
        case 'professional':
          return ['professional', 'focused', 'structured'].includes(tag)
        case 'formal':
          return ['formal', 'structured', 'serious'].includes(tag)
        default:
          return false
      }
    })
    
    if (hasStyleTag) score += 2
  }

  return score
}

/**
 * Get time-appropriate scenarios
 */
export function getTimeAppropriateScenarios(scenarios: Scenario[], timeOfDay: string): Scenario[] {
  return scenarios.filter(scenario => 
    scenario.tags.includes(timeOfDay) || scenario.tags.includes('universal')
  )
}

/**
 * Extract name from user input using AI and pattern matching
 * CENTRALIZED FUNCTION - Single source of truth for name extraction
 * 
 * @param input - User input text
 * @param isForAI - Whether extracting AI name (true) or user name (false)
 * @param context - User context for AI-powered extraction
 * @param llmService - OpenAI service instance for AI extraction
 * @returns Extracted name or fallback ('One' for AI, 'User' for user)
 */
export async function extractNameFromInput(
  input: string, 
  isForAI: boolean = false, 
  context?: UserContext, 
  llmService?: OpenAIService
): Promise<string> {
  try {
    // Try AI-powered name extraction first if OpenAI is available
    if (llmService && llmService.isReady() && context) {
      const prompt = isForAI 
        ? `Extract the name the user wants to give to their AI assistant from this input: "${input}". Return only the name, nothing else. If no clear name is provided, return "One".`
        : `Extract the user's name from this input: "${input}". Return only the name, nothing else. If no clear name is provided, return "User".`
      
      try {
        const extractionContext = {
          userInput: input,
          intent: { primaryGoal: 'extract_name' },
          scenario: null,
          userContext: context,
          conversationStep: isForAI ? 'naming-one' : 'naming-user'
        }
        
        const response = await llmService.generateContextualResponse(extractionContext)
        const extractedName = response.content.trim()
        
        if (extractedName && extractedName.length > 0 && extractedName !== 'User' && extractedName !== 'One') {
          return extractedName
        }
      } catch (error) {
        console.log('AI name extraction failed, using pattern matching')
      }
    }
  } catch (error) {
    console.error('Error extracting name with AI:', error)
  }
  
  // Fallback to pattern matching
  if (isForAI) {
    // Patterns for AI naming: "how about Tom", "call you Lucy", "Tom"
    const patterns = [
      /(?:how about|what about|call you|name you|you're|your name is)\s+([A-Z][a-zA-Z]+)/i,
      /(?:i'll call you|let's call you)\s+([A-Z][a-zA-Z]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    
    // Single word that's clearly a name (capitalized or lowercase, not a common word)
    // Remove punctuation like ? ! . from the end
    const cleanedInput = input.trim().replace(/[?!.,;:]+$/, '')
    const commonWords = ['hi', 'hello', 'hey', 'how', 'are', 'you', 'what', 'that', 'this', 'good', 'fine', 'ok', 'okay', 'yes', 'no', 'maybe', 'one']
    
    if (/^[A-Za-z][a-zA-Z]*$/.test(cleanedInput) && !commonWords.includes(cleanedInput.toLowerCase())) {
      // Capitalize first letter for consistency
      return cleanedInput.charAt(0).toUpperCase() + cleanedInput.slice(1)
    }
  } else {
    // Patterns for user naming: "I'm Steve", "call me Steve", "Steve"
    const patterns = [
      /(?:call me|name is|i'm|im)\s+([A-Za-z][a-zA-Z]+)/i,
      /(?:my name is|i am)\s+([A-Za-z][a-zA-Z]+)/i
    ]
    
    for (const pattern of patterns) {
      const match = input.match(pattern)
      if (match && match[1]) {
        // Capitalize first letter for consistency
        return match[1].charAt(0).toUpperCase() + match[1].slice(1)
      }
    }
    
    // Single word input that looks like a name (now handles lowercase too)
    // Remove punctuation like ? ! . from the end
    const cleanedInput = input.trim().replace(/[?!.,;:]+$/, '')
    const commonWords = ['hi', 'hello', 'hey', 'how', 'are', 'you', 'what', 'that', 'this', 'good', 'fine', 'ok', 'okay', 'yes', 'no', 'maybe']
    
    if (/^[A-Za-z][a-zA-Z]*$/.test(cleanedInput) && !commonWords.includes(cleanedInput.toLowerCase())) {
      // Capitalize first letter for consistency
      return cleanedInput.charAt(0).toUpperCase() + cleanedInput.slice(1)
    }
  }
  
  return isForAI ? 'One' : 'User'
}

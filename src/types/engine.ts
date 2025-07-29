// Core Engine Type Definitions for MVP
// Designed to be extensible for future sophisticated implementations

export interface UserContext {
  userId: string
  sessionId: string
  name?: string
  oneName?: string
  emotionalState?: EmotionalState
  recentInteractions: Interaction[]
  preferences: UserPreferences
  timeContext: TimeContext
  currentStep: OnboardingStep
}

export interface EmotionalState {
  mood: 'excited' | 'curious' | 'relaxed' | 'creative' | 'focused' | 'playful'
  energy: 'high' | 'medium' | 'low'
  creativity: 'high' | 'medium' | 'low'
}

export interface Interaction {
  id: string
  type: 'user_input' | 'system_response' | 'scenario_proposal'
  content: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface UserPreferences {
  contentTypes?: ContentType[]
  communicationStyle?: 'casual' | 'formal' | 'playful' | 'professional'
  creativityLevel?: 'conservative' | 'balanced' | 'experimental'
  preferredScenarioTypes?: ScenarioType[]
}

export interface TimeContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  dayOfWeek: string
  timezone: string
  lastActiveTime?: Date
}

export type OnboardingStep = 
  | 'landing'
  | 'naming-one' 
  | 'naming-user'
  | 'scenario'
  | 'completed'

// Scenario System
export interface Scenario {
  id: string
  type: ScenarioType
  title: string
  description: string
  prompt: string
  expectedResponse?: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: number // minutes
  tags: string[]
  contextRequirements?: string[]
}

export type ScenarioType = 
  | 'greeting'
  | 'creative_prompt'
  | 'mood_based'
  | 'capability_showcase'
  | 'continuation'
  | 'rest_mode'
  | 'onboarding'

export type ContentType = 
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'character'
  | 'story'
  | 'mixed'

// Engine Response
export interface EngineResponse {
  scenario?: Scenario
  message?: string
  nextStep?: OnboardingStep
  suggestions?: string[]
  error?: string
}

// Interactive Scenario Layer Interface
export interface IInteractiveScenarioLayer {
  proposeScenario(context: UserContext): Promise<Scenario>
  handleUserResponse(response: string, context: UserContext): Promise<EngineResponse>
  getOnboardingScenario(step: OnboardingStep, context: UserContext): Promise<Scenario>
  updateUserContext(userId: string, updates: Partial<UserContext>): Promise<void>
}

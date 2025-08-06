/**
 * ENGINE TYPE DEFINITIONS
 * 
 * PURPOSE: Central type definitions for the entire OriginOS engine architecture
 * RESPONSIBILITY: Defines interfaces, types, and contracts for all engine layers
 * 
 * KEY COMPONENTS:
 * - UserContext: User state and conversation context management
 * - Engine Response: Standard response format across all layers
 * - Capability System: AI model and tool capability definitions
 * - Layer Interfaces: Contracts for all 8 engine layers (ISL, IRL, Planning, etc.)
 * - Process Tracking: Execution monitoring and debugging types
 * 
 * USAGE: Imported by all engine layers and UI components for type safety
 * DEPENDENCIES: None (pure type definitions)
 */

/**
 * Unified conversation step type used across the application
 * This ensures consistency between engine and UI layers
 */
export type ConversationStep = 
  | 'landing'      // Initial landing state
  | 'naming-one'   // User naming the AI
  | 'naming-user'  // AI asking for user's name
  | 'scenario'     // Presenting creative scenario
  | 'completed'    // Onboarding completed

export interface ConversationHistory {
  messages: Interaction[]
  lastUpdated: Date
  totalInteractions: number
  summary?: string
}

export interface UserContext {
  userId: string
  sessionId: string
  name?: string
  oneName?: string
  emotionalState?: EmotionalState
  currentStep?: ConversationStep
  step?: ConversationStep // Legacy field for backward compatibility
  recentInteractions: Interaction[]
  preferences: UserPreferences
  timeContext: TimeContext
  history?: ConversationHistory
  currentScenario?: Scenario
  activeCapabilities?: string[]
  lastInteraction?: Date
  metadata?: Record<string, any>
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
  | 'image_generation'

export type ContentType = 
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'character'
  | 'story'
  | 'mixed'

export type ContentQuality = 'high' | 'medium' | 'low';

// Engine Response
export interface EngineResponse {
  scenario?: Scenario
  message?: string
  nextStep?: ConversationStep
  suggestions?: string[]
  availableCapabilities?: Capability[]
  error?: string
  requestId?: string // Unique identifier for UI synchronization
}

// ===== CAPABILITY SYSTEM =====
export interface Capability {
  id: string
  name: string
  type: 'model' | 'agent' | 'tool' | 'effect'
  description: string
  version: string
  provider: string
  capabilities: string[]
  metadata: CapabilityMetadata
  status: 'active' | 'inactive' | 'maintenance'
}

export interface CapabilityMetadata {
  costPerUse?: number
  averageLatency?: number
  qualityScore?: number
  supportedFormats?: string[]
  limitations?: string[]
  examples?: CapabilityExample[]
}

export interface CapabilityExample {
  input: string
  output: string
  description: string
}

// ===== INTENTION REASONING =====
export interface RawIntent {
  text: string
  primaryGoal: string
  contentType: ContentType
  explicitRequirements: string[]
  implicitNeeds: string[]
  emotionalTone: string
  urgency: 'low' | 'medium' | 'high'
  confidence: number
}

export interface EnrichedIntent {
  id: string
  rawIntent: RawIntent
  refinedGoal: string
  detailedRequirements: Requirement[]
  stylePreferences: StylePreference[]
  contextualBackground: string
  targetAudience: string
  successCriteria: string[]
  constraints: Constraint[]
  estimatedComplexity: 'simple' | 'moderate' | 'complex'
}

export interface Requirement {
  type: 'functional' | 'aesthetic' | 'technical' | 'contextual'
  description: string
  priority: 'must-have' | 'should-have' | 'nice-to-have'
  measurable: boolean
}

export interface StylePreference {
  category: 'tone' | 'format' | 'visual' | 'structure'
  value: string
  strength: number // 0-1
}

export interface Constraint {
  type: 'time' | 'budget' | 'technical' | 'content' | 'legal'
  description: string
  severity: 'hard' | 'soft'
}

export interface OptimizedPrompt {
  id: string
  mainPrompt: string
  styleModifiers: string[]
  qualityEnhancers: string[]
  contextualCues: string[]
  negativePrompts: string[]
  technicalParameters: PromptParameters
  estimatedTokens: number
}

export interface PromptParameters {
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  [key: string]: any
}

// ===== PLANNING SYSTEM =====
export interface Task {
  id: string
  type: 'generation' | 'processing' | 'analysis' | 'formatting'
  description: string
  requiredCapabilities: string[]
  input: any
  expectedOutput: any
  priority: number
  estimatedDuration: number
  dependencies: string[]
}

export interface PlannedTask {
  id: string
  description: string
  dependencies: string[]
  estimatedDuration: number
  priority: number
  requiredCapabilities: string[]
  type: string
  input: any
  expectedOutput: any
  scheduledStart: Date
  estimatedCompletion: Date
  status?: string
  result?: TaskResult | null
}

export interface ExecutionPlan {
  id: string
  intentId: string
  tasks: PlannedTask[]
  totalEstimatedDuration: number
  totalEstimatedCost: number
  qualityExpectation: number
  riskLevel: 'low' | 'medium' | 'high'
  fallbackOptions: FallbackPlan[]
  createdAt: Date
}

export interface PlannedTask extends Task {
  assignedCapability: Capability
  scheduledStart: Date
  estimatedCompletion: Date
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
}

export interface FallbackPlan {
  trigger: string
  alternativeTasks: Task[]
  estimatedImpact: string
}

// ===== EXECUTION SYSTEM =====
export interface ExecutionContext {
  id: string
  planId: string
  currentTask: string
  progress: number
  startTime: Date
  endTime?: Date
  estimatedCompletion: Date
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  intermediateResults: IntermediateResult[]
  errors: ExecutionError[]
  tasks: ExecutionTask[]
  results: TaskResult[]
}

export interface ExecutionTask {
  id: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  startTime?: Date | null
  endTime?: Date | null
  error?: any | null
  priority?: number
  dependencies: string[]
  assignedCapability: string | Capability
  scheduledStart?: Date
  estimatedCompletion?: Date
  type?: string
  requiredCapabilities?: string[]
  result?: TaskResult | null
}

export interface IntermediateResult {
  taskId: string
  type: 'partial' | 'complete'
  content: any
  timestamp: Date
  confidence: number
  metadata: Record<string, any>
}

export interface ExecutionError {
  taskId: string
  error: string
  message: string
  severity: 'warning' | 'error' | 'critical'
  timestamp: Date
  recovery?: string
  [key: string]: any
}

export interface TaskResult {
  taskId: string
  status: 'success' | 'failed' | 'partial'
  output: any
  content?: any
  contentType?: ContentType
  metadata: ResultMetadata
  executionTime: number
  cost: number
}

export interface ResultMetadata {
  qualityScore: number
  confidence: number
  tokensUsed?: number
  model?: string
  processingTime: number
  capability?: string
  executionTime?: number
  cost?: number
  [key: string]: any
}

// ===== OUTPUT SYSTEM =====
export interface GeneratedContent {
  id: string
  type: ContentType
  content: any
  textContent?: string
  mediaContent?: any
  primaryContent?: any
  metadata: ContentMetadata
  preview: PreviewData
  editingSuggestions: EditingSuggestion[]
  exportOptions: ExportOption[]
}

export interface ContentMetadata {
  title?: string
  description?: string
  tags: string[]
  sources?: string[]
  createdAt: Date
  lastModified: Date
  generatedAt?: Date
  version: number
  qualityMetrics: QualityMetrics
}

export interface PreviewData {
  thumbnail?: string
  thumbnailUrl?: string
  title?: string
  summary: string
  keyFeatures: string[]
  interactiveElements: InteractiveElement[]
}

export interface InteractiveElement {
  type: 'button' | 'slider' | 'input' | 'toggle'
  id: string
  label: string
  action: string
  parameters: Record<string, any>
}

export interface EditingSuggestion {
  type: 'improvement' | 'alternative' | 'extension' | 'technical' | 'structure' | 'style' | 'clarity'
  title?: string
  description: string
  impact: 'minor' | 'moderate' | 'major' | 'medium'
  effort: 'low' | 'medium' | 'high'
}

export interface ExportOption {
  format: string
  quality: 'draft' | 'standard' | 'high'
  size?: string
  estimatedTime: number
}

export interface QualityMetrics {
  overall: number
  creativity: number
  relevance: number
  technical: number
  userSatisfaction?: number
}

// ===== PROCESS TRACKING =====
export interface ProcessStep {
  id: string
  layer: string
  action: string
  input: any
  output: any
  reasoning: string
  duration: number
  confidence: number
  timestamp: Date
}

export interface ProcessTrace {
  sessionId: string
  intentId: string
  steps: ProcessStep[]
  totalDuration: number
  keyDecisions: Decision[]
  learningPoints: LearningPoint[]
}

export interface Decision {
  point: string
  options: string[]
  chosen: string
  reasoning: string
  confidence: number
}

export interface LearningPoint {
  category: 'user_preference' | 'capability_performance' | 'process_optimization'
  insight: string
  impact: 'low' | 'medium' | 'high'
  actionable: boolean
}

// ===== LAYER INTERFACES =====
export interface IInteractiveScenarioLayer {
  proposeScenario(context: UserContext): Promise<Scenario>
  handleUserResponse(response: string, context: UserContext): Promise<EngineResponse>
  getOnboardingScenario(step: ConversationStep | undefined, context: UserContext): Promise<Scenario>
  updateUserContext(userId: string, updates: Partial<UserContext>): Promise<void>
  getUserContext(userId: string): UserContext | undefined
  createUserContext(userId: string): UserContext
  // New AI-driven methods
  generateDynamicScenario(context: UserContext, availableCapabilities: Capability[]): Promise<Scenario>
  explainCapability(capability: Capability, userContext: UserContext): Promise<string>
}

export interface IIntentionReasoningLayer {
  processUserInput(input: string, context: UserContext): Promise<RawIntent>
  enrichIntent(rawIntent: RawIntent, userContext: UserContext): Promise<EnrichedIntent>
  generateOptimizedPrompt(enrichedIntent: EnrichedIntent): Promise<OptimizedPrompt>
  validateIntentFeasibility(intent: EnrichedIntent, availableCapabilities: Capability[]): Promise<boolean>
}

export interface IPlanningLayer {
  createExecutionPlan(enrichedIntent: EnrichedIntent, availableCapabilities: Capability[]): Promise<ExecutionPlan>
  optimizePlan(plan: ExecutionPlan): Promise<ExecutionPlan>
  validatePlan(plan: ExecutionPlan): Promise<boolean>
  estimateCost(plan: ExecutionPlan): Promise<number>
}

export interface IInvocationLayer {
  getAvailableCapabilities(): Promise<Capability[]>
  invokeCapability(capabilityId: string, task: Task): Promise<TaskResult>
  registerCapability(capability: Capability): Promise<void>
  removeCapability(capabilityId: string): Promise<void>
  monitorCapabilityHealth(): Promise<Record<string, 'healthy' | 'degraded' | 'unhealthy'>>
}

export interface IExecutionLayer {
  executePlan(plan: ExecutionPlan): Promise<ExecutionContext>
  monitorExecution(contextId: string): AsyncIterator<ExecutionContext>
  pauseExecution(contextId: string): Promise<void>
  resumeExecution(contextId: string): Promise<void>
  cancelExecution(contextId: string): Promise<void>
}

export interface IOutputLayer {
  formatResults(results: TaskResult[]): Promise<GeneratedContent>
  generatePreview(content: GeneratedContent): Promise<PreviewData>
  suggestImprovements(content: GeneratedContent): Promise<EditingSuggestion[]>
  exportContent(content: GeneratedContent, format: string): Promise<any>
}

export interface IIterationLayer {
  processFeedback(feedback: UserFeedback, context: UserContext): Promise<void>
  refineContent(content: GeneratedContent, feedback: UserFeedback): Promise<GeneratedContent>
  learnFromInteraction(interaction: Interaction, context: UserContext): Promise<void>
  trackQualityMetrics(contentId: string, metrics: QualityMetrics): Promise<void>
  suggestNextSteps(context: UserContext, currentContent: GeneratedContent): Promise<string[]>
}

export interface UserFeedback {
  contentId: string
  userId: string
  rating: number
  comments?: string
  specificFeedback?: Record<string, any>
  timestamp: Date
}

export interface ExecutionResult {
  plan: ExecutionPlan
  context: ExecutionContext
  results: TaskResult[]
  success: boolean
  errors?: ExecutionError[]
  metrics: {
    totalTime: number
    totalCost: number
    qualityScore: number
  }
}

// ===== CORE ENGINE INTERFACE =====
export interface IOriginEngine {
  // Core conversation flow
  processUserInput(input: string, userId: string): Promise<EngineResponse>
  
  // Layer access
  getScenarioLayer(): IInteractiveScenarioLayer
  getIntentionLayer(): IIntentionReasoningLayer
  getPlanningLayer(): IPlanningLayer
  getInvocationLayer(): IInvocationLayer
  getExecutionLayer(): IExecutionLayer
  getOutputLayer(): IOutputLayer
  getIterationLayer(): IIterationLayer
  
  // Process transparency
  getProcessTrace(sessionId: string): Promise<ProcessTrace>
  
  // Capability management
  onCapabilityAdded(callback: (capability: Capability) => void): void
  onCapabilityRemoved(callback: (capabilityId: string) => void): void
  
  // Event handling
  setupEventHandlers(): void
  triggerCapabilityAdded(capability: Capability): void
}

// Core Engine Type Definitions for AI-Driven Conversation Flow
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
  planId: string
  currentTask: string
  progress: number
  startTime: Date
  estimatedCompletion: Date
  intermediateResults: IntermediateResult[]
  errors: ExecutionError[]
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
  severity: 'warning' | 'error' | 'critical'
  timestamp: Date
  recovery?: string
}

export interface TaskResult {
  taskId: string
  status: 'success' | 'failed' | 'partial'
  output: any
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
  [key: string]: any
}

// ===== OUTPUT SYSTEM =====
export interface GeneratedContent {
  id: string
  type: ContentType
  content: any
  metadata: ContentMetadata
  preview: PreviewData
  editingSuggestions: EditingSuggestion[]
  exportOptions: ExportOption[]
}

export interface ContentMetadata {
  title?: string
  description?: string
  tags: string[]
  createdAt: Date
  lastModified: Date
  version: number
  qualityMetrics: QualityMetrics
}

export interface PreviewData {
  thumbnail?: string
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
  type: 'improvement' | 'alternative' | 'extension'
  description: string
  impact: 'minor' | 'moderate' | 'major'
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
  getOnboardingScenario(step: OnboardingStep, context: UserContext): Promise<Scenario>
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

// ===== CORE ENGINE INTERFACE =====
export interface IOriginXEngine {
  // Core conversation flow
  processUserInput(input: string, userId: string): Promise<EngineResponse>
  
  // Layer access
  getScenarioLayer(): IInteractiveScenarioLayer
  getIntentionLayer(): IIntentionReasoningLayer
  getPlanningLayer(): IPlanningLayer
  getInvocationLayer(): IInvocationLayer
  getExecutionLayer(): IExecutionLayer
  getOutputLayer(): IOutputLayer
  
  // Process transparency
  getProcessTrace(sessionId: string): Promise<ProcessTrace>
  
  // Capability management
  onCapabilityAdded(callback: (capability: Capability) => void): void
  onCapabilityRemoved(callback: (capabilityId: string) => void): void
}

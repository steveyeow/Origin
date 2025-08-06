# OriginOS Engine Architecture

## Core Architecture Principles

### Design Philosophy
- **Separation of Concerns**: Clear boundaries between UI, Engine, and Layers
- **Single Responsibility**: Each component has one focused purpose
- **Predictable Data Flow**: Unidirectional data flow for state management
- **Pragmatic Implementation**: Balance between best practices and practical solutions

### Architecture Overview

```
┌─────────────┐
│   UI Layer  │  ◄── Only responsible for rendering and user interaction
└─────┬───────┘
      │ 
      │  ◄── Single entry point
┌─────▼───────┐
│   Engine    │  ◄── Central coordinator and state manager
└─────┬───────┘
      │
      │  ◄── Layer communication
┌─────▼───────┐
│   Layers    │  ◄── Domain-specific logic implementation
└─────────────┘
```

## Component Responsibilities

### 1. UI Layer (Frontend)

**Primary Responsibility**: User interaction and display

**Key Functions**:
- Render conversation interface
- Capture user input
- Display AI responses
- Manage UI-specific state (loading indicators, animations)

**What UI Should NOT Do**:
- Directly communicate with individual layers
- Store conversation state or context
- Implement business logic
- Create or manage user contexts

**Example Implementation**:
```typescript
// ConversationFlow.tsx - Proper implementation
function ConversationFlow() {
  // Only UI-related state
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState([]);
  
  // Single entry point to Engine
  async function handleUserInput(input) {
    setIsTyping(true);
    const response = await originEngine.processUserInput(input, userId);
    setMessages([...messages, response]);
    setIsTyping(false);
  }
  
  return (/* UI rendering */);
}
```

### 2. Engine Layer (Central Coordinator)

**Primary Responsibility**: Orchestration and state management

**Key Functions**:
- Act as the single entry point for all user input
- Manage global state and user contexts
- Coordinate communication between layers
- Provide event system for cross-layer notifications

**What Engine Should NOT Do**:
- Implement domain-specific logic
- Directly manipulate UI or DOM
- Duplicate state management from layers

**Example Implementation**:
```typescript
// Proper Engine implementation
class OriginEngine {
  // Centralized user context management
  private userContexts = new Map<string, UserContext>();
  
  // Single entry point for all user input
  async processUserInput(input: string, userId: string): Promise<EngineResponse> {
    // 1. Get or create user context
    let context = this.getUserContext(userId);
    
    // 2. Determine which layer to call based on context state
    if (input === '__INIT__') {
      return this.scenarioLayer.generateDynamicGreeting(context);
    }
    
    // 3. Normal flow: ISL -> IRL -> Planning -> ...
    const scenarioResponse = await this.scenarioLayer.handleUserResponse(input, context);
    
    // 4. If ISL is complete, proceed to next layer
    if (scenarioResponse.status === 'completed') {
      return this.intentionLayer.analyzeUserIntent(input, context);
    }
    
    return scenarioResponse;
  }
  
  // Centralized context management
  getUserContext(userId: string): UserContext {
    if (!this.userContexts.has(userId)) {
      this.userContexts.set(userId, this.createUserContext(userId));
    }
    return this.userContexts.get(userId)!;
  }
}
```

### 3. Layers (Domain Specialists)

**Primary Responsibility**: Implement domain-specific logic

**Key Functions**:
- Process specific aspects of user input
- Return standardized response formats
- Update context (but not create or manage it)
- Implement specialized algorithms

**What Layers Should NOT Do**:
- Directly interact with the frontend
- Create or manage user contexts
- Call other layers (should be coordinated by Engine)

**Example Implementation**:
```typescript
// Proper Layer implementation
class InteractiveScenarioLayer {
  // Only handle domain-specific logic
  async handleUserResponse(input: string, context: UserContext): Promise<EngineResponse> {
    // Process input based on current step
    switch (context.currentStep) {
      case 'naming-one':
        // Process AI naming
        return this.processNamingOne(input, context);
      case 'naming-user':
        // Process user naming
        return this.processNamingUser(input, context);
      // ...other steps
    }
  }
  
  // No longer creates context, only handles greeting generation
  async generateDynamicGreeting(context: UserContext): Promise<EngineResponse> {
    // Greeting generation logic
    return {
      message: "Hello! What would you like to call me?",
      nextStep: 'naming-one'
    };
  }
}
```

## State Management

### 1. Centralized State Management
- All user contexts managed by Engine
- Layers receive, process, and return contexts but don't store them
- UI only stores UI-specific state

### 2. Clear State Transitions
- State changes must be coordinated through Engine
- Use event system to notify of state changes

### 3. Standardized Interfaces
- All layers use the same request/response formats
- Unified context structure

## Singleton Pattern Implementation

To prevent multiple instances during hot reloads in development:

```typescript
// True singleton pattern for Engine
declare global {
  var __ORIGIN_ENGINE_INSTANCE__: OriginEngine | undefined
}

// Create a true singleton that persists across hot reloads
if (!globalThis.__ORIGIN_ENGINE_INSTANCE__) {
  console.log('🏭 Creating new OriginEngine instance (first initialization)')
  globalThis.__ORIGIN_ENGINE_INSTANCE__ = new OriginEngine()
} else {
  console.log('♻️ Reusing existing OriginEngine instance (hot reload)')
}

export const originEngine = globalThis.__ORIGIN_ENGINE_INSTANCE__
```

## Development Rules

### Rule 1: Single Entry Point
All user input must go through the Engine's `processUserInput` method. Never call layer methods directly from the UI.

### Rule 2: Clear Responsibility Boundaries
- **UI**: Only rendering and user interaction
- **Engine**: Orchestration and state management
- **Layers**: Domain-specific logic

### Rule 3: Centralized State Management
User contexts must be managed by the Engine. Layers should not create or store contexts.

### Rule 4: Proper Singleton Implementation
Use the global object pattern for singletons to prevent multiple instances during hot reloads.

### Rule 5: Standardized Communication
All components must use standardized interfaces for communication.

### Rule 6: Documentation First
When making significant changes, update this document first to ensure architectural consistency.

### Rule 7: Code Review Checklist
Before submitting code changes, verify:
- Does this change respect the separation of concerns?
- Is state being managed at the correct level?
- Are singletons properly implemented?
- Is communication happening through standardized interfaces?

## Complete Layer Architecture

### Layer Structure Overview

```
User Input
    ↓
┌─────────────────────┐
│ Interactive         │ ◄── User onboarding, scenario generation
│ Scenario Layer      │
└─────────┬───────────┘
          ↓
┌─────────────────────┐
│ Intention           │ ◄── Intent understanding, context enrichment
│ Reasoning Layer     │
└─────────┬───────────┘
          ↓
┌─────────────────────┐
│ Planning Layer      │ ◄── Task decomposition, resource matching
└─────────┬───────────┘
          ↓
┌─────────────────────┐
│ Invocation Layer    │ ◄── Capability management and execution
│ ┌─────────────────┐ │
│ │ Model Invocation │ │ ◄── AI model calls (LLMs, image generation)
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ Agent Invocation │ │ ◄── Agent and tool execution
│ └─────────────────┘ │
└─────────┬───────────┘
          ↓
┌─────────────────────┐
│ Execution Layer     │ ◄── Task execution, monitoring
└─────────┬───────────┘
          ↓
┌─────────────────────┐
│ Output Layer        │ ◄── Result formatting, presentation
└─────────┬───────────┘
          ↓
┌─────────────────────┐
│ Iteration Layer     │ ◄── Next-step recommendations
└─────────────────────┘
```

### Layer Interactions and Data Flow

#### 1. Interactive Scenario Layer (ISL)

**Purpose**: Handles user onboarding and scenario generation

**Inputs**:
- User input text/voice
- User context from Engine

**Outputs**:
- Structured responses with next steps
- Updated user context

**Key Methods**:
```typescript
interface IInteractiveScenarioLayer {
  // Core conversation flow
  handleUserResponse(input: string, context: UserContext): Promise<EngineResponse>;
  generateDynamicGreeting(context: UserContext): Promise<EngineResponse>;
  
  // Context management
  createUserContext(userId: string): UserContext;
  getUserContext(userId: string): UserContext | undefined;
  updateUserContext(userId: string, updates: Partial<UserContext>): Promise<void>;
  
  // Capability integration
  explainCapability(capability: Capability, context: UserContext): Promise<string>;
  suggestCapabilityScenario(capability: Capability, context: UserContext): Promise<Scenario>;
}
```

**Interaction with Engine**:
- Receives user input from Engine
- Returns structured responses to Engine
- Updates context through Engine's context management

#### 2. Intention Reasoning Layer (IRL)

**Purpose**: Understands user intent and enriches context

**Inputs**:
- User input text
- User context from Engine
- Conversation history

**Outputs**:
- Structured intent
- Optimized prompts

**Key Methods**:
```typescript
interface IIntentionReasoningLayer {
  // Intent processing
  analyzeUserIntent(input: string, context: UserContext): Promise<RawIntent>;
  enrichIntent(rawIntent: RawIntent, context: UserContext): Promise<EnrichedIntent>;
  
  // Prompt optimization
  generateOptimizedPrompt(intent: EnrichedIntent): Promise<OptimizedPrompt>;
  
  // Validation
  validateIntent(intent: EnrichedIntent, capabilities: Capability[]): Promise<ValidationResult>;
}
```

**Interaction with Engine**:
- Receives user input after ISL processing
- Returns structured intent for Planning Layer
- Does not modify context directly

#### 3. Planning Layer

**Purpose**: Creates execution plans by matching intents with capabilities

**Inputs**:
- Enriched user intent
- Available capabilities

**Outputs**:
- Execution plan with tasks
- Resource requirements

**Key Methods**:
```typescript
interface IPlanningLayer {
  // Plan creation
  createExecutionPlan(intent: EnrichedIntent, capabilities: Capability[]): Promise<ExecutionPlan>;
  
  // Plan optimization
  optimizePlan(plan: ExecutionPlan, constraints: PlanConstraints): Promise<ExecutionPlan>;
  
  // Validation and estimation
  validatePlanFeasibility(plan: ExecutionPlan): Promise<ValidationResult>;
  estimateResourceRequirements(plan: ExecutionPlan): Promise<ResourceEstimate>;
}
```

**Interaction with Engine**:
- Receives enriched intent from Engine (after IRL processing)
- Returns execution plan to Engine
- Requests capability information from Engine

#### 4. Invocation Layer

**Purpose**: Manages and executes capabilities

**Sub-layers**:

**4.1 Model Invocation Layer**
- Handles AI model calls (LLMs, image generation)
- Manages model registry and selection

**4.2 Agent Invocation Layer**
- Manages agent and tool execution
- Handles tool registry and orchestration

**Inputs**:
- Execution plan with tasks
- Capability requirements

**Outputs**:
- Execution results
- Status updates

**Key Methods**:
```typescript
interface IInvocationLayer {
  // Capability management
  getAvailableCapabilities(): Promise<Capability[]>;
  registerCapability(capability: Capability): Promise<void>;
  removeCapability(capabilityId: string): Promise<void>;
  
  // Execution
  invokeCapability(capabilityId: string, params: any): Promise<CapabilityResult>;
  batchInvokeCapabilities(requests: CapabilityRequest[]): Promise<CapabilityResult[]>;
  
  // Monitoring
  getCapabilityStatus(capabilityId: string): Promise<CapabilityStatus>;
  monitorExecution(executionId: string): Promise<ExecutionStatus>;
}
```

**Interaction with Engine**:
- Receives execution plan from Engine
- Returns execution results to Engine
- Notifies Engine of capability status changes

#### 5. Execution Layer

**Purpose**: Executes tasks and monitors progress

**Inputs**:
- Execution plan
- Task parameters

**Outputs**:
- Execution results
- Progress updates

**Key Methods**:
```typescript
interface IExecutionLayer {
  // Task execution
  executeTask(task: Task): Promise<TaskResult>;
  executePlan(plan: ExecutionPlan): Promise<ExecutionResult>;
  
  // Stream support
  executeStreamTask(task: Task): AsyncIterable<TaskProgress>;
  
  // Control
  pauseExecution(executionId: string): Promise<void>;
  resumeExecution(executionId: string): Promise<void>;
  cancelExecution(executionId: string): Promise<void>;
}
```

**Interaction with Engine**:
- Receives execution plan from Engine
- Returns execution results to Engine
- Provides progress updates to Engine

#### 6. Output Layer

**Purpose**: Formats and presents results

**Inputs**:
- Execution results
- User context

**Outputs**:
- Formatted content
- UI presentation instructions

**Key Methods**:
```typescript
interface IOutputLayer {
  // Formatting
  formatResult(result: ExecutionResult, context: UserContext): Promise<FormattedOutput>;
  
  // Presentation
  generatePresentationInstructions(output: FormattedOutput): Promise<PresentationInstructions>;
  
  // Quality assessment
  assessOutputQuality(output: FormattedOutput): Promise<QualityAssessment>;
}
```

**Interaction with Engine**:
- Receives execution results from Engine
- Returns formatted output to Engine
- Does not modify context directly

#### 7. Iteration Layer

**Purpose**: Generates next-step recommendations

**Inputs**:
- Current output
- Available capabilities
- User context

**Outputs**:
- Next-step proposals
- Capability suggestions

**Key Methods**:
```typescript
interface IIterationLayer {
  // Next-step generation
  generateNextStepProposals(output: FormattedOutput, context: UserContext): Promise<Proposal[]>;
  
  // Capability analysis
  analyzeApplicableCapabilities(output: FormattedOutput): Promise<Capability[]>;
  
  // Feedback loop
  incorporateUserFeedback(feedback: UserFeedback, proposals: Proposal[]): Promise<Proposal[]>;
}
```

**Interaction with Engine**:
- Receives formatted output from Engine
- Returns next-step proposals to Engine
- Requests capability information from Engine

### Cross-Layer Communication

1. **Event System**
   - Engine provides an event bus for cross-layer communication
   - Layers can subscribe to events but not directly call each other
   - Example events: `capability-added`, `context-updated`, `execution-progress`

2. **Data Transformation Flow**
   ```
   User Input → Raw Text → Structured Intent → Execution Plan → 
   Task Execution → Raw Results → Formatted Output → Next Steps
   ```

3. **Context Propagation**
   - Context flows through all layers but is managed by Engine
   - Each layer can request context updates but cannot modify directly
   - Context versioning ensures consistency

4. **Error Handling**
   - Standardized error format across all layers
   - Errors bubble up to Engine for centralized handling
   - Graceful degradation when a layer fails

## Current Implementation vs. Ideal Architecture

### Key Gaps Identified

1. **Context Management Inconsistency**
   - **Current**: Context creation happens in multiple places (ISL, ConversationFlow)
   - **Ideal**: Context should be created and managed exclusively by Engine
   - **Fix Required**: Remove context creation from ConversationFlow and ensure all context updates go through Engine

2. **Direct Layer Access from UI**
   - **Current**: ConversationFlow sometimes bypasses Engine to call ISL methods directly
   - **Ideal**: UI should only interact with Engine through its single entry point
   - **Fix Required**: Refactor ConversationFlow to only use `originEngine.processUserInput()`

3. **Incomplete Singleton Implementation**
   - **Current**: Some services like OpenAIService are instantiated multiple times
   - **Ideal**: All services should follow the singleton pattern using `globalThis`
   - **Fix Required**: Apply consistent singleton pattern to all services

4. **Layer Initialization Sequence**
   - **Current**: Layers initialize capabilities independently
   - **Ideal**: Engine should coordinate layer initialization
   - **Fix Required**: Move initialization responsibility to Engine

5. **Event System Underutilization**
   - **Current**: Limited use of event system for cross-layer communication
   - **Ideal**: Robust event system for all cross-layer notifications
   - **Fix Required**: Expand event system usage for state changes

6. **Inconsistent Error Handling**
   - **Current**: Error handling varies across layers
   - **Ideal**: Standardized error format and centralized handling
   - **Fix Required**: Implement consistent error handling pattern

7. **Incomplete Layer Implementation**
   - **Current**: Only ISL and parts of Invocation Layer are fully implemented
   - **Ideal**: Complete implementation of all 7 layers
   - **Fix Required**: Implement remaining layers following architecture guidelines

### Code Examples of Current Issues

#### 1. Context Management in Multiple Places

```typescript
// In ConversationFlow.tsx - PROBLEMATIC
const generateEngineResponse = async (userInput: string) => {
  // Creating context in UI component - should be Engine's responsibility
  const response = await originEngine.processUserInput(userInput, user.id)
  // ...
}

// In ISL - ALSO CREATING CONTEXT
public createUserContext(userId: string): UserContext {
  const context = {
    userId,
    currentStep: 'naming-one',
    // ...
  }
  this.userContexts.set(userId, context)
  return context
}
```

#### 2. Direct Layer Access

```typescript
// In ConversationFlow.tsx - PROBLEMATIC
const triggerGreeting = async () => {
  // Should use originEngine.processUserInput('__INIT__', userId) instead
  const response = await originEngine.processUserInput('__INIT__', user.id)
  // ...
}
```

#### 3. Inconsistent Singleton Implementation

```typescript
// In OpenAIService - NEEDS STANDARDIZATION
export class OpenAIService {
  private static instance: OpenAIService | null = null;
  
  constructor() {
    if (OpenAIService.instance) {
      return OpenAIService.instance;
    }
    // Initialize...
    OpenAIService.instance = this;
  }
}

// Better pattern (like in Engine)
declare global {
  var __OPENAI_SERVICE_INSTANCE__: OpenAIService | undefined
}

if (!globalThis.__OPENAI_SERVICE_INSTANCE__) {
  globalThis.__OPENAI_SERVICE_INSTANCE__ = new OpenAIService()
}
```

### Migration Path

1. **Short-term Fixes**:
   - Complete singleton implementation for all services
   - Remove direct layer access from UI components
   - Centralize context management in Engine

2. **Medium-term Improvements**:
   - Implement robust event system
   - Standardize error handling
   - Complete ISL and Invocation Layer implementation

3. **Long-term Goals**:
   - Implement remaining layers (IRL, Planning, Execution, Output, Iteration)
   - Add comprehensive logging and monitoring
   - Develop capability marketplace integration

## Conclusion

This architecture ensures a clean separation of concerns, predictable data flow, and maintainable code structure. By following these guidelines, we can build a robust and extensible engine that powers the OriginOS platform while avoiding common pitfalls like state conflicts, duplicate instances, and tangled responsibilities.

**Remember**: Always consult this document when making changes to the Engine, UI, or Layers to ensure architectural consistency and prevent regression of previously fixed issues.

# OriginX Engine

The core AI-driven conversation engine that powers OriginX's intelligent content generation capabilities.

## Overview

The OriginX Engine implements a sophisticated 8-layer architecture designed to transform user conversations into high-quality content generation through AI-powered understanding, planning, and execution.

## Architecture

```
User Input → ISL → IRL → Planning → Invocation → Execution → Output → Iteration
             ↑                      ↑           ↑
         Context Memory    Capability Registry  Process Logger
```

### Core Layers

1. **Interactive Scenario Layer (ISL)** - Dynamic scenario generation and user guidance
2. **Intention Reasoning Layer (IRL)** - Intent understanding and prompt optimization
3. **Planning Layer** - Task decomposition and resource matching
4. **Invocation Layer** - Capability management and execution
5. **Execution Layer** - Task execution and monitoring *(Coming Soon)*
6. **Output Layer** - Result formatting and presentation *(Coming Soon)*
7. **Iteration Layer** - Next-step recommendations *(Coming Soon)*

### Supporting Systems

- **Capability Registry** - Dynamic capability management
- **Process Logger** - Complete transparency and tracing
- **Memory System** - Context and preference management *(Coming Soon)*

## Quick Start

### Basic Usage

```typescript
import { OriginXEngine } from './engine'

// Initialize engine
const engine = new OriginXEngine()

// Process user input
const response = await engine.processUserInput(
  "I want to create a story about a robot",
  "user123"
)

console.log(response.message)
```

### Advanced Usage with All Layers

```typescript
import { 
  OriginXEngine,
  IntentionReasoningLayer,
  PlanningLayer,
  InvocationLayer
} from './engine'

// Initialize engine with all layers
const engine = new OriginXEngine()
const intentionLayer = new IntentionReasoningLayer()
const planningLayer = new PlanningLayer()
const invocationLayer = new InvocationLayer()

// Connect layers
engine.initializeIntentionLayer(intentionLayer)
engine.initializePlanningLayer(planningLayer)
engine.initializeInvocationLayer(invocationLayer)

// Now the engine supports full AI-driven flow
const response = await engine.processUserInput(
  "Create a creative story about AI consciousness",
  "user123"
)
```

## Key Features

### 🤖 AI-Driven Scenarios
- Dynamic scenario generation based on available capabilities
- Context-aware conversation flow
- Personalized user experiences

### 🧠 Intelligent Intent Processing
- Natural language understanding
- Context enrichment
- Optimized prompt generation

### 📋 Smart Planning
- Automatic task decomposition
- Capability-aware resource matching
- Cost and time optimization

### ⚡ Flexible Capability System
- Dynamic capability registration
- Health monitoring
- Performance tracking

### 🔍 Complete Transparency
- Process step logging
- Decision tracking
- Performance analytics

## Demo

Run the included demo to see the engine in action:

```bash
cd src/engine
npx ts-node demo.ts
```

This will demonstrate:
- Complete AI-driven conversation flow
- Dynamic scenario generation
- Intent processing and planning
- Capability invocation
- Process transparency

## API Reference

### OriginXEngine

Main engine class that orchestrates all layers.

```typescript
class OriginXEngine {
  // Core conversation processing
  processUserInput(input: string, userId: string): Promise<EngineResponse>
  
  // Layer initialization
  initializeIntentionLayer(layer: IIntentionReasoningLayer): void
  initializePlanningLayer(layer: IPlanningLayer): void
  initializeInvocationLayer(layer: IInvocationLayer): void
  
  // Process transparency
  getProcessTrace(sessionId: string): Promise<ProcessTrace>
  
  // Capability events
  onCapabilityAdded(callback: (capability: Capability) => void): void
  onCapabilityRemoved(callback: (capabilityId: string) => void): void
}
```

### InteractiveScenarioLayer

Handles dynamic scenario generation and user guidance.

```typescript
class InteractiveScenarioLayer {
  // Core scenario methods
  proposeScenario(context: UserContext): Promise<Scenario>
  handleUserResponse(response: string, context: UserContext): Promise<EngineResponse>
  
  // AI-driven methods
  generateDynamicScenario(context: UserContext, capabilities: Capability[]): Promise<Scenario>
  explainCapability(capability: Capability, userContext: UserContext): Promise<string>
  
  // Context management
  createUserContext(userId: string): UserContext
  updateUserContext(userId: string, updates: Partial<UserContext>): Promise<void>
}
```

### IntentionReasoningLayer

Processes user input to understand intentions and generate optimized prompts.

```typescript
class IntentionReasoningLayer {
  processUserInput(input: string, context: UserContext): Promise<RawIntent>
  enrichIntent(rawIntent: RawIntent, userContext: UserContext): Promise<EnrichedIntent>
  generateOptimizedPrompt(enrichedIntent: EnrichedIntent): Promise<OptimizedPrompt>
  validateIntentFeasibility(intent: EnrichedIntent, capabilities: Capability[]): Promise<boolean>
}
```

### PlanningLayer

Creates execution plans by matching user intents with available capabilities.

```typescript
class PlanningLayer {
  createExecutionPlan(intent: EnrichedIntent, capabilities: Capability[]): Promise<ExecutionPlan>
  optimizePlan(plan: ExecutionPlan): Promise<ExecutionPlan>
  validatePlan(plan: ExecutionPlan): Promise<boolean>
  estimateCost(plan: ExecutionPlan): Promise<number>
}
```

### InvocationLayer

Manages and invokes capabilities (models, agents, tools, effects).

```typescript
class InvocationLayer {
  getAvailableCapabilities(): Promise<Capability[]>
  invokeCapability(capabilityId: string, task: Task): Promise<TaskResult>
  registerCapability(capability: Capability): Promise<void>
  removeCapability(capabilityId: string): Promise<void>
  monitorCapabilityHealth(): Promise<Record<string, 'healthy' | 'degraded' | 'unhealthy'>>
}
```

## Configuration

### Default Capabilities

The engine comes with several built-in capabilities:

- **GPT-4 Text Generation** - Advanced language model for text creation
- **DALL-E 3 Image Generation** - AI image generation from text descriptions
- **Text Formatting Agent** - Content structuring and formatting

### Adding Custom Capabilities

```typescript
const customCapability: Capability = {
  id: 'my-custom-model',
  name: 'My Custom Model',
  type: 'model',
  description: 'Custom AI model for specialized tasks',
  version: '1.0.0',
  provider: 'MyCompany',
  capabilities: ['custom_generation', 'specialized_analysis'],
  metadata: {
    costPerUse: 0.02,
    averageLatency: 1500,
    qualityScore: 0.92
  },
  status: 'active'
}

await invocationLayer.registerCapability(customCapability)
```

## Development Status

### ✅ Implemented
- Core engine architecture
- Interactive Scenario Layer with AI enhancements
- Intention Reasoning Layer
- Planning Layer
- Invocation Layer with capability management
- Process logging and transparency
- Comprehensive demo system

### 🔄 In Progress
- Full LLM integration for scenario generation
- Advanced prompt optimization
- Real-time execution monitoring

### 📋 Planned
- Execution Layer implementation
- Output Layer with preview generation
- Iteration Layer for next-step recommendations
- Memory system for long-term context
- Advanced capability marketplace integration

## Contributing

The engine is designed for extensibility. Key extension points:

1. **Custom Layers** - Implement layer interfaces for new functionality
2. **Capability Providers** - Add new models, agents, tools, or effects
3. **Process Enhancers** - Extend logging and analytics
4. **UI Integrations** - Connect engine to different frontend systems

## Performance

### Benchmarks (MVP Implementation)

- **Scenario Generation**: ~100ms (static) / ~2s (AI-driven planned)
- **Intent Processing**: ~50ms (keyword-based) / ~1s (LLM planned)
- **Planning**: ~200ms for moderate complexity
- **Capability Invocation**: Variable based on capability (500ms - 15s)

### Scalability

- Designed for horizontal scaling
- Event-driven architecture
- Stateless layer implementations
- Capability health monitoring

## License

Part of the OriginX project. See main project LICENSE for details.

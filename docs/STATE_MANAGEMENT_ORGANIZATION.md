# OriginOS State Management Organization

## Overview
This document provides a clear overview of how state management is organized across the OriginOS codebase to address complexity and eliminate duplicate functions.

## File Structure and Responsibilities

### 1. **Core Type Definitions** (`src/types/engine.ts`)
**PURPOSE**: Central type definitions for the entire OriginOS engine architecture
**RESPONSIBILITY**: Defines interfaces, types, and contracts for all engine layers

**Key Components:**
- `UserContext`: User state and conversation context management
- `EngineResponse`: Standard response format across all layers
- `Capability System`: AI model and tool capability definitions
- `Layer Interfaces`: Contracts for all 8 engine layers (ISL, IRL, Planning, etc.)
- `Process Tracking`: Execution monitoring and debugging types

**Usage**: Imported by all engine layers and UI components for type safety
**Dependencies**: None (pure type definitions)

### 2. **Core Engine** (`src/engine/core/engine.ts`)
**PURPOSE**: Central orchestrator for the entire OriginOS AI conversation system
**RESPONSIBILITY**: Coordinates all 8 engine layers and manages conversation flow

**Key Functions:**
- `processUserInput()`: Main entry point for all user interactions
- Layer Management: Initializes and coordinates ISL, IRL, Planning, Invocation, etc.
- Context Management: Maintains user context across conversation sessions
- Capability Discovery: Integrates with UnifiedInvocationLayer for AI capabilities

**Architecture Flow:**
```
User Input → Engine → ISL (scenarios) → IRL (intent) → Planning → Invocation → Response
```

**Usage**: Singleton instance (originEngine) used by ConversationFlow.tsx
**Dependencies**: All engine layers, ProcessLogger, UnifiedInvocationLayer

### 3. **Interactive Scenario Layer** (`src/engine/layers/interactive-scenario/index.ts`)
**PURPOSE**: Manages conversation flow, user onboarding, and scenario generation
**RESPONSIBILITY**: Core conversation logic, user context management, and AI scenario creation

**Key Functions:**
- `handleUserResponse()`: Processes user input and determines conversation flow
- Onboarding Management: Handles naming-one, naming-user, and scenario steps
- Context Management: Creates, stores, and updates user conversation context
- Dynamic Scenarios: AI-generated conversation scenarios based on user context

**Conversation Flow:**
```
New User → naming-one (AI name) → naming-user (user name) → scenario (creative conversation)
```

**Usage**: Used by Core Engine as the primary conversation management layer
**Dependencies**: OpenAI Service, UnifiedInvocation, scenario definitions, utility functions

### 4. **ISL Utility Functions** (`src/engine/layers/interactive-scenario/utils.ts`)
**PURPOSE**: Centralized utility functions for the Interactive Scenario Layer
**RESPONSIBILITY**: Reusable helper functions for scenario selection and name processing

**Key Functions:**
- `generateScenarioId()`: Creates unique identifiers for scenarios
- `selectScenarioByContext()`: Intelligent scenario selection based on user context
- `extractNameFromInput()`: **CENTRALIZED** AI-powered name extraction from user input

**Usage**: Imported by ISL layer for scenario management and name processing
**Dependencies**: Engine types, OpenAI service for AI-powered name extraction

### 5. **Scenario Definitions** (`src/engine/layers/interactive-scenario/scenarios.ts`)
**PURPOSE**: Static scenario definitions for onboarding and general conversation
**RESPONSIBILITY**: Provides predefined conversation scenarios and prompts

**Key Components:**
- `ONBOARDING_SCENARIOS`: Step-by-step user onboarding scenarios (naming, introduction)
- `GENERAL_SCENARIOS`: Post-onboarding conversation scenarios (creative, mood-based)

**Scenario Types:**
- Onboarding: landing, naming-one, naming-user, scenario completion
- General: creative prompts, mood-based interactions, capability showcases

**Usage**: Imported by ISL layer for scenario selection and conversation flow
**Dependencies**: Engine type definitions only

### 6. **Unified Invocation Layer** (`src/engine/layers/invocation/unified-invocation.ts`)
**PURPOSE**: Single entry point for all AI model and capability invocations
**RESPONSIBILITY**: Capability discovery, invocation, billing, and result management

**Key Functions:**
- `invoke()`: Main method to execute any AI capability (text, image, video, voice)
- Auto-Discovery: Automatically detects and registers available AI capabilities
- Billing Integration: Tracks usage and deducts credits for all AI operations
- Result Management: Handles AI responses, uploads to S3, and formats results

**Supported Capabilities:**
- Text Generation: OpenAI GPT models
- Image Generation: DALL-E, Midjourney, Stable Diffusion
- Voice Synthesis: ElevenLabs, OpenAI TTS
- Video Generation: Future integration planned

**Usage**: Used by ISL and other layers to execute AI capabilities
**Dependencies**: CapabilityRegistry, BillingService, S3Service, AI model services

### 7. **Conversation Flow UI** (`src/components/conversation/ConversationFlow.tsx`)
**PURPOSE**: Primary user interface for conversation interactions
**RESPONSIBILITY**: UI state management, voice/chat modes, message display, user input handling

**Key Functions:**
- Message Management: Displays conversation history and handles new messages
- Voice Mode: Speech recognition, voice synthesis, and voice UI controls
- Chat Mode: Text input, message bubbles, and typing indicators
- Engine Integration: Communicates with OriginEngine for AI responses
- State Synchronization: Manages complex state between parent components

**Interaction Modes:**
- Chat Mode: Traditional text-based conversation interface
- Voice Mode: Hands-free voice conversation with visual feedback

**Usage**: Used by main page and conversation page as the primary conversation interface
**Dependencies**: OriginEngine, Auth, Subscription, Voice services, UI components

## State Management Principles

### 1. **Single Source of Truth**
- **User Context**: Managed exclusively by ISL layer
- **Name Extraction**: Centralized in `utils.ts` - no duplicates
- **Conversation Flow**: Controlled by ISL with clear step transitions
- **AI Capabilities**: Managed by UnifiedInvocationLayer

### 2. **Clear Responsibility Boundaries**
- **Engine**: Orchestration and layer coordination
- **ISL**: Conversation logic and user context
- **UI**: Display and user interaction only
- **Utils**: Shared helper functions

### 3. **Data Flow Direction**
```
UI (ConversationFlow) 
  ↓ (user input)
Engine (processUserInput)
  ↓ (orchestration)
ISL (handleUserResponse)
  ↓ (context management)
Utils (helper functions)
```

### 4. **No Duplicate Functions**
- ✅ **Name Extraction**: Single implementation in `utils.ts`
- ✅ **Context Management**: Only in ISL layer
- ✅ **Scenario Selection**: Centralized utility functions
- ✅ **Type Definitions**: Single source in `types/engine.ts`

## Migration Summary

### Issues Resolved:
1. **Duplicate Name Extraction**: Moved from ISL method to centralized utility function
2. **Complex State Distribution**: Clear documentation of each file's responsibility
3. **Missing Documentation**: Added comprehensive file-level documentation
4. **Unclear Boundaries**: Defined clear responsibility boundaries for each layer

### Code Organization Improvements:
1. **Centralized Utilities**: All ISL helper functions in dedicated utils file
2. **Clear Documentation**: Each file has comprehensive purpose documentation
3. **Single Source of Truth**: Eliminated duplicate implementations
4. **Type Safety**: Centralized type definitions with clear dependencies

This organization ensures maintainable, scalable code with clear separation of concerns and no duplicate functionality.

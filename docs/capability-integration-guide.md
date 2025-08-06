# OriginOS Capability Integration Guide

## Current Status

### ✅ Existing Models (Already Implemented)
These models are **already created** and functional:
- **Text Generation**: GPT4Model, GPT35TurboModel
- **Image Generation**: DallE3Model, MidjourneyModel  
- **Video Generation**: RunwayML3Model, PikaLabsModel
- **Voice Synthesis**: ElevenLabsVoiceModel, BrowserSpeechModel

### 📁 File Structure
```
src/engine/capabilities/
├── base-capability.ts          # Base class for all capabilities
├── auto-discovery.ts           # Auto-registration system
├── registry.ts                 # Capability storage (no changes needed)
└── models/
    ├── text-generation.ts      # GPT models
    ├── image-generation.ts     # DALL-E, Midjourney
    ├── video-generation.ts     # Runway, Pika Labs
    └── voice-synthesis.ts      # ElevenLabs, Browser Speech

src/engine/layers/invocation/
├── index.ts                    # Generic invocation (no changes needed)
├── model-invocation.ts         # Old system (still works)
├── unified-invocation.ts       # New unified system
└── models/
    └── openai-adapter.ts       # API adapter (optional)
```

## Adding New Capabilities

### Step-by-Step Integration Process

#### For Models (text, image, video, voice)

**Step 1: Create Model File**
- **Location**: `src/engine/capabilities/models/your-model-type.ts`
- **Action**: Create new file or add to existing type file

```typescript
// Example: src/engine/capabilities/models/text-generation.ts
import { BaseCapability } from '../base-capability'

export class YourTextModel extends BaseCapability {
  id = 'your-model-id'
  name = 'Your Model Name'
  type = 'model' as const
  description = 'Description of your model'
  version = '1.0.0'
  provider = 'YourProvider'
  capabilities = ['text_generation'] // or 'image_generation', 'video_generation', 'voice_synthesis'
  
  metadata = {
    costPerUse: 0.01, // USD
    averageLatency: 2000, // ms
    qualityScore: 0.9,
    supportedFormats: ['text'],
    limitations: ['Rate limited to 100 requests/hour'],
    examples: ['Generate a story about...']
  }

  async generateText(prompt: string): Promise<any> {
    // Your API implementation
    return { 
      content: 'Generated text...', 
      cost: this.metadata.costPerUse,
      metadata: { tokensUsed: { total: 100 } }
    }
  }
}
```

**Step 2: Register in Auto-Discovery**
- **File to Update**: `src/engine/capabilities/auto-discovery.ts`
- **Action**: Add import and class to array

```typescript
// Add import
import { YourTextModel } from './models/text-generation'

// Add to capabilityClasses array
private static capabilityClasses = [
  // Existing models...
  GPT4Model,
  GPT35TurboModel,
  YourTextModel, // Add your new model here
  // Other models...
]
```

**Step 3: Optional API Adapter**
- **Location**: `src/engine/layers/invocation/models/your-adapter.ts`
- **When needed**: Complex API handling, rate limiting, authentication
- **Action**: Create only if your model needs special API handling

#### For Agents

**Step 1: Create Agent File**
- **Location**: `src/engine/capabilities/agents/your-agent.ts`
- **Action**: Create new file

```typescript
import { BaseCapability } from '../base-capability'

export class YourAgent extends BaseCapability {
  type = 'agent' as const
  capabilities = ['task_execution', 'planning']
  
  async executeTask(task: any): Promise<any> {
    // Agent implementation
    return { result: 'completed', cost: 0.05 }
  }
}
```

**Step 2: Register in Auto-Discovery**
- Same process as models

#### For Tools

**Step 1: Create Tool File**
- **Location**: `src/engine/capabilities/tools/your-tool.ts`

```typescript
export class YourTool extends BaseCapability {
  type = 'tool' as const
  capabilities = ['data_processing', 'file_manipulation']
  
  async execute(input: any): Promise<any> {
    // Tool implementation
    return { output: 'processed', cost: 0.001 }
  }
}
```

#### For Effects

**Step 1: Create Effect File**
- **Location**: `src/engine/capabilities/effects/your-effect.ts`

```typescript
export class YourEffect extends BaseCapability {
  type = 'effect' as const
  capabilities = ['visual_enhancement', 'audio_processing']
  
  async apply(content: any): Promise<any> {
    // Effect implementation
    return { processedContent: content, cost: 0.005 }
  }
}
```

### Complete File Update Checklist

#### ✅ **ALWAYS Update These Files**

1. **Create/Update Model File**
   - **Location**: `src/engine/capabilities/models/your-model-type.ts`
   - **Action**: Create new file OR add class to existing type file
   - **Example**: Add `Claude3Model` to `text-generation.ts`

2. **Update Auto-Discovery**
   - **File**: `src/engine/capabilities/auto-discovery.ts`
   - **Actions**: 
     - Add import statement
     - Add class to `capabilityClasses` array
     - Remove TODO comment

#### 🔧 **CONDITIONALLY Update These Files**

3. **API Adapter (Optional)**
   - **Location**: `src/engine/layers/invocation/models/your-adapter.ts`
   - **When needed**: Complex API handling, rate limiting, authentication
   - **Example**: `openai-adapter.ts` for OpenAI-specific logic

4. **Capability Communicator (Optional)**
   - **File**: `src/engine/layers/interactive-scenario/capability-communicator.ts`
   - **When needed**: Custom user-friendly descriptions
   - **Action**: Add to `translations` object for better UX

#### ❌ **NEVER Update These Files**

5. **Base Architecture Files**
   - `src/engine/capabilities/base-capability.ts` - Base class
   - `src/engine/capabilities/registry.ts` - Storage layer
   - `src/engine/layers/invocation/index.ts` - Generic invocation
   - `src/engine/layers/invocation/unified-invocation.ts` - Auto-discovers
   - `src/engine/layers/invocation/model-invocation.ts` - Legacy system

### Step-by-Step Example: Adding Claude 3

**Step 1: Update/Create Model File**
```typescript
// src/engine/capabilities/models/text-generation.ts
// Add this class to the existing file:

export class Claude3Model extends BaseCapability {
  id = 'anthropic-claude-3'
  name = 'Claude 3 Sonnet'
  // ... implementation
}
```

**Step 2: Update Auto-Discovery**
```typescript
// src/engine/capabilities/auto-discovery.ts

// Add import (line ~6)
import { GPT4Model, GPT35TurboModel, Claude3Model } from './models/text-generation'

// Add to array (line ~18)
private static capabilityClasses = [
  GPT4Model,
  GPT35TurboModel,
  Claude3Model, // Add this line
  // ...
]
```

**Step 3: Test Integration**
```typescript
// Now available automatically
const result = await unifiedInvocation.generateText('Hello Claude!')
```

## Usage Examples

### Basic Usage
```typescript
import { unifiedInvocation } from '../engine/layers/unified-invocation'

// Initialize once (usually in app startup)
await unifiedInvocation.initialize()

// Use specific capability by ID
const result = await unifiedInvocation.invoke('your-model-id', input, {
  maxCost: 0.10,
  qualityLevel: 'high',
  userId: 'user123'
})

// Use convenience methods (auto-selects best model)
const textResult = await unifiedInvocation.generateText(prompt, options)
const imageResult = await unifiedInvocation.generateImage(prompt, options)
const videoResult = await unifiedInvocation.generateVideo(prompt, options)
const voiceResult = await unifiedInvocation.synthesizeVoice(text, options)
```

### Advanced Usage
```typescript
// Get available capabilities
const allCapabilities = await unifiedInvocation.getAvailableCapabilities()
const textModels = await unifiedInvocation.getCapabilitiesByCapability('text_generation')

// Smart selection with preferences
const result = await unifiedInvocation.generateText(prompt, {
  preferredProvider: 'OpenAI',
  qualityLevel: 'balanced', // 'fast' | 'balanced' | 'high'
  maxCost: 0.05,
  userId: 'user123'
})
```

## Real Integration Example

### Adding Claude 3 Model

**1. Create Model File**
```typescript
// src/engine/capabilities/models/text-generation.ts
export class Claude3Model extends BaseCapability {
  id = 'anthropic-claude-3'
  name = 'Claude 3 Sonnet'
  type = 'model' as const
  description = 'Anthropic Claude 3 for advanced text generation'
  version = '1.0.0'
  provider = 'Anthropic'
  capabilities = ['text_generation']
  
  metadata = {
    costPerUse: 0.015,
    averageLatency: 1500,
    qualityScore: 0.95,
    supportedFormats: ['text'],
    limitations: ['100k context limit'],
    examples: ['Write a detailed analysis of...']
  }

  async generateText(prompt: string): Promise<any> {
    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000
      })
    })
    
    const data = await response.json()
    return {
      content: data.content[0].text,
      cost: this.metadata.costPerUse,
      metadata: { tokensUsed: { total: data.usage.output_tokens } }
    }
  }
}
```

**2. Register in Auto-Discovery**
```typescript
// src/engine/capabilities/auto-discovery.ts
import { Claude3Model } from './models/text-generation'

private static capabilityClasses = [
  GPT4Model,
  GPT35TurboModel,
  Claude3Model, // Add this line
  // ... other models
]
```

**3. Use Immediately**
```typescript
// Now available automatically
const result = await unifiedInvocation.generateText('Hello Claude!')
// Will auto-select best model (could be Claude 3 based on quality/cost)
```

## Benefits of This Architecture

- **✅ Zero Configuration** - Auto-discovery eliminates manual setup
- **✅ Consistent Patterns** - BaseCapability ensures all capabilities work the same way
- **✅ Single Entry Point** - UnifiedInvocationLayer handles everything
- **✅ Built-in Cost Tracking** - Automatic billing integration
- **✅ Smart Selection** - Automatically chooses best capability for the task
- **✅ Type Safety** - Full TypeScript support
- **✅ Easy Testing** - Standardized interfaces make testing simple

## Frontend Integration

### Using the Engine in React Components

```typescript
// Import the unified engine system
import { originEngine, unifiedInvocation } from '../engine'

// In your React component
const handleUserMessage = async (message: string, userId: string) => {
  try {
    // Process through the complete engine pipeline
    const response = await originEngine.processUserInput(message, userId)
    
    // Response includes:
    // - Enhanced AI message with capability hints
    // - Dynamic scenarios based on available capabilities
    // - List of available capabilities for UI
    setAiResponse(response.message)
    setAvailableCapabilities(response.availableCapabilities || [])
  } catch (error) {
    console.error('Engine processing failed:', error)
  }
}

// Direct capability usage
const generateImage = async (prompt: string) => {
  const result = await unifiedInvocation.generateImage(prompt, {
    userId: currentUser.id,
    qualityLevel: 'high',
    maxCost: 0.20
  })
  
  if (result.success) {
    setGeneratedImage(result.result.images[0].url)
  }
}
```

### Real Integration Example

The unified engine system is already integrated into `src/components/conversation/ConversationFlow.tsx`. Key integration points:

- **Engine Processing**: Uses `originEngine.processUserInput()` for complete AI pipeline
- **Capability Detection**: Automatically detects image/video requests and invokes appropriate models
- **Enhanced Responses**: Provides capability-aware responses with smart suggestions
- **Cost Tracking**: Built-in usage tracking for billing integration

## Migration from Old System

### Old Way (Still Works)
```typescript
const modelInvocation = new ModelInvocationLayer()
const result = await modelInvocation.generateText(prompt)
```

### New Way (Recommended)
```typescript
// Option 1: Direct capability usage
const result = await unifiedInvocation.generateText(prompt)

// Option 2: Full engine pipeline (recommended for conversations)
const response = await originEngine.processUserInput(userMessage, userId)
```

### What's New

- **🤖 Enhanced AI Responses**: Engine provides capability-aware responses
- **🔍 Auto-Discovery**: No manual model registration needed
- **💡 Smart Suggestions**: Engine suggests relevant capabilities to users
- **📊 Usage Tracking**: Built-in cost tracking and billing integration
- **🎯 Context Awareness**: Responses adapt to user context and available capabilities

Both systems coexist - no breaking changes to existing code!

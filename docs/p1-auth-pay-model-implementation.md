# OriginOS Development Roadmap Implementation Guide - PRIORITY 1 (Auth/Payment/Models)

## Overview

This document outlines the implementation status and next steps for three critical development tasks in OriginOS:

1. **Authentication & Registration** with Auth0
2. **Subscription & Payment** with Stripe  
3. **Model Integration** in the Engine Architecture

## Task 1: Authentication & Registration

### ✅ Completed Components

#### 1.1 Authentication Infrastructure
- **File**: `src/components/auth/AuthProvider.tsx`
- **Purpose**: React context provider for Auth0 integration
- **Status**: ✅ Structure created, needs Auth0 SDK integration
- **Features**:
  - User session management
  - Login/logout functionality
  - Loading states
  - User profile with subscription info

#### 1.2 Mode Selection Interface
- **File**: `src/components/auth/ModeSelector.tsx`
- **Purpose**: Beautiful UI for users to choose interaction mode
- **Status**: ✅ Complete UI implementation
- **Features**:
  - "Chat Mode" vs "Voice Mode" selection
  - Responsive design with animations
  - Theme-aware styling
  - Voice credit display (5 free replies)

### 🔄 Next Steps Required

#### 1.3 Auth0 Integration
```bash
# Install Auth0 SDK
npm install @auth0/nextjs-auth0

# Environment variables needed:
AUTH0_SECRET=your-secret
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

#### 1.4 Integration Points
- **Main App**: Wrap app with `AuthProvider`
- **Landing Page**: Replace "Start Exploration" with Auth0 login
- **Post-Login**: Show `ModeSelector` component
- **Route Protection**: Protect ConversationFlow routes

#### 1.5 Implementation Priority
1. Set up Auth0 tenant and application
2. Install and configure Auth0 SDK
3. Update `AuthProvider.tsx` with real Auth0 calls
4. Integrate `ModeSelector` into main app flow
5. Add route protection middleware

---

## Task 2: Subscription & Payment

### ✅ Completed Components

#### 2.1 Subscription State Management
- **File**: `src/store/useSubscriptionStore.ts`
- **Purpose**: Zustand store for subscription and billing
- **Status**: ✅ Complete implementation
- **Features**:
  - Subscription plans (Free, Pro, Premium)
  - Voice credit tracking
  - Usage limits enforcement
  - Modal state management

#### 2.2 Subscription UI Components
- **File**: `src/components/subscription/SubscriptionCard.tsx`
- **Purpose**: Beautiful subscription plan display cards
- **Status**: ✅ Complete UI implementation
- **Features**:
  - Plan comparison cards
  - Pricing display
  - Feature lists
  - Popular plan highlighting
  - Current plan indicators

### 🔄 Next Steps Required

#### 2.3 Stripe Integration
```bash
# Install Stripe SDK
npm install stripe @stripe/stripe-js

# Environment variables needed:
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### 2.4 Voice Credit System Integration
- **Location**: Update `ConversationFlow.tsx`
- **Logic**: 
  ```typescript
  // Before voice synthesis
  const { canUseVoice, incrementVoiceUsage, setShowUpgradeModal } = useSubscriptionStore()
  
  if (!canUseVoice()) {
    // Show upgrade prompt instead of voice synthesis
    setShowUpgradeModal(true)
    return // Skip voice synthesis, show text only
  }
  
  // After successful voice synthesis
  incrementVoiceUsage()
  ```

#### 2.5 Upgrade/Credit Modals
- **Files to create**:
  - `src/components/subscription/UpgradeModal.tsx`
  - `src/components/subscription/CreditsModal.tsx`
- **Integration**: Show modals in ConversationFlow when limits reached

#### 2.6 Implementation Priority
1. Set up Stripe account and products
2. Create Stripe API routes (`/api/stripe/`)
3. Implement upgrade/credit modals
4. Integrate voice credit checking in ConversationFlow
5. Add webhook handling for subscription updates

---

## Task 3: Model Integration

### ✅ Completed Components

#### 3.1 Model Implementations
- **Files**: 
  - `src/engine/capabilities/models/image-generation.ts`
  - `src/engine/capabilities/models/video-generation.ts`
- **Purpose**: Individual model classes with pricing and capabilities
- **Status**: ✅ Complete structure, needs API integration
- **Models Implemented**:
  - **Image**: DALL-E 3 ($0.08), Midjourney v6 ($0.12)
  - **Video**: Runway Gen-3 ($2.50), Pika Labs ($1.50)

#### 3.2 Invocation Layer
- **File**: `src/engine/layers/invocation/model-invocation.ts`
- **Purpose**: Smart model selection and execution orchestration
- **Status**: ✅ Complete architecture
- **Features**:
  - Automatic model selection (fast/balanced/high quality)
  - Cost constraint checking
  - Usage tracking integration
  - Error handling and fallbacks

#### 3.3 ISL Communication
- **File**: `src/engine/layers/interactive-scenario/capability-communicator.ts`
- **Purpose**: Bridge between conversation layer and model capabilities
- **Status**: ✅ Complete implementation
- **Features**:
  - User-friendly capability descriptions
  - Relevance-based capability proposals
  - Scenario generation based on available models
  - Cost transparency

#### 3.4 Usage Tracking & Billing
- **File**: `src/services/billing/usage-tracker.ts`
- **Purpose**: Comprehensive usage tracking for billing
- **Status**: ✅ Complete implementation
- **Features**:
  - Per-model cost tracking
  - Credit conversion (1 credit = $0.01)
  - Usage summaries and reports
  - Affordability checking

### 🔄 Next Steps Required

#### 3.5 API Integration
Each model needs actual API integration:

```typescript
// Example for DALL-E 3
private async callDallE3API(prompt: string, options: ImageGenerationOptions) {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      size: options.size || '1024x1024',
      quality: options.quality || 'standard',
      n: options.n || 1
    })
  })
  
  return await response.json()
}
```

#### 3.6 ConversationFlow Integration
- **Location**: Update `ConversationFlow.tsx`
- **Integration Points**:
  ```typescript
  import { ModelInvocationLayer } from '@/engine/layers/invocation/model-invocation'
  import { CapabilityCommunicator } from '@/engine/layers/interactive-scenario/capability-communicator'
  
  // In component
  const invocationLayer = new ModelInvocationLayer()
  const capabilityCommunicator = new CapabilityCommunicator()
  
  // When user requests image
  const result = await invocationLayer.generateImage(userPrompt)
  if (result.success) {
    addMessage({
      type: 'one',
      content: 'Here\'s your generated image:',
      contentType: 'image',
      contentData: result.result
    })
  }
  ```

#### 3.7 Content Rendering System
- **Files to create**:
  - `src/components/conversation/content/ImageContent.tsx`
  - `src/components/conversation/content/VideoContent.tsx`
- **Purpose**: Render generated content in conversation

#### 3.8 Implementation Priority
1. Set up API keys for all model providers
2. Implement actual API calls in model classes
3. Create content rendering components
4. Integrate model invocation in ConversationFlow
5. Add capability-aware scenario suggestions
6. Connect usage tracking to billing system

---

## Architecture Overview

### Directory Structure
```
src/
├── components/
│   ├── auth/                          # Authentication components
│   │   ├── AuthProvider.tsx           # ✅ Auth0 context provider
│   │   └── ModeSelector.tsx           # ✅ Mode selection UI
│   ├── subscription/                  # Subscription components
│   │   └── SubscriptionCard.tsx       # ✅ Subscription plan cards
│   └── conversation/
│       ├── ConversationFlow.tsx       # 🔄 Needs integration updates
│       └── content/                   # 🔄 To be created
│           ├── ImageContent.tsx       # 🔄 Image rendering
│           └── VideoContent.tsx       # 🔄 Video rendering
├── engine/
│   ├── capabilities/
│   │   ├── models/                    # Model implementations
│   │   │   ├── image-generation.ts    # ✅ DALL-E 3, Midjourney
│   │   │   └── video-generation.ts    # ✅ Runway, Pika Labs
│   │   └── registry.ts                # ✅ Existing capability registry
│   └── layers/
│       ├── invocation/
│       │   └── model-invocation.ts    # ✅ Model orchestration
│       └── interactive-scenario/
│           └── capability-communicator.ts # ✅ ISL communication
├── services/
│   └── billing/
│       └── usage-tracker.ts           # ✅ Usage tracking
└── store/
    └── useSubscriptionStore.ts        # ✅ Subscription state
```

### Data Flow
```
User Input → ConversationFlow → CapabilityCommunicator → ModelInvocationLayer → Model APIs
                ↓                                                                    ↓
         Content Rendering ← Usage Tracking ← Cost Calculation ← API Response
```

---

## Integration Checklist

### Phase 1: Authentication (Week 1)
- [ ] Set up Auth0 tenant
- [ ] Install Auth0 SDK
- [ ] Implement AuthProvider with real Auth0
- [ ] Add ModeSelector to post-login flow
- [ ] Add route protection

### Phase 2: Subscription (Week 2)
- [ ] Set up Stripe account and products
- [ ] Create Stripe API routes
- [ ] Build upgrade/credit modals
- [ ] Integrate voice credit checking
- [ ] Add webhook handling

### Phase 3: Model Integration (Week 3-4)
- [ ] Set up all model API keys
- [ ] Implement actual API calls
- [ ] Create content rendering components
- [ ] Integrate models in ConversationFlow
- [ ] Add capability-aware scenarios
- [ ] Connect usage tracking to billing

### Phase 4: Testing & Polish (Week 5)
- [ ] End-to-end testing
- [ ] Error handling refinement
- [ ] Performance optimization
- [ ] User experience polish

---

## Environment Variables Required

```bash
# Auth0
AUTH0_SECRET=
AUTH0_BASE_URL=
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Stripe
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Model APIs
OPENAI_API_KEY=
MIDJOURNEY_API_KEY=
RUNWAY_API_KEY=
PIKA_LABS_API_KEY=
ELEVENLABS_API_KEY=
```

---

## Notes

- **Existing ConversationFlow**: All integrations are designed to work with the existing 2000-line ConversationFlow.tsx without major refactoring
- **Incremental Implementation**: Each task can be implemented independently
- **Cost Tracking**: Every model call is tracked for billing purposes
- **User Experience**: Focus on seamless integration without disrupting existing functionality
- **Scalability**: Architecture supports adding new models and capabilities easily

This implementation maintains the working voice mode functionality while adding powerful new capabilities through a modular, well-architected approach.

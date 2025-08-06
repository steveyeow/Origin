# OriginOS - Real-Time Generative Content Engine

**OriginOS** is a revolutionary real-time generative content engine that enables ordinary users to create high-quality multimodal content through zero-prompt UX and proactive recommendation mechanisms.

## 🎯 Core Mission

Build a **real-time generative content engine** that enables ordinary users (non-professional creators) to easily create high-quality multimodal content through **zero-prompt UX** and **proactive recommendation mechanisms**.

## ✨ Key Features

- **🚀 Propose > Prompt**: System proactively suggests scenarios rather than requiring users to write prompts
- **👥 Built for Everyone**: Targeting mainstream users, not professional creators
- **🔧 Build Engine, Not Models**: Focus on orchestration and scheduling, not model development
- **🌌 Real-time Generative Universe**: Dynamic, personalized, continuously evolving content generation experience
- **🔌 Open Platform Ecosystem**: Support developers contributing models, agents, tools to form capability ecosystem

## 🏗️ Architecture Overview

OriginOS is built on a sophisticated **8-layer engine architecture** designed for scalability and extensibility:

```
User Interaction → ISL → IRL → Planning → MIL/AIL → Execution → Output → Iteration → ISL
                   ↑                    ↑        ↑
               Context Memory      Open Platform   Capability Registry
```

### Core Engine Layers

1. **Interactive Scenario Layer (ISL)** - Proactive scenario recommendation and user guidance
2. **Intention Reasoning Layer (IRL)** - Natural language understanding and intent structuring
3. **Planning Layer** - Task decomposition and resource matching
4. **Model Invocation Layer (MIL)** - Dynamic model management and invocation
5. **Agent Invocation Layer (AIL)** - Agent orchestration and tool execution
6. **Execution Layer** - Task execution and coordination
7. **Output Layer** - Result formatting and presentation
8. **Iteration Layer** - Next-step generation and continuous engagement

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **3D Graphics**: Three.js, React Three Fiber
- **State Management**: Zustand
- **Icons**: Lucide React
- **Development**: Turbopack, ESLint

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/OriginOS.git
cd OriginOS
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📁 Project Structure

```
src/
├── app/                     # Next.js App Router
├── components/              # UI Components
│   ├── landing/            # Landing page components
│   ├── conversation/       # Chat/Dialog components
│   ├── common/            # Shared UI components
│   └── layouts/           # Layout components
├── engine/                 # 🎯 CORE ENGINE
│   ├── layers/            # Engine layer implementations
│   │   ├── interactive-scenario/  # ISL implementation
│   │   ├── intention-reasoning/   # IRL implementation
│   │   ├── planning/             # Planning Layer
│   │   ├── invocation/           # Model/Agent invocation
│   │   ├── execution/            # Execution Layer
│   │   ├── output/               # Output Layer
│   │   └── iteration/            # Iteration Layer
│   ├── memory/            # Context & Memory Management
│   ├── capabilities/      # Dynamic Capability System
│   ├── core/             # Core engine interfaces
│   └── types.ts          # Engine type definitions
├── services/              # External Service Integration
├── hooks/                 # Custom React Hooks
├── store/                 # State Management
├── types/                 # TypeScript Definitions
└── utils/                 # Utility Functions
```

## 🔄 Development Phases

### Phase 1: MVP (Current)
- ✅ Core engine foundation
- ✅ Basic UI components with 3D elements
- ✅ Simple scenario selection
- ✅ Session-only memory
- 🔄 Basic conversation flow

### Phase 2: Enhanced Intelligence
- 🔄 LLM-powered scenario generation
- 🔄 Structured intent processing
- 🔄 Long-term memory and preferences
- 🔄 Basic capability recommendation

### Phase 3: Open Platform
- 🔄 Developer capability submissions
- 🔄 Dynamic capability registration
- 🔄 Revenue sharing system
- 🔄 Advanced personalization

### Phase 4: Full Engine
- 🔄 Real-time capability recommendation
- 🔄 Advanced context understanding
- 🔄 Multi-modal content generation
- 🔄 Enterprise features

## 📚 Documentation

- [Engine Architecture](./docs/engine-architecture.md) - Detailed technical architecture
- [MVP Scalable Architecture](./docs/mvp-scalable-architecture.md) - Evolution-ready design strategy

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for more details.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🌟 Vision

OriginOS aims to democratize content creation by making sophisticated generative AI accessible to everyone through intuitive, proactive user experiences. We're building not just another AI tool, but a comprehensive ecosystem that evolves with user needs and community contributions.

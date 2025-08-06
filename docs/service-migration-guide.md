# Service Migration Guide: From Services to Engine Architecture

## 问题背景

目前 OriginOS 中存在两套并行的模型集成方式：

1. **现有服务层** (`src/services/`): 
   - `OpenAIService` - 用于文本生成和AI驱动功能
   - `ElevenLabsService` - 用于语音合成

2. **新引擎架构** (`src/engine/`):
   - 统一的能力注册和调用系统
   - 成本跟踪和计费集成
   - 智能模型选择

## 迁移策略：渐进式包装方案

### ✅ 已完成的工作

#### 1. 创建引擎包装层
- **文本生成**: `src/engine/capabilities/models/text-generation.ts`
  - `GPT4Model` - 包装现有的 `OpenAIService`
  - `GPT35TurboModel` - 提供更便宜的替代方案
  
- **语音合成**: `src/engine/capabilities/models/voice-synthesis.ts`
  - `ElevenLabsVoiceModel` - 包装现有的 `ElevenLabsService`
  - `BrowserSpeechModel` - 提供免费的浏览器语音合成

#### 2. 统一调用接口
- **ModelInvocationLayer**: 提供统一的模型调用接口
  - `generateText()` - 智能文本生成
  - `synthesizeVoice()` - 智能语音合成
  - `generateImage()` - 图像生成
  - `generateVideo()` - 视频生成

#### 3. 成本跟踪集成
- 所有模型调用都会自动跟踪成本
- 与订阅系统集成
- 支持预算限制

## 架构对比

### 现有架构 (保持不变)
```typescript
// ConversationFlow.tsx 中的现有调用
import { OpenAIService } from '@/services/llm/openai-service'
import { ElevenLabsService } from '@/services/voice/elevenlabs-service'

const llmService = new OpenAIService()
const voiceService = new ElevenLabsService(config)

// 直接调用服务
const response = await llmService.generateContextualResponse(context)
const audio = await voiceService.synthesizeText(text)
```

### 新引擎架构 (可选使用)
```typescript
// 使用新的统一接口
import { ModelInvocationLayer } from '@/engine/layers/invocation/model-invocation'

const invocationLayer = new ModelInvocationLayer()

// 智能模型选择和成本跟踪
const textResult = await invocationLayer.generateText(prompt, {
  qualityLevel: 'high',
  maxCost: 0.10
})

const voiceResult = await invocationLayer.synthesizeVoice(text, {
  qualityLevel: 'balanced'
})
```

## 迁移路径

### 阶段 1: 并行运行 (当前状态)
- ✅ 现有服务继续正常工作
- ✅ 新引擎架构可用于新功能
- ✅ 无破坏性变更

### 阶段 2: 逐步迁移 (可选)
```typescript
// 在 ConversationFlow.tsx 中可以选择性使用新接口

// 现有方式 (继续工作)
const response = await llmService.generateContextualResponse(context)

// 新方式 (可选，带成本跟踪)
const result = await invocationLayer.generateText(userInput, {
  maxCost: userCredits * 0.01 // 基于用户积分限制成本
})

if (result.success) {
  // 自动扣除积分
  await usageTracker.trackUsage(
    userId, 
    result.metadata.model, 
    'text', 
    result.cost
  )
}
```

### 阶段 3: 完全迁移 (未来)
- 逐步替换所有直接服务调用
- 统一通过引擎架构调用
- 移除重复的服务层代码

## 具体集成示例

### 1. 在 ConversationFlow 中集成语音合成

```typescript
// 现有代码 (保持不变)
const synthesizeVoice = async (text: string) => {
  if (voiceService) {
    try {
      const audioBuffer = await voiceService.synthesizeText(text)
      // 播放音频...
    } catch (error) {
      console.error('Voice synthesis failed:', error)
    }
  }
}

// 新的可选实现 (带成本跟踪)
const synthesizeVoiceWithTracking = async (text: string) => {
  try {
    const result = await invocationLayer.synthesizeVoice(text, {
      qualityLevel: canUseVoice() ? 'high' : 'fast'
    })
    
    if (result.success) {
      // 扣除语音积分
      incrementVoiceUsage()
      
      // 跟踪使用情况
      await usageTracker.trackUsage(
        userId,
        result.metadata.model,
        'voice',
        result.cost,
        { characterCount: text.length }
      )
      
      // 播放音频
      const audioUrl = result.result.audioUrl
      // 播放逻辑...
    } else {
      // 回退到文本显示
      console.log('Voice synthesis failed, showing text only')
    }
  } catch (error) {
    // 回退到现有服务
    return synthesizeVoice(text)
  }
}
```

### 2. 智能模型选择

```typescript
// 根据用户订阅状态选择模型
const generateResponse = async (prompt: string) => {
  const options = {
    qualityLevel: userSubscription?.plan === 'premium' ? 'high' : 'balanced',
    maxCost: userSubscription?.plan === 'free' ? 0.05 : 0.20
  }
  
  const result = await invocationLayer.generateText(prompt, options)
  
  if (result.success) {
    return result.result.text
  } else {
    // 回退到现有服务
    return await llmService.generateContextualResponse(context)
  }
}
```

## 优势

### 1. 无破坏性迁移
- 现有代码继续工作
- 可以逐步采用新功能
- 降低迁移风险

### 2. 统一的成本管理
- 所有模型调用都有成本跟踪
- 与订阅系统集成
- 支持预算控制

### 3. 智能模型选择
- 根据质量需求自动选择模型
- 成本优化
- 性能优化

### 4. 扩展性
- 易于添加新模型
- 统一的接口
- 模块化架构

## 实施建议

### 立即可做的事情
1. **保持现有代码不变** - 确保现有功能继续工作
2. **在新功能中使用引擎架构** - 图像生成、视频生成等
3. **逐步集成成本跟踪** - 在关键调用点添加使用跟踪

### 未来考虑的事情
1. **性能对比测试** - 比较两种方式的性能
2. **用户体验测试** - 确保新架构不影响用户体验
3. **逐步迁移计划** - 制定详细的迁移时间表

## 环境变量

两套系统可以共享相同的环境变量：

```bash
# OpenAI (两套系统都使用)
OPENAI_API_KEY=sk-...

# ElevenLabs (两套系统都使用)
NEXT_PUBLIC_ELEVENLABS_API_KEY=...
NEXT_PUBLIC_ELEVENLABS_VOICE_ID=...

# 新模型的API密钥
MIDJOURNEY_API_KEY=...
RUNWAY_API_KEY=...
PIKA_LABS_API_KEY=...
```

## 总结

这种渐进式包装方案的优势：

1. **零风险** - 现有功能不受影响
2. **渐进式** - 可以逐步采用新功能
3. **统一管理** - 所有模型调用都有统一的成本跟踪
4. **向前兼容** - 为未来的完全迁移做好准备

现在你可以：
- 继续使用现有的 `OpenAIService` 和 `ElevenLabsService`
- 在新功能中使用 `ModelInvocationLayer`
- 逐步添加成本跟踪和智能模型选择
- 根据需要决定是否进行完全迁移

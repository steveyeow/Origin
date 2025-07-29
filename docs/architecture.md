# OriginX Architecture

## 项目概述

OriginX 是一个实时生成式内容宇宙平台，采用 monorepo 架构，支持 Web 和移动端。

## 核心架构原则

- **模块化设计**：清晰的包分离和职责划分
- **类型安全**：全面的 TypeScript 支持
- **平台无关**：UI 组件和业务逻辑跨平台复用
- **性能优先**：代码分割、懒加载、优化渲染

## 技术栈

### 前端
- **Web**: Next.js 14 (App Router)
- **Mobile**: React Native + Expo
- **UI**: React 18, Framer Motion, Tailwind CSS
- **状态管理**: Zustand, React Query

### 后端
- **API**: NestJS
- **数据库**: PostgreSQL + Prisma
- **认证**: Auth0
- **支付**: Stripe

## 项目结构

```
OriginX/
├── apps/
│   ├── web/                 # Next.js Web 应用
│   ├── mobile/              # React Native 应用
│   └── api/                 # NestJS API 服务
├── packages/
│   ├── ui/                  # 共享 UI 组件库
│   ├── core/                # 核心业务逻辑
│   ├── api-client/          # API 客户端
│   └── shared-types/        # 共享类型定义
└── tools/                   # 构建工具和配置
```

## UI 包架构

```
packages/ui/src/
├── components/              # 功能分类组件
│   ├── backgrounds/        # 背景效果
│   ├── chat/              # 聊天功能
│   ├── common/            # 通用组件
│   ├── dialogs/           # 对话框
│   ├── cards/             # 卡片展示
│   └── landing/           # 着陆页
├── design-system/          # 设计系统
│   ├── tokens/            # 设计令牌
│   ├── themes/            # 主题定义
│   └── animations/        # 动画系统
├── hooks/                 # UI Hooks
└── utils/                 # 工具函数
```

## 核心功能模块

### 1. 用户引导流程
- 深空背景 + 动态光效
- 对话式命名流程
- 智能场景推荐
- 非侵入式注册

### 2. 交互场景层
- 8种场景类型
- 时间感知推荐
- 个性化内容生成
- 上下文记忆

### 3. 实时内容生成
- 流式内容输出
- 多模态支持
- 异步处理管道
- 性能监控

## 开发规范

### 命名约定
- **组件**: PascalCase (`PulsingOrb.tsx`)
- **文件**: camelCase (`scenarios.ts`)
- **目录**: 小写复数 (`components/`, `hooks/`)

### 导入顺序
```typescript
// 1. React/框架
import React from 'react';

// 2. 第三方库
import { motion } from 'framer-motion';

// 3. 内部包
import { Button } from '@originx/ui';

// 4. 相对导入
import { styles } from './styles';
```

### TypeScript 规范
- 严格模式启用
- 明确类型定义
- 避免 `any` 类型
- 利用泛型提高复用性

## 部署架构

### 开发环境
- 本地开发服务器
- 热重载支持
- 类型检查集成

### 生产环境
- Vercel (Web)
- Expo Application Services (Mobile)
- Railway/Render (API)

## 性能考虑

- **代码分割**: 路由级别和组件级别
- **懒加载**: 非关键组件延迟加载
- **缓存策略**: API 响应和静态资源缓存
- **优化渲染**: React.memo 和 useMemo 使用

## 安全措施

- JWT 认证授权
- API 请求验证
- XSS/CSRF 防护
- 敏感数据加密

---

*本文档保持简洁实用，详细实现请参考代码注释和 README 文件。*

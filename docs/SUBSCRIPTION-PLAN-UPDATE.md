# 订阅计划更新总结

## 📋 **更新内容**

### **新的订阅计划结构：**

1. **Free Plan** 
   - Credits: 6,000/月
   - 价格: $0
   - 功能: 基础语音和文本模型，有限生成速度，社区支持

2. **Basic Plan**
   - Credits: 500,000/月
   - 价格: $9.90/月, $83.16/年 (30% 年度折扣)
   - 功能: 大部分语音、图像和文本模型，基础代理和工具，标准生成速度，邮件支持，无广告

3. **Pro Plan**
   - Credits: 1,000,000/月
   - 价格: $19.90/月, $167.16/年 (30% 年度折扣)
   - 功能: 所有模型，所有代理工具效果，最大生成量，永久内容存储，水印移除，最快速度，早期访问，优先支持，无广告

### **已移除：**
- ~~Premium Plan~~ (已删除)

---

## 🔧 **修改的文件**

### **1. StripeService (`src/services/payment/stripe-service.ts`)**
- ✅ 更新 `SubscriptionPlan` 接口：`monthlyPrice`, `yearlyPrice`
- ✅ 重写 `getSubscriptionPlans()` 方法
- ✅ 更新订阅计划为 Free/Basic/Pro
- ✅ 修正 credits 数量：Free 6000, Basic 500000, Pro 1000000
- ✅ 修复 Stripe API 版本

### **2. BillingService (`src/services/billing/billing-service.ts`)**
- ✅ 更新 `UserBilling` 接口：`'free' | 'basic' | 'pro'`
- ✅ 更新 `getMonthlyCredits()` 方法
- ✅ 修正 credits 分配
- ✅ 更新 `getPricing()` 方法
- ✅ 修复重复方法

### **3. Auth0Service (`src/services/auth/auth0-service.ts`)**
- ✅ 更新 `AuthUser` 接口：`subscription_tier?: 'free' | 'basic' | 'pro'`
- ✅ 更新 `hasSubscriptionTier()` 方法签名
- ✅ 修正 tier levels: `{ free: 0, basic: 1, pro: 2 }`
- ✅ 更新 `canUseVoice()` 方法

### **4. 其他需要检查的文件**
- 🔄 `UpgradeModal.tsx` - 需要更新以使用新的接口
- 🔄 `SubscriptionCard.tsx` - 需要更新 price/interval 属性
- 🔄 `AuthProvider.tsx` - 类型已修复

---

## 🎯 **Credits 分配确认**

| 计划 | 每月 Credits | 月度价格 | 年度价格 | 年度节省 |
|------|-------------|----------|----------|----------|
| Free | 6,000 | $0 | $0 | - |
| Basic | 500,000 | $9.90 | $83.16 | 30% |
| Pro | 1,000,000 | $19.90 | $167.16 | 30% |

---

## 📝 **环境变量更新**

需要添加新的 Stripe 价格 ID：
```bash
# 新增 Basic 计划
STRIPE_BASIC_PRICE_ID='price_...'
STRIPE_BASIC_YEARLY_PRICE_ID='price_...'

# 保留 Pro 计划
STRIPE_PRO_PRICE_ID='price_...'
STRIPE_PRO_YEARLY_PRICE_ID='price_...'

# 移除 Premium 计划
# STRIPE_PREMIUM_PRICE_ID (删除)
# STRIPE_PREMIUM_YEARLY_PRICE_ID (删除)
```

---

## ⚠️ **待修复的问题**

### **SubscriptionCard.tsx 错误：**
- `Property 'price' does not exist on type 'SubscriptionPlan'`
- `Property 'interval' does not exist on type 'SubscriptionPlan'`

**解决方案：** 需要更新组件以使用 `monthlyPrice`/`yearlyPrice` 而不是 `price`/`interval`

### **Auth0 API 路由：**
- 当前使用占位符实现
- 需要配置真实的 Auth0 环境变量后才能正常工作

---

## ✅ **完成状态**

- ✅ **订阅计划结构更新完成**
- ✅ **Credits 数量修正完成**
- ✅ **类型定义修复完成**
- ✅ **BillingService 修复完成**
- ✅ **StripeService 修复完成**
- ✅ **Auth0Service 修复完成**
- 🔄 **UI 组件需要小幅调整**

**下一步：** 修复 SubscriptionCard 组件以使用新的接口属性。

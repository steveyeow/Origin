#!/bin/bash
# 清理开发环境脚本

echo "🧹 Cleaning development environment..."

# 删除构建缓存
rm -rf .next
echo "✅ Removed .next directory"

# 删除 node_modules
rm -rf node_modules
echo "✅ Removed node_modules"

# 删除 package-lock.json
rm -f package-lock.json
echo "✅ Removed package-lock.json"

# 重新安装依赖
echo "📦 Reinstalling dependencies..."
npm install

echo "🚀 Ready to start development server with: npm run dev"

#!/bin/bash

echo "🔄 重启开发环境..."

# 清理缓存
echo "🧹 清理缓存..."
rm -rf node_modules/.cache
rm -rf dist
rm -rf .hbuilderx

# 重新安装依赖（可选）
echo "📦 检查依赖..."
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 启动开发服务器
echo "🚀 启动微信小程序开发模式..."
npm run dev:mp-weixin

echo "✅ 开发环境已重启！"
echo "📝 请在微信开发者工具中："
echo "   1. 点击 '详情' -> '本地设置'"
echo "   2. 勾选 '不校验合法域名、web-view(业务域名)、TLS 版本以及 HTTPS 证书'"
echo "   3. 勾选 '不校验小程序域名，仅在调试时生效'"

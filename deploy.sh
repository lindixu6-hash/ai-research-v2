#!/bin/bash
# 一键部署脚本

echo "=== 开始部署 ==="

# 1. 构建前端
echo "📦 构建前端..."
cd frontend && npm run build && cd ..

# 2. 上传到服务器
echo "📤 上传到服务器..."
rsync -avz --delete frontend/dist/ root@47.86.191.93:/root/ai-search-frontend/
rsync -avz --exclude 'node_modules' --exclude 'logs' backend/src/ root@47.86.191.93:/root/ai-search-backend/src/

# 3. 重启服务
echo "🔄 重启服务..."
ssh root@47.86.191.93 "cd /root/ai-search-backend && pm2 restart ai-search"

echo "✅ 部署完成！"
echo "🌐 访问: http://47.86.191.93/"

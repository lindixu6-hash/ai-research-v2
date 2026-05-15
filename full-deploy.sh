#!/bin/bash
# 完整部署脚本：Git + 服务器

echo "=== 1. 推送到 GitHub ==="
git add -A
git commit -m "update: $(date '+%Y-%m-%d %H:%M')" || echo "没有新变更"
git push

echo ""
echo "=== 2. 构建前端 ==="
cd /Users/xulindi/Desktop/ai-search-project/frontend && npm run build && cd ..

echo ""
echo "=== 3. 部署到服务器 ==="
rsync -avz --delete frontend/dist/ root@47.86.191.93:/root/ai-search-frontend/
rsync -avz --exclude 'node_modules' --exclude 'logs' backend/src/ root@47.86.191.93:/root/ai-search-backend/src/

echo ""
echo "=== 4. 重启服务 ==="
ssh root@47.86.191.93 "pm2 restart ai-search"

echo ""
echo "✅ 完成！访问 http://47.86.191.93/"

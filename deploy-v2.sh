#!/bin/bash
# 部署优化版代码到服务器

SERVER="root@47.86.191.93"
PROJECT_DIR="/root/ai-search-backend"
SERVICES_DIR="services"

echo "========================================"
echo "  部署优化版 AI 搜索"
echo "========================================"
echo ""

# 1. 确保服务器目录存在
echo "步骤 1: 检查服务器目录..."
ssh $SERVER "mkdir -p $PROJECT_DIR/$SERVICES_DIR"
echo "✓ 目录检查完成"
echo ""

# 2. 上传新的服务文件
echo "步骤 2: 上传优化组件..."
scp $SERVICES_DIR/*.js $SERVER:$PROJECT_DIR/$SERVICES_DIR/
echo "✓ 服务文件上传完成"
echo ""

# 3. 上传新的后端文件
echo "步骤 3: 上传后端文件..."
scp backend/src/services/workflowServiceV2.js $SERVER:$PROJECT_DIR/src/services/
scp backend/src/routes/searchV2.js $SERVER:$PROJECT_DIR/src/routes/
scp backend/src/app.js $SERVER:$PROJECT_DIR/src/
echo "✓ 后端文件上传完成"
echo ""

# 4. 在服务器上安装依赖
echo "步骤 4: 检查依赖..."
ssh $SERVER "cd $PROJECT_DIR && npm list express cors 2>/dev/null | grep -q express || npm install"
echo "✓ 依赖检查完成"
echo ""

# 5. 备份现有服务
echo "步骤 5: 备份现有服务..."
ssh $SERVER "cd $PROJECT_DIR && pm2 list | grep -q ai-search && pm2 save || echo '首次部署'"
echo "✓ 备份完成"
echo ""

# 6. 重启服务
echo "步骤 6: 重启服务..."
ssh $SERVER << 'ENDSSH'
cd /root/ai-search-backend

# 停止现有服务
pm2 stop ai-search 2>/dev/null || echo "服务未运行"

# 等待停止
sleep 2

# 启动服务
pm2 start src/app.js --name ai-search

# 保存 PM2 配置
pm2 save

# 显示状态
pm2 list
ENDSSH

echo "✓ 服务重启完成"
echo ""

# 7. 测试新接口
echo "步骤 7: 测试新接口..."
sleep 3
echo "测试健康检查..."
curl -s http://47.86.191.93:3000/health | head -5
echo ""
echo "测试优化版搜索..."
curl -s -X POST http://47.86.191.93:3000/api/search/v2 \
  -H "Content-Type: application/json" \
  -d '{"query":"测试"}' | head -10
echo ""

echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "服务地址:"
echo "  - HTTP:  http://47.86.191.93:3000"
echo "  - HTTPS: https://47.86.191.93"
echo ""
echo "新接口:"
echo "  - POST /api/search/v2"
echo "  - GET  /api/search/history"
echo "  - GET  /api/search/stats"
echo ""

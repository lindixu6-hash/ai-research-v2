# 部署测试指南

## 当前状态

- ✅ 后端已部署：http://47.86.191.93:3000
- ✅ 后端健康检查：`curl http://47.86.191.93:3000/health`
- ✅ 后端 API 测试：流式接口工作正常
- ⏳ 前端 Vercel 部署中...

## 测试步骤

### 1. 测试后端 API（本地执行）

```bash
# 健康检查
curl http://47.86.191.93:3000/health

# 流式 API 测试
curl -X POST http://47.86.191.93:3000/api/search/stream \
  -H "Content-Type: application/json" \
  -d '{"query":"Python编程"}'
```

### 2. 更新服务器后端代码

连接到服务器：
```bash
ssh root@47.86.191.93
```

更新代码：
```bash
cd /root/ai-search-project/backend
git pull
npm install
pm2 restart ai-search-backend
pm2 logs ai-search-backend
```

### 3. 检查 Vercel 部署

访问：https://ai-search-project.vercel.app

打开浏览器开发者工具（F12），查看：
- Console 是否有错误
- Network 标签查看请求是否发送到正确的地址（应该是 http://47.86.191.93:3000）

### 4. 验证前端代码

在浏览器 Console 执行：
```javascript
console.log('当前页面域名:', window.location.origin);
```

## 常见问题

**问题：网络请求失败**
- 检查 Network 标签，确认请求地址是 `http://47.86.191.93:3000/api/search/stream`
- 如果地址不对，说明 Vercel 部署了旧版本

**问题：CORS 错误**
- 确保后端代码已更新到最新版本
- 重启后端服务

## 联系方式

如有问题，请提供：
1. 浏览器 Console 截图
2. Network 标签截图
3. 后端日志：`pm2 logs ai-search-backend`

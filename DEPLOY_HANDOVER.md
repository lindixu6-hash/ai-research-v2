# AI 搜索引擎部署问题交接文档

## 项目概述

- **项目名称**：AI 搜索引擎 (ai-research-v2)
- **GitHub 仓库**：https://github.com/lindixu6-hash/ai-research-v2
- **前端**：React 18 + Vite 5，部署在 Vercel
- **后端**：Node.js + Express，部署在阿里云 ECS (47.86.191.93:3000)

---

## 当前状态

### ✅ 已完成

1. **后端部署成功**
   - 地址：http://47.86.191.93:3000
   - 健康检查正常：`curl http://47.86.191.93:3000/health`
   - 流式 API 正常工作

2. **后端 HTTPS 配置**
   - 已安装 nginx
   - 已生成自签名 SSL 证书
   - HTTPS 地址：https://47.86.191.93
   - 测试：`curl -k https://47.86.191.93/health` ✅

3. **前端代码修复**
   - `frontend/src/hooks/useStreamSearch.js` 中 `API_BASE` 已设置为 `https://47.86.191.93`
   - `frontend/src/version.js` 已创建，包含 `API_URL = 'https://47.86.191.93'`

4. **Vercel 部署**
   - 已通过 Vercel CLI 部署多次
   - 最新构建文件：`index-Bu8oYL-p.js`
   - 部署地址：https://ai-search-project.vercel.app

### ❌ 存在的问题

**前端无法连接后端，浏览器报错：`Failed to fetch`**

---

## 问题分析

### 症状

1. 用户访问 https://ai-search-project.vercel.app
2. 输入搜索内容
3. 浏览器 Console 报错：`TypeError: Failed to fetch`
4. Network 标签可能显示：
   - 请求根本没有发出
   - 或者请求到了错误的地址

### 已排除的原因

1. ❌ 不是后端问题（后端 HTTP 和 HTTPS 都正常）
2. ❌ 不是 CORS 问题（测试通过）
3. ❌ 不是代码问题（本地构建包含正确的后端地址）

### 可能的原因

1. **Vite 构建问题**：`version.js` 可能没有被正确打包
2. **浏览器缓存**：用户浏览器缓存了旧版本
3. **Vercel 边缘缓存**：Vercel CDN 缓存了旧版本
4. **自签名证书**：浏览器可能拒绝自签名证书的请求

---

## 项目结构

```
ai-search-project/
├── backend/              # 后端代码
│   ├── src/
│   │   ├── app.js       # Express 入口（监听 0.0.0.0:3000）
│   │   ├── routes/      # API 路由
│   │   └── services/    # 业务逻辑
│   └── .env             # 环境变量
├── frontend/            # 前端代码
│   ├── src/
│   │   ├── hooks/
│   │   │   └── useStreamSearch.js  # 搜索 Hook（API_BASE 在这里）
│   │   ├── utils/
│   │   │   └── api.js              # API 封装
│   │   └── version.js             # 版本和配置
│   ├── dist/           # 构建输出
│   └── package.json
├── vercel.json         # Vercel 配置
└── README.md
```

---

## 关键配置

### 后端 (47.86.191.93)

- **端口**：3000 (HTTP), 443 (HTTPS via nginx)
- **nginx 配置**：`/etc/nginx/sites-available/ai-search`
- **SSL 证书**：`/etc/ssl/certs/ai-search.crt`
- **进程管理**：直接运行 `node src/app.js`（未使用 PM2）

### 前端 (Vercel)

- **构建命令**：`cd frontend && npm install && npm run build`
- **输出目录**：`frontend/dist`
- **环境变量**：无（硬编码 API 地址）

---

## 已尝试的解决方案

### 1. 修改 API_BASE 为 HTTPS 地址
```javascript
// frontend/src/hooks/useStreamSearch.js
const API_BASE = 'https://47.86.191.93';
```
❌ 无效

### 2. 创建 version.js 导出 API_URL
```javascript
// frontend/src/version.js
export const API_URL = 'https://47.86.191.93';
```
❌ 无效

### 3. 使用 Vercel CLI 强制重新部署
```bash
cd frontend && vercel --prod --force
```
❌ 无效

### 4. 配置后端 HTTPS（nginx + 自签名证书）
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/ai-search.key \
  -out /etc/ssl/certs/ai-search.crt
```
✅ 后端 HTTPS 正常，但前端仍无法连接

### 5. 使用 Cloudflare Tunnel 代理
```bash
cloudflared tunnel --url http://localhost:3000
```
✅ 代理正常，但不是长期方案

---

## 需要检查的关键点

### 1. 浏览器 Network 标签

让用户查看：
- 请求 URL 是什么？
- 状态码是多少？
- Request Headers 中是否有 Origin？

### 2. 浏览器 Console

- 完整的错误堆栈
- 是否有证书警告？

### 3. 后端日志

```bash
# 在服务器上查看
tail -f nohup.out
```

### 4. 构建产物检查

```bash
cd frontend
npm run build
grep -o "47\.86\.191\.93" dist/assets/*.js
```

---

## 建议的解决方案

### 方案 A：使用域名 + Let's Encrypt（推荐）

1. 购买域名（如阿里云）
2. 配置 DNS A 记录指向 47.86.191.93
3. 使用 certbot 获取有效 SSL 证书
4. 更新前端 API_BASE 为域名

### 方案 B：检查 Vite 构建配置

```javascript
// frontend/vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
});
```

### 方案 C：使用环境变量

```javascript
// frontend/src/hooks/useStreamSearch.js
const API_BASE = import.meta.env.VITE_API_URL || 'https://47.86.191.93';
```

在 Vercel 设置环境变量 `VITE_API_URL`

### 方案 D：添加调试日志

```javascript
// frontend/src/hooks/useStreamSearch.js
const executeSearch = useCallback(async (searchQuery) => {
  console.log('🔍 API_BASE:', API_BASE);
  console.log('🔍 请求 URL:', `${API_BASE}/search/stream`);
  // ...
});
```

---

## 快速测试命令

### 测试后端
```bash
# HTTP
curl http://47.86.191.93/health

# HTTPS
curl -k https://47.86.191.93/health

# 流式 API
curl -k -X POST https://47.86.191.93/api/search/stream \
  -H "Content-Type: application/json" \
  -d '{"query":"测试"}'
```

### 测试前端构建
```bash
cd frontend
npm run build
grep -r "47\.86\.191\.93" dist/
```

### 重新部署前端
```bash
cd frontend
vercel --prod --force
```

---

## 联系信息

- **后端服务器**：root@47.86.191.93
- **GitHub**：https://github.com/lindixu6-hash/ai-research-v2
- **Vercel 项目**：ai-search-project (lindys-projects-bbbd48f8)

---

## 最后更新

- **时间**：2026-05-14 23:59
- **状态**：前端无法连接后端，待解决
- **最新部署**：https://ai-search-project-4r8yauina-lindys-projects-bbbd48f8.vercel.app

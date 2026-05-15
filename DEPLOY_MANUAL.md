# 手动部署指南

> 优化版代码已准备好，需要手动上传到服务器

---

## 方法 1：使用 rsync（推荐）

在本地终端执行（需要输入服务器密码）：

```bash
cd ~/Desktop/ai-search-project

# 上传服务组件
rsync -avz services/ root@47.86.191.93:/root/ai-search-backend/services/

# 上传后端文件
rsync -avz backend/src/services/workflowServiceV2.js root@47.86.191.93:/root/ai-search-backend/src/services/
rsync -avz backend/src/routes/searchV2.js root@47.86.191.93:/root/ai-search-backend/src/routes/
rsync -avz backend/src/app.js root@47.86.191.93:/root/ai-search-backend/src/

# 重启服务
ssh root@47.86.191.93 "cd /root/ai-search-backend && pm2 restart ai-search"
```

---

## 方法 2：使用 scp

```bash
cd ~/Desktop/ai-search-project

# 上传服务组件
scp services/*.js root@47.86.191.93:/root/ai-search-backend/services/

# 上传后端文件
scp backend/src/services/workflowServiceV2.js root@47.86.191.93:/root/ai-search-backend/src/services/
scp backend/src/routes/searchV2.js root@47.86.191.93:/root/ai-search-backend/src/routes/
scp backend/src/app.js root@47.86.191.93:/root/ai-search-backend/src/

# 登录服务器重启
ssh root@47.86.191.93
pm2 restart ai-search
exit
```

---

## 方法 3：直接在服务器上操作

```bash
# 1. 登录服务器
ssh root@47.86.191.93

# 2. 进入项目目录
cd /root/ai-search-backend

# 3. 创建 services 目录
mkdir -p services

# 4. 从 GitHub 拉取最新代码
cd /root
git clone https://github.com/lindixu6-hash/ai-research-v2.git temp-repo
cp -r temp-repo/services/* ai-search-backend/services/
cp temp-repo/backend/src/services/workflowServiceV2.js ai-search-backend/src/services/
cp temp-repo/backend/src/routes/searchV2.js ai-search-backend/src/routes/
cp temp-repo/backend/src/app.js ai-search-backend/src/
rm -rf temp-repo

# 5. 重启服务
cd ai-search-backend
pm2 restart ai-search
```

---

## 验证部署

```bash
# 测试健康检查
curl http://47.86.191.93:3000/health

# 测试新接口
curl -X POST http://47.86.191.93:3000/api/search/v2 \
  -H "Content-Type: application/json" \
  -d '{"query":"美国上班时间"}'
```

---

## 前端调用（可选）

更新前端调用新接口：

```javascript
// 原接口
const response = await fetch('https://47.86.191.93/api/search', ...);

// 新接口（优化版）
const response = await fetch('https://47.86.191.93/api/search/v2', ...);
```

---

## 需要帮助？

如果 SSH 认证有问题，可以：

1. **设置 SSH 密钥**（免密登录）
2. **使用 VS Code Remote SSH** 插件
3. **直接在服务器控制台操作**（阿里云 ECS 控制台）

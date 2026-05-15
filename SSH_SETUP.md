# SSH 免密登录配置指南

> 已为你生成 SSH 密钥，需要手动添加到服务器

---

## 你的 SSH 密钥

**私钥位置：** `~/.ssh/id_ed25519_ai`
**公钥内容：**
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOfKm7xf/l2oNMgImPxJgrD9v/91kgSMT8ig9crd2ktv xulindi@ai-search
```

---

## 方法 1：通过阿里云控制台（推荐）

1. 登录 [阿里云 ECS 控制台](https://ecs.console.aliyun.com/)
2. 找到实例 `47.86.191.93`
3. 点击 **远程连接** → **VNC 连接** 或 **Workbench**
4. 登录后执行：

```bash
# 将公钥添加到 authorized_keys
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOfKm7xf/l2oNMgImPxJgrD9v/91kgSMT8ig9crd2ktv xulindi@ai-search" >> ~/.ssh/authorized_keys

# 设置正确权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# 验证
cat ~/.ssh/authorized_keys
```

5. 退出后，在本地测试：
```bash
ssh -i ~/.ssh/id_ed25519_ai root@47.86.191.93
```

---

## 方法 2：配置 SSH 配置文件

在本地 `~/.ssh/config` 添加：

```bash
Host ai-search
    HostName 47.86.191.93
    User root
    IdentityFile ~/.ssh/id_ed25519_ai
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

之后可以直接用：
```bash
ssh ai-search
```

---

## 配置完成后执行部署

```bash
# 进入项目目录
cd ~/Desktop/ai-search-project

# 上传服务组件
scp -i ~/.ssh/id_ed25519_ai services/*.js root@47.86.191.93:/root/ai-search-backend/services/

# 上传后端文件
scp -i ~/.ssh/id_ed25519_ai backend/src/services/workflowServiceV2.js root@47.86.191.93:/root/ai-search-backend/src/services/
scp -i ~/.ssh/id_ed25519_ai backend/src/routes/searchV2.js root@47.86.191.93:/root/ai-search-backend/src/routes/
scp -i ~/.ssh/id_ed25519_ai backend/src/app.js root@47.86.191.93:/root/ai-search-backend/src/

# 重启服务
ssh -i ~/.ssh/id_ed25519_ai root@47.86.191.93 "pm2 restart ai-search"
```

---

## 或者使用 rsync

```bash
cd ~/Desktop/ai-search-project

rsync -avz -e "ssh -i ~/.ssh/id_ed25519_ai" \
  services/ \
  backend/src/services/workflowServiceV2.js \
  backend/src/routes/searchV2.js \
  backend/src/app.js \
  root@47.86.191.93:/root/ai-search-backend/

ssh -i ~/.ssh/id_ed25519_ai root@47.86.191.93 "pm2 restart ai-search"
```

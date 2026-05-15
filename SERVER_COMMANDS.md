# 服务器端配置命令

请在服务器终端（你已经登录的那个）执行以下命令：

```bash
# 1. 确保 .ssh 目录存在且权限正确
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 2. 确保 authorized_keys 文件权限正确
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 3. 添加公钥（如果还没有）
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOfKm7xf/l2oNMgImPxJgrD9v/91kgSMT8ig9crd2ktv xulindi@ai-search" >> ~/.ssh/authorized_keys

# 4. 验证公钥已添加
cat ~/.ssh/authorized_keys

# 5. 检查 SSH 配置是否允许公钥认证
grep -E "^PubkeyAuthentication|^AuthorizedKeysFile" /etc/ssh/sshd_config

# 6. 如果上面没有输出，添加配置（需要 sudo）
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/#AuthorizedKeysFile/AuthorizedKeysFile/' /etc/ssh/sshd_config

# 7. 重启 SSH 服务
sudo systemctl restart sshd

# 8. 查看本机 IP（确认是内网还是外网）
ip addr show eth0 | grep inet
```

---

## 完成后，在本地执行测试：

```bash
ssh -i ~/.ssh/id_ed25519_ai root@47.86.191.93
```

如果成功，就不需要密码了！

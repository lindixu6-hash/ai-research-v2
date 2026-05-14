#!/bin/bash
# 阿里云后端 HTTPS 配置脚本

echo "=== 配置后端 HTTPS ==="

# 1. 安装 nginx
echo "1. 安装 nginx..."
sudo apt update
sudo apt install -y nginx

# 2. 安装 certbot
echo "2. 安装 certbot..."
sudo apt install -y certbot python3-certbot-nginx

# 3. 获取 SSL 证书（需要域名）
echo "3. 配置 SSL 证书..."
echo "请输入你的域名（如 api.example.com）:"
read domain

sudo certbot --nginx -d $domain

# 4. 配置 nginx 反向代理
echo "4. 配置 nginx 反向代理..."
sudo tee /etc/nginx/sites-available/ai-search > /dev/null <<EOF
server {
    listen 80;
    server_name $domain;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 5. 启用配置
sudo ln -sf /etc/nginx/sites-available/ai-search /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

echo "=== 配置完成！==="
echo "HTTPS 地址: https://$domain"
echo "请修改前端 API_BASE 为: https://$domain"

#!/bin/bash

# Docker 快速安装脚本 (Ubuntu/Debian)
# 用法: sudo ./install-docker.sh

set -e

echo "=================================="
echo "Docker 安装脚本"
echo "=================================="

# 检查是否为root
if [ "$EUID" -ne 0 ]; then
    echo "请使用sudo运行此脚本"
    echo "用法: sudo ./install-docker.sh"
    exit 1
fi

echo "1. 更新包索引..."
apt-get update

echo "2. 安装依赖..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

echo "3. 添加Docker官方GPG密钥..."
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "4. 设置Docker仓库..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "5. 安装Docker Engine..."
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "6. 启动Docker..."
systemctl start docker
systemctl enable docker

echo "7. 验证安装..."
docker --version
docker compose version

echo ""
echo "✓ Docker安装完成！"
echo ""
echo "添加当前用户到docker组（避免每次使用sudo）:"
echo "  sudo usermod -aG docker $SUDO_USER"
echo "  newgrp docker"
echo ""
echo "然后运行: ./setup-n8n-mcp.sh docker"

#!/bin/bash
# 一键修复 Docker 镜像拉取超时问题
# 在服务器上直接执行

set -e

echo "🚀 开始修复 Docker 镜像拉取问题..."
echo ""

# ============ 第1步：配置 Docker 镜像源 ============
echo "📌 第1步：配置 Docker daemon.json..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "registry-mirrors": [
    "https://registry.aliyuncs.com/",
    "https://hub-mirror.c.163.com/",
    "https://mirror.baidubce.com/",
    "https://docker.nju.edu.cn/"
  ],
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

echo "✅ daemon.json 已更新"
echo ""

# ============ 第2步：重启 Docker ============
echo "📌 第2步：重启 Docker 服务..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

sudo systemctl daemon-reload
echo "✓ 配置已重新加载"

sudo systemctl restart docker
echo "✓ Docker 已重启"

sleep 5
echo "✓ 等待 Docker 启动"
echo ""

# ============ 第3步：验证配置 ============
echo "📌 第3步：验证镜像源配置..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

MIRRORS=$(docker info 2>/dev/null | grep -A 10 "Registry Mirrors" || echo "")
if [ -z "$MIRRORS" ]; then
    echo "⚠️  未检测到镜像源，手动检查配置..."
    cat /etc/docker/daemon.json
else
    echo "✅ 镜像源配置正常："
    echo "$MIRRORS"
fi
echo ""

# ============ 第4步：测试镜像拉取 ============
echo "📌 第4步：测试镜像拉取..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "测试 1️⃣ : 拉取 alpine（快速测试）..."
if docker pull alpine:latest 2>&1 | tail -3; then
    echo "✅ alpine 拉取成功"
else
    echo "❌ alpine 拉取失败"
fi
echo ""

echo "测试 2️⃣ : 拉取 MySQL 8.0..."
if docker pull mysql:8.0 2>&1 | tail -3; then
    echo "✅ MySQL 拉取成功"
else
    echo "❌ MySQL 拉取失败（可能需要更长时间或网络问题）"
fi
echo ""

# ============ 第5步：启动容器 ============
echo "📌 第5步：启动 Docker 容器..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd /opt/video-production-system

echo "✓ 停止旧容器..."
docker-compose down -v 2>/dev/null || true

echo "✓ 等待..."
sleep 3

echo "✓ 启动新容器..."
docker-compose up -d

echo "✓ 等待容器完全启动 (30 秒)..."
sleep 30
echo ""

# ============ 第6步：验证部署 ============
echo "📌 第6步：验证部署状态..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "容器状态："
docker-compose ps

echo ""
echo "最后的日志:"
docker-compose logs --tail=20

echo ""
echo "✅ ========== 修复完成！=========="
echo ""
echo "🌐 访问应用:"
echo "   前端: http://121.43.77.213"
echo "   API: http://121.43.77.213/api/health"
echo ""
echo "📋 实时查看日志:"
echo "   docker-compose logs -f"
echo ""

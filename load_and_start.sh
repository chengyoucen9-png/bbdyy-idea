#!/bin/bash
set -e

# 服务器脚本：加载导出的镜像并启动 docker-compose
# 用法（在服务器上执行）：
#   sudo bash load_and_start.sh

TAR_PATH=/opt/video_images.tar
PROJECT_DIR=/opt/video-production-system

if [ ! -f "$TAR_PATH" ]; then
  echo "未找到 $TAR_PATH，请将导出的镜像上传到 /opt/ 下再运行此脚本。"
  exit 1
fi

echo "加载镜像: $TAR_PATH"
docker load -i "$TAR_PATH"

echo "为本地构建镜像打 tag 以配合 docker-compose（如果需要）"
# 这些 tag 名称依赖于 docker-compose 命名规则；若不同可跳过/按需修改
# 查找本地构建的镜像名
if docker images --format '{{.Repository}}:{{.Tag}}' | grep -q '^video-api:local$'; then
  docker tag video-api:local video-production-system_api:latest || true
fi
if docker images --format '{{.Repository}}:{{.Tag}}' | grep -q '^video-frontend:local$'; then
  docker tag video-frontend:local video-production-system_frontend:latest || true
fi

# 进入项目并用已加载镜像启动（不构建）
cd "$PROJECT_DIR"

echo "停止并清理旧容器（保留卷）..."
docker-compose down -v 2>/dev/null || true
sleep 2

echo "启动容器（使用本地镜像）..."
docker-compose up -d --no-build

echo "等待 30 秒让容器启动..."
sleep 30

echo "容器状态："
docker-compose ps

echo "最近日志："
docker-compose logs --tail=50

echo "完成。若某些服务未启动，请查看 docker-compose logs 进一步诊断。"

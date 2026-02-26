#!/bin/bash
set -e

# 本地脚本：构建、导出镜像并上传到服务器
# 用法：
#   SSH_PASSWORD=yourpass ./export_and_upload_images.sh root@121.43.77.213

REMOTE=${1:-root@121.43.77.213}
TAR_NAME=video_images.tar
PROJECT_DIR=$(pwd)

echo "本地工作目录: $PROJECT_DIR"

# 检查 docker
if ! command -v docker >/dev/null 2>&1; then
  echo "错误：本地未安装 docker" >&2
  exit 1
fi

# 1) 拉取基础镜像
echo "拉取基础镜像..."
docker pull mysql:8.0
docker pull redis:7-alpine
docker pull node:18-alpine
docker pull nginx:alpine

# 2) 构建后端与前端镜像（在本地构建以避免服务器上耗时）
echo "构建后端镜像 video-api:local..."
docker build -t video-api:local ./backend

echo "构建前端镜像 video-frontend:local..."
docker build -t video-frontend:local ./frontend-react

# 3) 导出镜像为单文件
echo "导出镜像到 $TAR_NAME ..."
docker save -o "$TAR_NAME" \
  mysql:8.0 \
  redis:7-alpine \
  node:18-alpine \
  nginx:alpine \
  video-api:local \
  video-frontend:local

echo "镜像导出完成: $TAR_NAME (大小: $(du -h "$TAR_NAME" | cut -f1))"

# 4) 上传镜像到远程服务器
if [ -n "$SSH_PASSWORD" ]; then
  if command -v sshpass >/dev/null 2>&1; then
    echo "使用 sshpass 上传到 $REMOTE:/opt/ ..."
    sshpass -p "$SSH_PASSWORD" scp -o StrictHostKeyChecking=no "$TAR_NAME" "$REMOTE:/opt/"
  else
    echo "警告：未安装 sshpass，无法自动使用密码上传。尝试使用 scp 手动上传。"
    echo "运行： scp $TAR_NAME $REMOTE:/opt/"
    exit 0
  fi
else
  echo "未检测到环境变量 SSH_PASSWORD，使用 scp 进行手动上传："
  echo "scp $TAR_NAME $REMOTE:/opt/"
  exit 0
fi

echo "上传完成。现在 SSH 到服务器并运行 load_and_start.sh（在 /opt/video-production-system）或手动在远程执行 docker load + docker-compose up。"


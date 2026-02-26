#!/bin/bash

# 阿里云一键部署脚本 - 短视频生产系统
# 使用: bash aliyun-deploy.sh

set -e

echo "========================================="
echo "短视频系统 - 阿里云一键部署"
echo "========================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_DIR="/opt/video-production-system"

# 检查权限
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}错误：此脚本必须以 root 用户运行${NC}"
   exit 1
fi

# 1. 系统更新
echo -e "${YELLOW}[1/9] 更新系统...${NC}"
apt-get update
apt-get upgrade -y

# 2. 安装基础工具
echo -e "${YELLOW}[2/9] 安装基础工具...${NC}"
apt-get install -y curl wget git vim

# 3. 安装 Docker
echo -e "${YELLOW}[3/9] 安装 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl start docker
    systemctl enable docker
    echo -e "${GREEN}✓ Docker 已安装${NC}"
else
    echo -e "${GREEN}✓ Docker 已存在${NC}"
fi

# 4. 安装 Docker Compose
echo -e "${YELLOW}[4/9] 安装 Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose 已安装${NC}"
else
    echo -e "${GREEN}✓ Docker Compose 已存在${NC}"
fi

# 5. 创建部署目录
echo -e "${YELLOW}[5/9] 创建部署目录...${NC}"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 6. 获取项目代码
echo -e "${YELLOW}[6/9] 获取项目代码...${NC}"
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}使用 GitHub 克隆还是本地上传？${NC}"
    echo "1) GitHub 克隆 (输入仓库地址)"
    echo "2) 本地上传 (使用 scp/rsync)"
    echo "3) 跳过 (手动上传)"
    read -p "请选择 (1-3): " choice
    
    case $choice in
        1)
            read -p "请输入 GitHub 仓库地址: " repo_url
            git clone "$repo_url" . 2>/dev/null || true
            ;;
        2)
            echo "请在另一个终端执行: scp -r project/* root@your-ip:$PROJECT_DIR/"
            read -p "上传完成后按 Enter 继续..."
            ;;
        3)
            echo "跳过代码获取，请确保已手动上传代码到 $PROJECT_DIR"
            ;;
    esac
else
    echo -e "${GREEN}✓ 项目代码已存在${NC}"
    git pull origin main 2>/dev/null || true
fi

# 7. 配置环境变量
echo -e "${YELLOW}[7/9] 配置环境...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
NODE_ENV=production
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=video_user
DB_PASSWORD=video_pass
DB_DATABASE=video_production_db
JWT_SECRET=$(date +%s%N | sha256sum | head -c 32)
JWT_EXPIRE=7d
REDIS_HOST=redis
REDIS_PORT=6379
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=5120
APP_PORT=3000
EOF
    echo -e "${YELLOW}⚠ 已创建 .env，请修改敏感信息${NC}"
    nano .env
fi

# 创建必要目录
mkdir -p backend/uploads

# 8. 启动 Docker 容器
echo -e "${YELLOW}[8/9] 启动容器...${NC}"
docker-compose down 2>/dev/null || true
docker-compose up -d

# 等待容器启动
echo -e "${YELLOW}等待容器启动...${NC}"
sleep 15

# 9. 验证部署
echo -e "${YELLOW}[9/9] 验证部署...${NC}"
echo ""
echo -e "${GREEN}✓ 部署完成！${NC}"
echo "========================================="

# 显示容器状态
echo -e "\n${YELLOW}📊 容器状态:${NC}"
docker-compose ps

# 验证服务
echo ""
echo -e "${YELLOW}🔍 服务检查:${NC}"

API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$API_CHECK" = "200" ] || [ "$API_CHECK" = "201" ]; then
    echo -e "${GREEN}✓ 后端 API 正常 (HTTP $API_CHECK)${NC}"
else
    echo -e "${RED}✗ 后端 API 异常（返回状态码 $API_CHECK）${NC}"
fi

WEB_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80/ 2>/dev/null || echo "000")
if [ "$WEB_CHECK" = "200" ]; then
    echo -e "${GREEN}✓ 前端正常 (HTTP $WEB_CHECK)${NC}"
else
    echo -e "${RED}✗ 前端异常（返回状态码 $WEB_CHECK）${NC}"
fi

# 显示访问地址
echo ""
echo -e "${YELLOW}🌐 访问地址:${NC}"
CURRENT_IP=$(hostname -I | awk '{print $1}')
echo "前端: http://$CURRENT_IP"
echo "后端: http://$CURRENT_IP/api"

# 显示实用命令
echo ""
echo -e "${YELLOW}📝 常用命令:${NC}"
echo "查看日志:      docker-compose -f $PROJECT_DIR/docker-compose.yml logs -f"
echo "重启服务:      docker-compose -f $PROJECT_DIR/docker-compose.yml restart"
echo "停止服务:      docker-compose -f $PROJECT_DIR/docker-compose.yml down"
echo "进入后端:      docker exec -it video-api bash"
echo "进入数据库:    docker exec -it video-mysql bash"
echo "编辑配置:      nano $PROJECT_DIR/.env && docker-compose restart"
echo ""

# 后续步骤
echo -e "${YELLOW}✅ 后续步骤:${NC}"
echo "1. 登录并修改密码（默认用户/密码在应用中）"
echo "2. 配置阿里云安全组允许端口 80 和 443"
echo "3. 配置域名 DNS 解析（可选）"
echo "4. 配置 HTTPS 和 SSL 证书（可选）"
echo "5. 设置备份计划"
echo ""

echo -e "${GREEN}部署脚本完成！${NC}"

#!/bin/bash

# 一键部署脚本 - 短视频内容生产系统
# 用法: ./deploy.sh [dev|prod]

set -e

ENV=${1:-dev}
echo "🚀 开始部署到 $ENV 环境..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 检查必要的工具
check_requirements() {
    echo "📋 检查必要工具..."
    
    command -v node >/dev/null 2>&1 || { echo -e "${RED}需要安装 Node.js${NC}"; exit 1; }
    command -v npm >/dev/null 2>&1 || { echo -e "${RED}需要安装 npm${NC}"; exit 1; }
    
    if [ "$ENV" = "prod" ]; then
        command -v pm2 >/dev/null 2>&1 || { echo -e "${RED}需要安装 PM2: npm install -g pm2${NC}"; exit 1; }
        command -v nginx >/dev/null 2>&1 || { echo -e "${RED}需要安装 Nginx${NC}"; exit 1; }
    fi
    
    echo -e "${GREEN}✓ 工具检查完成${NC}"
}

# 部署后端
deploy_backend() {
    echo ""
    echo "📦 部署后端..."
    cd backend
    
    # 安装依赖
    echo "安装依赖..."
    npm install
    
    # 检查.env文件
    if [ ! -f .env ]; then
        echo -e "${YELLOW}警告: .env文件不存在，从模板复制...${NC}"
        cp .env.example .env
        echo -e "${RED}请编辑 backend/.env 文件配置数据库等信息${NC}"
        exit 1
    fi
    
    # 构建
    echo "构建项目..."
    npm run build
    
    if [ "$ENV" = "prod" ]; then
        # 生产环境使用PM2
        echo "使用PM2启动服务..."
        pm2 delete video-production-api 2>/dev/null || true
        pm2 start ecosystem.config.js
        pm2 save
        echo -e "${GREEN}✓ 后端部署完成 (PM2)${NC}"
    else
        # 开发环境
        echo -e "${GREEN}✓ 后端构建完成${NC}"
        echo "运行: cd backend && npm run start:dev"
    fi
    
    cd ..
}

# 部署前端
deploy_frontend() {
    echo ""
    echo "🎨 部署前端..."
    cd frontend-react
    
    # 安装依赖
    echo "安装依赖..."
    npm install
    
    # 构建
    echo "构建项目..."
    npm run build
    
    if [ "$ENV" = "prod" ]; then
        # 复制到Nginx目录
        echo "复制文件到Nginx目录..."
        sudo mkdir -p /var/www/video-production/frontend
        sudo cp -r dist/* /var/www/video-production/frontend/
        echo -e "${GREEN}✓ 前端部署完成${NC}"
    else
        echo -e "${GREEN}✓ 前端构建完成${NC}"
        echo "运行: cd frontend-react && npm run dev"
    fi
    
    cd ..
}

# 配置Nginx
configure_nginx() {
    if [ "$ENV" = "prod" ]; then
        echo ""
        echo "⚙️  配置Nginx..."
        
        # 复制配置文件
        sudo cp nginx-production.conf /etc/nginx/sites-available/video-production
        
        # 创建软链接
        sudo ln -sf /etc/nginx/sites-available/video-production /etc/nginx/sites-enabled/
        
        # 测试配置
        echo "测试Nginx配置..."
        sudo nginx -t
        
        # 重启Nginx
        echo "重启Nginx..."
        sudo systemctl reload nginx
        
        echo -e "${GREEN}✓ Nginx配置完成${NC}"
    fi
}

# 数据库迁移
run_migrations() {
    echo ""
    echo "🗄️  数据库检查..."
    
    # 检查数据库是否已创建
    if ! mysql -u root -p -e "USE video_production_db;" 2>/dev/null; then
        echo "创建数据库..."
        mysql -u root -p < database/schema.sql
        echo -e "${GREEN}✓ 数据库创建完成${NC}"
    else
        echo -e "${GREEN}✓ 数据库已存在${NC}"
    fi
}

# 健康检查
health_check() {
    if [ "$ENV" = "prod" ]; then
        echo ""
        echo "🏥 健康检查..."
        
        sleep 3
        
        if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓ API服务正常${NC}"
        else
            echo -e "${RED}✗ API服务异常${NC}"
            echo "查看日志: pm2 logs video-production-api"
        fi
    fi
}

# 显示部署信息
show_info() {
    echo ""
    echo "======================================"
    echo -e "${GREEN}✅ 部署完成！${NC}"
    echo "======================================"
    echo ""
    
    if [ "$ENV" = "dev" ]; then
        echo "📝 开发环境启动命令:"
        echo "  后端: cd backend && npm run start:dev"
        echo "  前端: cd frontend-react && npm run dev"
        echo ""
        echo "访问地址:"
        echo "  前端: http://localhost:3001"
        echo "  API: http://localhost:3000/api"
        echo "  文档: http://localhost:3000/api/docs"
    else
        echo "📝 生产环境信息:"
        echo "  PM2管理: pm2 status"
        echo "  PM2日志: pm2 logs video-production-api"
        echo "  PM2重启: pm2 restart video-production-api"
        echo ""
        echo "访问地址:"
        echo "  网站: https://your-domain.com"
        echo "  API: https://api.your-domain.com"
        echo ""
        echo "⚠️  别忘了:"
        echo "  1. 配置SSL证书 (Let's Encrypt)"
        echo "  2. 更新nginx-production.conf中的域名"
        echo "  3. 配置防火墙规则"
    fi
}

# 主流程
main() {
    check_requirements
    
    if [ "$ENV" = "prod" ]; then
        run_migrations
    fi
    
    deploy_backend
    deploy_frontend
    
    if [ "$ENV" = "prod" ]; then
        configure_nginx
        health_check
    fi
    
    show_info
}

# 执行主流程
main

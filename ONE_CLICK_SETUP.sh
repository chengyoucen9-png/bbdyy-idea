#!/bin/bash

echo "========================================="
echo "  短视频内容生产系统 - 一键部署脚本"
echo "========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查Node.js
echo "检查环境..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未安装 Node.js，请先安装 Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js 版本: $(node -v)${NC}"

# 检查MySQL
if ! command -v mysql &> /dev/null; then
    echo -e "${YELLOW}⚠️  未检测到 MySQL，请确保已安装 MySQL 8.0+${NC}"
fi

echo ""
echo "========================================="
echo "  步骤 1: 初始化数据库"
echo "========================================="
echo ""
echo "请手动执行以下命令初始化数据库："
echo -e "${YELLOW}mysql -u root -p < database/schema.sql${NC}"
echo ""
read -p "数据库已初始化？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先初始化数据库后再继续"
    exit 1
fi

echo ""
echo "========================================="
echo "  步骤 2: 后端设置"
echo "========================================="
echo ""

cd backend

# 安装依赖
echo "安装后端依赖..."
npm install

# 配置环境变量
if [ ! -f .env ]; then
    echo "创建环境变量文件..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  请编辑 backend/.env 文件，配置数据库和OSS信息${NC}"
    echo ""
    read -p "环境变量已配置？(y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "请配置环境变量后再继续"
        exit 1
    fi
fi

# 构建后端
echo "构建后端..."
npm run build

echo -e "${GREEN}✅ 后端设置完成${NC}"

cd ..

echo ""
echo "========================================="
echo "  步骤 3: 前端设置"  
echo "========================================="
echo ""

# 检查是否有前端代码
if [ -d "frontend/src" ]; then
    cd frontend
    
    echo "安装前端依赖..."
    npm install
    
    echo "构建前端..."
    npm run build
    
    echo -e "${GREEN}✅ 前端构建完成${NC}"
    cd ..
else
    echo -e "${YELLOW}⚠️  前端代码需要手动迁移，请参考 frontend/FRONTEND_MIGRATION_GUIDE.md${NC}"
fi

echo ""
echo "========================================="
echo "  ✅ 设置完成！"
echo "========================================="
echo ""
echo "接下来的步骤："
echo ""
echo "1. 启动后端服务："
echo "   cd backend && npm run start:prod"
echo ""
echo "2. 如果是开发模式："
echo "   cd backend && npm run start:dev"
echo ""
echo "3. 查看部署文档："
echo "   cat docs/DEPLOY.md"
echo ""
echo "4. 访问 API:"
echo "   http://localhost:3000/api"
echo ""


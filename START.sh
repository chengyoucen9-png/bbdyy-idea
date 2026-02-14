#!/bin/bash

echo "🚀 短视频内容生产系统 - 一键启动"
echo "===================================="
echo ""

# 检查依赖
check_dependency() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 未安装，请先安装 $1"
        exit 1
    fi
}

echo "📋 检查依赖..."
check_dependency "node"
check_dependency "npm"
check_dependency "mysql"

echo "✅ 依赖检查通过"
echo ""

# 数据库初始化
echo "📊 初始化数据库..."
if mysql -u root -e "SHOW DATABASES LIKE 'video_production_db';" | grep -q video_production_db; then
    echo "✅ 数据库已存在"
else
    echo "创建数据库..."
    mysql -u root < database/schema.sql
    if [ $? -eq 0 ]; then
        echo "✅ 数据库创建成功"
    else
        echo "❌ 数据库创建失败"
        exit 1
    fi
fi
echo ""

# 后端启动
echo "🔧 启动后端服务..."
cd backend

if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

if [ ! -f ".env" ]; then
    echo "创建.env文件..."
    cp .env.example .env
    echo "⚠️  请编辑 backend/.env 配置数据库信息"
fi

echo "启动后端..."
npm run start:dev &
BACKEND_PID=$!
echo "✅ 后端服务已启动 (PID: $BACKEND_PID)"
echo ""

cd ..

# 前端启动
echo "🎨 启动前端服务..."
cd frontend-react

if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

echo "启动前端..."
npm run dev &
FRONTEND_PID=$!
echo "✅ 前端服务已启动 (PID: $FRONTEND_PID)"
echo ""

cd ..

echo "===================================="
echo "🎉 系统启动成功！"
echo ""
echo "📍 访问地址:"
echo "   前端: http://localhost:3001"
echo "   后端: http://localhost:3000/api"
echo "   文档: http://localhost:3000/api/docs"
echo ""
echo "⏹️  停止服务:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "💡 提示:"
echo "   1. 首次使用请先注册账号"
echo "   2. 配置 backend/.env 启用OSS和STT功能"
echo "   3. 查看文档了解更多功能"
echo "===================================="

# 等待
wait

# 短视频内容生产系统 - 完整版

## 📋 项目简介

基于 Nest.js + MySQL + React 的短视频内容生产管理系统，支持素材管理、选题策划、成品追踪和AI辅助分析。

## 🏗️ 技术架构

### 后端技术栈
- **框架**: Nest.js 10.x
- **数据库**: MySQL 8.0+
- **ORM**: TypeORM
- **认证**: JWT + Passport
- **文件存储**: 阿里云 OSS
- **运行环境**: Node.js 18+

### 前端技术栈
- **框架**: React 18
- **构建工具**: Vite
- **UI库**: Tailwind CSS
- **状态管理**: React Hooks
- **HTTP客户端**: Axios

## 📁 项目结构

```
video-production-system/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── modules/        # 业务模块
│   │   │   ├── auth/       # 认证模块
│   │   │   ├── users/      # 用户模块
│   │   │   ├── materials/  # 素材模块
│   │   │   ├── topics/     # 选题模块
│   │   │   ├── videos/     # 视频模块
│   │   │   ├── ai-providers/ # AI配置模块
│   │   │   └── oss/        # OSS文件上传模块
│   │   ├── common/         # 公共模块
│   │   ├── config/         # 配置文件
│   │   └── main.ts         # 入口文件
│   ├── package.json
│   └── .env.example        # 环境变量示例
│
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── api/           # API 接口
│   │   ├── components/    # 组件
│   │   ├── pages/         # 页面
│   │   ├── hooks/         # 自定义 Hooks
│   │   ├── utils/         # 工具函数
│   │   └── App.tsx        # 主应用
│   └── package.json
│
├── database/              # 数据库相关
│   └── schema.sql         # 数据库建表语句
│
└── docs/                  # 文档
    ├── API.md             # API 接口文档
    ├── DEPLOY.md          # 部署文档
    └── DEVELOPMENT.md     # 开发指南
```

## 🚀 快速开始

### 1. 环境准备

**必需软件：**
- Node.js >= 18.0.0
- MySQL >= 8.0
- npm 或 yarn

**可选服务：**
- 阿里云 OSS（用于文件存储）

### 2. 数据库初始化

```bash
# 登录 MySQL
mysql -u root -p

# 导入数据库
source database/schema.sql
```

### 3. 后端启动

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 复制环境变量
cp .env.example .env

# 编辑 .env 文件，配置数据库和其他服务
# vim .env

# 启动开发服务器
npm run start:dev
```

后端服务将在 `http://localhost:3000` 启动

### 4. 前端启动

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端应用将在 `http://localhost:5173` 启动

## 📝 环境变量配置

### 后端 `.env` 配置

```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=video_production_db

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# 阿里云 OSS
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=your-bucket-name
```

## 🔐 默认账号

初次使用请使用以下账号登录：

```
用户名: admin
密码: admin123
```

**⚠️ 重要提示：首次登录后请立即修改密码！**

## 📚 API 文档

后端 API 接口文档请查看 `docs/API.md`

主要接口：

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/materials` - 获取素材列表
- `POST /api/materials` - 创建素材
- `GET /api/topics` - 获取选题列表
- `GET /api/videos` - 获取视频列表

## 🛠️ 开发指南

### 后端开发

```bash
# 开发模式（热重载）
npm run start:dev

# 构建生产版本
npm run build

# 运行生产版本
npm run start:prod

# 运行测试
npm run test
```

### 前端开发

```bash
# 开发模式
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 🚢 部署到阿里云

详细部署文档请查看 `docs/DEPLOY.md`

### 快速部署步骤

1. **购买阿里云服务**
   - ECS 服务器（2核4G起步）
   - RDS MySQL 数据库
   - OSS 对象存储

2. **服务器配置**
   ```bash
   # 安装 Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs

   # 安装 Nginx
   sudo apt-get install nginx

   # 安装 PM2
   npm install -g pm2
   ```

3. **部署后端**
   ```bash
   # 上传代码到服务器
   scp -r backend/* user@server:/var/www/backend

   # 启动服务
   cd /var/www/backend
   npm install --production
   pm2 start dist/main.js --name video-production-api
   ```

4. **部署前端**
   ```bash
   # 构建前端
   npm run build

   # 上传到服务器
   scp -r dist/* user@server:/var/www/frontend

   # 配置 Nginx
   # 详见 docs/DEPLOY.md
   ```

## 🔧 常见问题

### 1. 数据库连接失败
检查 MySQL 是否启动，用户名密码是否正确

### 2. OSS 上传失败
检查 OSS 配置是否正确，Bucket 权限是否开放

### 3. 前端无法访问后端 API
检查 CORS 配置，确保前端域名在白名单中

## 📄 许可证

MIT License

## 👥 贡献者

- 您的名字

## 📞 联系方式

- 邮箱: your-email@example.com
- 项目地址: https://github.com/your-username/video-production-system

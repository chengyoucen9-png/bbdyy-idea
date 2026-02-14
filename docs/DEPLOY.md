# 阿里云部署文档

## 📋 准备工作

### 1. 购买阿里云服务

#### 1.1 ECS 云服务器
- **配置推荐**: 2核4G（入门），4核8G（推荐）
- **操作系统**: Ubuntu 20.04 LTS
- **带宽**: 5Mbps 起步
- **存储**: 40GB 系统盘 + 100GB 数据盘

#### 1.2 RDS MySQL 数据库
- **版本**: MySQL 8.0
- **配置**: 2核4G 起步
- **存储**: 20GB SSD
- **⚠️ 重要**: 设置白名单，允许 ECS 内网 IP 访问

#### 1.3 OSS 对象存储
- **存储类型**: 标准存储
- **读写权限**: 公共读
- **创建 Bucket**: 例如 `video-materials`

### 2. 域名准备（可选但推荐）

- 购买域名
- 完成 ICP 备案
- 配置 DNS 解析

## 🔧 服务器初始化

### 1. 连接到 ECS

```bash
ssh root@your-server-ip
```

### 2. 更新系统

```bash
apt update && apt upgrade -y
```

### 3. 安装 Node.js

```bash
# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# 验证安装
node -v
npm -v
```

### 4. 安装 Nginx

```bash
apt-get install nginx -y

# 启动 Nginx
systemctl start nginx
systemctl enable nginx

# 验证
systemctl status nginx
```

### 5. 安装 PM2（进程管理器）

```bash
npm install -g pm2

# 验证
pm2 -v
```

### 6. 安装 Git（如果使用 Git 部署）

```bash
apt-get install git -y
```

## 🗄️ 数据库配置

### 1. 连接到 RDS

使用 MySQL 客户端连接：

```bash
mysql -h rm-xxxxx.mysql.rds.aliyuncs.com -u username -p
```

### 2. 导入数据库

```bash
# 将 schema.sql 上传到服务器
scp database/schema.sql root@server:/root/

# 在服务器上导入
mysql -h rds-host -u username -p video_production_db < /root/schema.sql
```

### 3. 创建数据库用户（可选）

```sql
CREATE USER 'app_user'@'%' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON video_production_db.* TO 'app_user'@'%';
FLUSH PRIVILEGES;
```

## 🚀 部署后端服务

### 1. 创建项目目录

```bash
mkdir -p /var/www/video-production
cd /var/www/video-production
```

### 2. 上传后端代码

**方式一：使用 Git**

```bash
git clone https://github.com/your-username/video-production-backend.git backend
cd backend
```

**方式二：使用 SCP**

```bash
# 在本地执行
scp -r backend/* root@server:/var/www/video-production/backend/
```

### 3. 安装依赖

```bash
cd /var/www/video-production/backend
npm install --production
```

### 4. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置
vim .env
```

**生产环境配置示例：**

```env
NODE_ENV=production
PORT=3000

# RDS 数据库配置
DB_HOST=rm-xxxxx.mysql.rds.aliyuncs.com
DB_PORT=3306
DB_USERNAME=app_user
DB_PASSWORD=your_strong_password
DB_DATABASE=video_production_db

# JWT
JWT_SECRET=your-production-secret-key-very-long-and-random
JWT_EXPIRES_IN=7d

# OSS 配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=LTAI5xxxxx
OSS_ACCESS_KEY_SECRET=xxxxx
OSS_BUCKET=video-materials
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com

# CORS（填写前端域名）
CORS_ORIGIN=https://your-domain.com
```

### 5. 构建项目

```bash
npm run build
```

### 6. 使用 PM2 启动

```bash
# 启动应用
pm2 start dist/main.js --name video-api

# 查看状态
pm2 status

# 查看日志
pm2 logs video-api

# 设置开机自启
pm2 startup
pm2 save
```

## 🌐 部署前端应用

### 1. 本地构建前端

```bash
# 在本地前端目录
cd frontend

# 配置 API 地址
# 编辑 .env.production
echo "VITE_API_URL=https://api.your-domain.com/api" > .env.production

# 构建
npm run build
```

### 2. 上传到服务器

```bash
# 创建前端目录
ssh root@server "mkdir -p /var/www/video-production/frontend"

# 上传构建文件
scp -r dist/* root@server:/var/www/video-production/frontend/
```

### 3. 配置 Nginx

创建 Nginx 配置文件：

```bash
vim /etc/nginx/sites-available/video-production
```

**Nginx 配置内容：**

```nginx
# API 服务器配置
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# 前端应用配置
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    root /var/www/video-production/frontend;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. 启用配置

```bash
# 创建软链接
ln -s /etc/nginx/sites-available/video-production /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

## 🔒 配置 HTTPS（推荐）

### 1. 安装 Certbot

```bash
apt-get install certbot python3-certbot-nginx -y
```

### 2. 获取 SSL 证书

```bash
# 为前端域名申请证书
certbot --nginx -d your-domain.com -d www.your-domain.com

# 为 API 域名申请证书
certbot --nginx -d api.your-domain.com
```

### 3. 自动续期

```bash
# 测试自动续期
certbot renew --dry-run

# Certbot 会自动设置定时任务
```

### 4. 更新前端 API 地址

前端 `.env.production` 改为：
```
VITE_API_URL=https://api.your-domain.com/api
```

## 🔥 配置防火墙

```bash
# 允许 HTTP/HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# 允许 SSH
ufw allow 22/tcp

# 启用防火墙
ufw enable

# 查看状态
ufw status
```

## 📊 监控和日志

### 1. PM2 监控

```bash
# 实时监控
pm2 monit

# 查看日志
pm2 logs video-api

# 查看详细信息
pm2 show video-api
```

### 2. Nginx 日志

```bash
# 访问日志
tail -f /var/log/nginx/access.log

# 错误日志
tail -f /var/log/nginx/error.log
```

### 3. 系统资源监控

```bash
# 安装 htop
apt-get install htop -y

# 查看资源使用
htop
```

## 🔄 更新部署

### 后端更新

```bash
cd /var/www/video-production/backend

# 拉取最新代码（如果使用 Git）
git pull

# 安装依赖
npm install --production

# 重新构建
npm run build

# 重启服务
pm2 restart video-api
```

### 前端更新

```bash
# 在本地构建
npm run build

# 上传到服务器
scp -r dist/* root@server:/var/www/video-production/frontend/

# 清理浏览器缓存（可选）
# 或者在 Nginx 配置中设置版本号
```

## ⚠️ 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :3000

# 杀死进程
kill -9 PID
```

### 2. 数据库连接失败

检查：
- RDS 白名单是否包含 ECS 内网 IP
- 数据库用户名密码是否正确
- 网络安全组是否开放 3306 端口

### 3. OSS 上传失败

检查：
- AccessKey 是否正确
- Bucket 名称是否正确
- Bucket 权限是否设置为公共读

### 4. Nginx 502 错误

检查：
- 后端服务是否正常运行
- `pm2 status` 查看服务状态
- 检查后端日志 `pm2 logs video-api`

## 📈 性能优化建议

### 1. 数据库优化

- 添加适当的索引
- 定期清理日志表
- 使用 Redis 缓存热点数据

### 2. 静态资源 CDN

- 将前端静态资源上传到阿里云 CDN
- 配置 OSS 图片处理（缩略图、水印等）

### 3. 负载均衡

- 使用阿里云 SLB
- 部署多个后端实例
- 配置健康检查

## 🔐 安全建议

1. **定期更新系统**
   ```bash
   apt update && apt upgrade -y
   ```

2. **修改默认 SSH 端口**
   ```bash
   vim /etc/ssh/sshd_config
   # 修改 Port 22 为其他端口
   systemctl restart sshd
   ```

3. **禁用 root 登录**
   - 创建普通用户
   - 配置 sudo 权限
   - 禁用 root SSH 登录

4. **使用强密码**
   - 数据库密码
   - JWT Secret
   - OSS AccessKey

5. **定期备份**
   - 数据库自动备份
   - 代码版本控制
   - 配置文件备份

## 📞 技术支持

如有问题，请联系：
- 邮箱: support@example.com
- 文档: https://docs.your-domain.com

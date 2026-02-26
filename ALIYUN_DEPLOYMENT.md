# 短视频系统 - 阿里云部署指南

## 📋 部署前准备

### 1. 本地编译项目

在本地执行以下命令编译前后端：

```bash
# 1. 编译后端
cd backend
npm install
npm run build

# 2. 编译前端
cd ../frontend-react
npm install
npm run build
```

### 2. 确保项目结构完整

```
video-production-system/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   └── dist/  (构建后)
├── frontend-react/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   └── dist/  (构建后)
├── database/
│   └── schema.sql
├── docker-compose.yml
└── .env  (需要创建，见下面)
```

### 3. 配置环境文件

创建 `.env` 文件（放在项目根目录）：

```env
# 后端环境
NODE_ENV=production
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=video_user
DB_PASSWORD=video_pass
DB_DATABASE=video_production_db

# JWT 配置（生产环境必须改）
JWT_SECRET=your-production-secret-key-$(date +%s)
JWT_EXPIRE=7d

# Redis 配置
REDIS_HOST=redis
REDIS_PORT=6379

# 应用配置
APP_URL=http://your-server-ip
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=5120  # 5GB
```

---

## 🚀 阿里云服务器部署

### 第一步：连接到服务器

```bash
# SSH 连接到阿里云服务器（以 Ubuntu 为例）
ssh -i /path/to/key.pem root@your-server-ip
# 或者
ssh -i /path/to/key.pem ubuntu@your-server-ip
```

### 第二步：服务器环境初始化

```bash
# 1. 更新系统
sudo apt-get update
sudo apt-get upgrade -y

# 2. 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. 验证安装
docker --version
docker-compose --version

# 5. 将当前用户加入 Docker 组（可选，避免每次都用 sudo）
sudo usermod -aG docker $USER
newgrp docker
```

### 第三步：上传项目代码到服务器

**选项 A：使用 Git 克隆（推荐）**

```bash
# 在服务器上执行
cd /opt
sudo git clone https://your-repo-url/video-production-system.git
cd video-production-system
```

**选项 B：使用 SCP 上传本地代码**

```bash
# 在本地执行
scp -r -i /path/to/key.pem ./video-production-system root@your-server-ip:/opt/
```

### 第四步：修改服务器上的配置

```bash
# 登录到服务器
ssh -i /path/to/key.pem root@your-server-ip

# 进入项目目录
cd /opt/video-production-system

# 编辑 docker-compose.yml，修改端口和密码（生产环境）
nano docker-compose.yml

# 修改以下内容：
# - MYSQL_ROOT_PASSWORD
# - MYSQL_PASSWORD
# - JWT_SECRET
# - 端口映射（可改为 8080, 443 等）
```

### 第五步：启动容器

```bash
# 进入项目目录
cd /opt/video-production-system

# 构建并启动所有服务
sudo docker-compose up -d

# 查看容器运行状态
sudo docker-compose ps

# 查看日志
sudo docker-compose logs -f api      # 查看后端日志
sudo docker-compose logs -f frontend # 查看前端日志
sudo docker-compose logs -f mysql    # 查看数据库日志
```

### 第六步：验证部署

```bash
# 检查后端 API 是否运行
curl http://localhost:3000/api/health

# 检查前端是否运行
curl -I http://localhost:80/

# 查看容器 IP 地址
sudo docker inspect video-api | grep IPAddress
```

---

## 🔒 安全配置

### 1. 配置阿里云安全组

在阿里云控制台，为你的实例配置安全组规则：

| 协议 | 端口 | 来源 | 说明 |
|------|------|------|------|
| TCP | 22 | 0.0.0.0/0 | SSH 访问 |
| TCP | 80 | 0.0.0.0/0 | HTTP 前端 |
| TCP | 443 | 0.0.0.0/0 | HTTPS（如需要） |
| TCP | 3000 | 私有网络 | 后端 API（内部） |
| TCP | 3306 | 私有网络 | MySQL（内部） |
| TCP | 6379 | 私有网络 | Redis（内部） |

### 2. 防火墙配置（宝塔面板）

如果使用宝塔面板，添加以下规则：

```bash
# 只开放 HTTP 和 HTTPS，API 端口只内部访问
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

### 3. 修改默认密码

所有默认密码必须修改：

```bash
# 编辑 docker-compose.yml
MYSQL_PASSWORD=your-strong-password
JWT_SECRET=your-strong-jwt-secret-here
```

---

## 📦 数据管理

### 1. 数据库备份

```bash
# 进入 MySQL 容器备份数据库
docker exec video-mysql mysqldump -uroot -proot123456 video_production_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 从备份恢复
cat backup_20240101_120000.sql | docker exec -i video-mysql mysql -uroot -proot123456 video_production_db
```

### 2. 文件备份

```bash
# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz ./backend/uploads/

# 恢复
tar -xzf uploads_backup_*.tar.gz
```

### 3. 自动化备份脚本

创建 `backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# 数据库备份
docker exec video-mysql mysqldump -uroot -proot123456 video_production_db | gzip > $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.gz

# 文件备份
tar -czf $BACKUP_DIR/uploads_$(date +%Y%m%d).tar.gz /opt/video-production-system/backend/uploads/

# 删除 7 天前的备份
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed at $(date)"
```

设置定时备份：

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 2 点执行备份）
0 2 * * * /opt/backup.sh >> /var/log/backup.log 2>&1
```

---

## 🔧 更新和维护

### 重启服务

```bash
cd /opt/video-production-system

# 重启所有容器
docker-compose restart

# 重启特定服务
docker-compose restart api       # 重启后端
docker-compose restart frontend  # 重启前端
```

### 更新代码

```bash
cd /opt/video-production-system

# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose down
docker-compose up -d --build
```

### 查看日志

```bash
# 查看全部日志
docker-compose logs

# 实时查看后端日志
docker-compose logs -f api

# 查看最后 100 行
docker-compose logs --tail 100
```

### 清理空间

```bash
# 删除未使用的镜像和容器
docker system prune

# 删除所有未使用的卷
docker volume prune
```

---

## 🐛 故障排查

### 后端 API 无法访问

```bash
# 1. 检查容器是否运行
docker ps | grep video-api

# 2. 查看错误日志
docker-compose logs api

# 3. 检查端口是否被占用
lsof -i :3000

# 4. 重启服务
docker-compose restart api
```

### 数据库连接失败

```bash
# 1. 检查 MySQL 容器
docker ps | grep mysql

# 2. 进入 MySQL 检查
docker exec -it video-mysql mysql -uroot -proot123456 -e "SHOW DATABASES;"

# 3. 检查网络连接
docker exec video-api ping mysql
```

### 前端无法加载

```bash
# 1. 检查容器
docker ps | grep frontend

# 2. 查看错误日志
docker-compose logs frontend

# 3. 检查 nginx 配置
docker exec video-frontend cat /etc/nginx/conf.d/default.conf
```

### 磁盘空间不足

```bash
# 检查磁盘使用
df -h

# 清理容器日志
docker exec video-api sh -c 'rm -f /app/logs/*.log'

# 清理 Docker
docker system prune -a
```

---

## 📊 性能监控

### 查看容器资源使用

```bash
# 实时监控
docker stats

# 记录使用统计
docker stats --no-stream >> /var/log/docker-stats.log
```

### 设置日志级别

在 `docker-compose.yml` 中添加：

```yaml
environment:
  LOG_LEVEL: info  # 可选: debug, info, warn, error
```

---

## 🎯 常用命令速查

```bash
# 启动/停止/重启
docker-compose up -d              # 启动
docker-compose down               # 停止并删除容器
docker-compose restart            # 重启

# 查看状态
docker-compose ps                 # 列出容器
docker-compose logs -f            # 查看日志

# 进入容器
docker exec -it video-api bash    # 进入后端
docker exec -it video-mysql bash  # 进入数据库

# 备份和恢复
docker-compose down
cp -r /opt/video-production-system /opt/video-production-system.bak
docker-compose up -d

# 更新镜像
docker-compose pull
docker-compose up -d --build
```

---

## 📞 需要帮助？

遇到问题时检查：
1. 服务器是否有足够的磁盘空间
2. DNS 是否正确配置
3. 防火墙和安全组规则是否正确
4. Docker 和 Docker Compose 是否最新版本
5. 环境变量是否正确配置

祝部署顺利！🚀

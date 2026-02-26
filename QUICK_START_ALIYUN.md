# 🚀 快速部署指南（阿里云）

## 📌 部署前检查清单

- [ ] 已购买阿里云 ECS 实例（Ubuntu 20.04 或更新）
- [ ] 获得服务器公网 IP 和 SSH 访问权限
- [ ] SSH 密钥文件已保存在 ~/.ssh/ 目录
- [ ] 本地已编译前后端代码

---

## 🔧 第一步：准备本地代码

### 1.1 编译项目

```bash
# 在本地执行
cd ~/Desktop/idea/files/video-production-system

# 编译后端
cd backend
npm install --production
npm run build
cd ..

# 编译前端
cd frontend-react
npm install --production
npm run build
cd ..
```

### 1.2 准备上传

```bash
# 检查文件是否完整
ls -la backend/dist
ls -la frontend-react/dist
```

---

## 🚀 第二步：连接阿里云服务器

### 2.1 SSH 连接

**使用密钥连接（推荐）：**

```bash
# Windows (PowerShell) / Linux / Mac
ssh -i ~/.ssh/your-key.pem root@your-server-ip

# 如果连接超时，检查防火墙
ssh -v -i ~/.ssh/your-key.pem root@your-server-ip
```

**使用密码连接：**

```bash
ssh root@your-server-ip
# 输入密码
```

### 2.2 验证连接

```bash
# 查看系统信息
uname -a
cat /etc/os-release
```

---

## 📦 第三步：上传项目代码

### 方式 1：使用 SCP 上传（推荐）

在 **本地** 执行：

```bash
# 打包项目
cd ~/Desktop/idea/files
tar -czf video-production-system.tar.gz video-production-system/

# 上传到服务器
scp -i ~/.ssh/your-key.pem video-production-system.tar.gz root@your-server-ip:/opt/

# 或者直接上传整个目录
scp -r -i ~/.ssh/your-key.pem video-production-system/ root@your-server-ip:/opt/
```

### 方式 2：使用 Git（如已配置仓库）

在 **服务器** 执行：

```bash
cd /opt
git clone https://github.com/your-repo/video-production-system.git
cd video-production-system
```

### 方式 3：在服务器上解压

```bash
# 在服务器执行
cd /opt
tar -xzf video-production-system.tar.gz
cd video-production-system
```

---

## ⚙️ 第四步：自动部署

### 4.1 运行一键部署脚本

在 **服务器** 执行：

```bash
# 进入项目目录
cd /opt/video-production-system

# 给脚本执行权限
chmod +x aliyun-deploy.sh

# 运行部署脚本（需要 root）
sudo bash aliyun-deploy.sh
```

脚本会自动：
- ✓ 更新系统
- ✓ 安装 Docker 和 Docker Compose
- ✓ 配置环境变量
- ✓ 启动所有容器
- ✓ 验证服务

### 4.2 手动部署（如不想用脚本）

```bash
# 在服务器执行
cd /opt/video-production-system

# 创建 .env 文件
cat > .env << 'EOF'
NODE_ENV=production
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=video_user
DB_PASSWORD=video_pass
DB_DATABASE=video_production_db
JWT_SECRET=$(openssl rand -hex 32)
JWT_EXPIRE=7d
REDIS_HOST=redis
REDIS_PORT=6379
UPLOAD_DIR=/app/uploads
MAX_FILE_SIZE=5120
EOF

# 启动服务
docker-compose up -d

# 等待启动
sleep 15

# 检查状态
docker-compose ps
```

---

## ✅ 第五步：验证部署

### 5.1 检查容器状态

```bash
# 查看所有容器
docker-compose ps

# 输出应该显示 4 个容器都在运行:
# - video-mysql   (MySQL 数据库)
# - video-redis   (缓存服务)
# - video-api     (后端 API)
# - video-frontend (前端)
```

### 5.2 测试 API

```bash
# 在服务器或本地执行
curl http://your-server-ip:3000/api/health

# 返回应该是 200 OK
```

### 5.3 访问前端

在浏览器打开：

```
http://your-server-ip
```

---

## 🔐 第六步：安全配置

### 6.1 配置阿里云安全组

在阿里云控制台，为你的实例配置入方向规则：

| 优先级 | 协议 | 端口 | 来源 | 说明 |
|--------|------|------|------|------|
| 1 | TCP | 22 | 0.0.0.0/0 | SSH 远程连接 |
| 2 | TCP | 80 | 0.0.0.0/0 | HTTP 前端 |
| 3 | TCP | 443 | 0.0.0.0/0 | HTTPS（可选） |

### 6.2 修改默认密码

在 `.env` 文件中修改：

```bash
# 编辑配置
vim /opt/video-production-system/.env

# 修改以下内容
MYSQL_PASSWORD=your-strong-password-here
JWT_SECRET=your-strong-jwt-secret-here

# 重启服务应用新配置
docker-compose restart
```

### 6.3 配置防火墙

```bash
# 如果使用 UFW
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 📊 第七步：监控和维护

### 7.1 查看日志

```bash
# 查看所有日志
docker-compose logs

# 查看特定服务日志
docker-compose logs api       # 后端
docker-compose logs frontend  # 前端
docker-compose logs mysql     # 数据库

# 实时查看日志
docker-compose logs -f api
```

### 7.2 性能监控

```bash
# 实时监控容器资源占用
docker stats

# 查看磁盘使用
df -h

# 检查 Docker 磁盘占用
docker system df
```

### 7.3 自动备份

```bash
# 创建备份脚本
cat > /opt/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups"
mkdir -p $BACKUP_DIR

# 数据库备份
docker exec video-mysql mysqldump -uroot -pvideo_pass video_production_db | gzip > $BACKUP_DIR/db_$(date +%Y%m%d_%H%M%S).sql.gz

# 文件备份
tar -czf $BACKUP_DIR/uploads_$(date +%Y%m%d).tar.gz /opt/video-production-system/backend/uploads/

# 清理 7 天前的备份
find $BACKUP_DIR -type f -mtime +7 -delete
EOF

chmod +x /opt/backup.sh

# 设置定时备份（每天凌晨 2 点）
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup.sh >> /var/log/backup.log 2>&1") | crontab -
```

---

## 🔄 更新和重启

### 更新代码

```bash
# 拉取最新代码
cd /opt/video-production-system
git pull origin main

# 重新构建并启动
docker-compose down
docker-compose up -d --build
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart api      # 重启后端
docker-compose restart frontend # 重启前端

# 完全停止并清理
docker-compose down

# 重新启动
docker-compose up -d
```

---

## 🐛 故障排查

### API 无法访问

```bash
# 1. 检查容器是否运行
docker ps | grep video-api

# 2. 查看错误日志
docker-compose logs api

# 3. 检查端口被占用
netstat -tlnp | grep 3000

# 4. 重启服务
docker-compose restart api
```

### 数据库连接失败

```bash
# 1. 检查 MySQL 是否运行
docker exec video-mysql mysql -uroot -pvideo_pass -e "SELECT 1;"

# 2. 查看数据库日志
docker-compose logs mysql

# 3. 检查环境变量
docker exec video-api env | grep DB_
```

### 磁盘空间不足

```bash
# 检查磁盘
df -h

# 清理 Docker
docker system prune -a

# 清理日志
docker exec video-api sh -c "rm -f /app/logs/*.log"
```

---

## 📞 常见问题

**Q: 如何修改数据库密码？**
A: 编辑 `.env` 文件中的 `DB_PASSWORD` 和 `MYSQL_PASSWORD`，然后删除数据库卷重新初始化：
```bash
docker-compose down -v
docker-compose up -d
```

**Q: 如何增加文件上传限制？**
A: 修改 `.env` 中的 `MAX_FILE_SIZE` 值（单位 MB）

**Q: 如何配置 HTTPS？**
A: 使用 Let's Encrypt 免费证书，见 [HTTPS 配置指南](./docs/HTTPS.md)

**Q: 如何迁移到另一台服务器？**
A: 备份数据库和文件，在新服务器执行部署脚本即可

---

## 🎯 快速命令参考

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 重启
docker-compose restart

# 查看日志
docker-compose logs -f

# 进入容器
docker exec -it video-api bash

# 备份数据库
docker exec video-mysql mysqldump -u root -p video_production_db > backup.sql

# 查看资源占用
docker stats

# 清理系统
docker system prune -a
```

---

祝部署顺利！遇到问题请参考[完整部署文档](./ALIYUN_DEPLOYMENT.md) 📖

# 🚀 阿里云手动部署指南

## 📋 服务器信息
- **IP**: 121.43.77.213
- **用户**: root
- **系统**: Ubuntu 24.04.4 LTS
- **Docker**: 已安装 ✓
- **Docker Compose**: 已安装 ✓

---

## 🎯 快速部署步骤

### 第1步：使用 VS Code Remote SSH（推荐）

1. **连接服务器**
   - Ctrl+Shift+P → "Remote-SSH: Connect to Host"
   - 输入：`root@121.43.77.213`
   - 输入密码并连接

2. **执行部署命令**
   ```bash
   cd /opt
   
   # 清理旧部署
   rm -rf video-production-system video-production-system.tar.gz
   
   # 上传项目（从本地终端执行）
   # 或使用 VS Code 的文件拖放功能
   ```

---

### 第2步：手动命令行部署

如果不使用 VS Code Remote SSH：

#### 2.1 从本地上传项目
```bash
scp /Users/cen/Desktop/idea/files/video-production-system.tar.gz root@121.43.77.213:/opt/
```

#### 2.2 连接服务器并解压
```bash
ssh root@121.43.77.213

# 在服务器上执行
cd /opt
tar -xzf video-production-system.tar.gz
cd video-production-system
```

#### 2.3 启动 Docker 容器
```bash
# 清理之前的容器
docker-compose down -v 2>/dev/null || true

# 启动新容器
docker-compose up -d

# 查看启动状态
docker-compose ps
```

---

## 🔍 部署验证

### 查看容器日志
```bash
# 实时日志
docker-compose logs -f

# 后端日志
docker-compose logs -f api

# MySQL 日志
docker-compose logs -f mysql

# Redis 日志
docker-compose logs -f redis
```

### 测试服务
```bash
# 检查健康状态
curl http://localhost:3000/api/health

# 测试前端
curl http://localhost:80

# 从外部测试
curl http://121.43.77.213/api/health
curl http://121.43.77.213
```

### 容器管理
```bash
# 查看容器日志行数
docker-compose logs --tail=50

# 停止容器
docker-compose stop

# 重启容器
docker-compose restart

# 删除所有容器和卷
docker-compose down -v

# 查看容器资源使用
docker stats
```

---

## 📊 常见问题排查

### 1. Docker 镜像拉取超时
**症状**：`context deadline exceeded`

**解决方案**：
```bash
# 检查Docker镜像配置
docker info | grep -A 5 "Registry Mirrors"

# 检查网络连接
ping -c 2 registry.aliyuncs.com

# 重启 Docker
systemctl restart docker

# 重试
docker-compose up -d
```

### 2. 端口被占用
**症状**：`bind: address already in use`

**解决方案**：
```bash
# 停止之前的容器
docker-compose down -v

# 等待 30 秒
sleep 30

# 重新启动
docker-compose up -d
```

### 3. 数据库连接失败
**症状**：API 日志显示 `ECONNREFUSED`

**解决方案**：
```bash
# 检查 MySQL 是否已启动
docker-compose logs mysql | tail -20

# 等待 MySQL 初始化（可能需要 30-60 秒）
sleep 60

# 重启 API 容器
docker-compose restart api
```

### 4. 内存不足
**症状**：容器不断重启

**解决方案**：
```bash
# 查看内存使用
free -h

# 停止不必要的服务
docker-compose stop

# 清理未使用的镜像
docker image prune -a

# 重新启动
docker-compose up -d
```

---

## 🌐 访问应用

- **前端**: http://121.43.77.213
- **API 基础地址**: http://121.43.77.213/api
- **健康检查**: http://121.43.77.213/api/health
- **MySQL**: 121.43.77.213:3306 (用户: video_user)
- **Redis**: 121.43.77.213:6379

---

## 📝 docker-compose.yml 配置说明

```yaml
services:
  mysql:      # 数据库 (port 3306)
  redis:      # 缓存 (port 6379)
  api:        # 后端 API (port 3000)
  frontend:   # 前端服务 (port 80)
```

### 环境变量
```
DB_HOST: mysql
DB_PORT: 3306
DB_USERNAME: video_user
DB_PASSWORD: video_pass
DB_DATABASE: video_production_db
NODE_ENV: production
JWT_SECRET: your-production-secret-key
```

---

## 🛠️ 高级操作

### 进入容器内部
```bash
# 进入 API 容器
docker exec -it video-api /bin/sh

# 进入 MySQL 容器
docker exec -it video-mysql mysql -u root -p

# 进入 Redis 容器
docker exec -it video-redis redis-cli
```

### 查看容器详情
```bash
# 检查端口映射
docker-compose port

# 检查环境变量
docker inspect video-api | grep -A 20 "ENV"

# 查看网络信息
docker network ls
docker network inspect video-production-system_default
```

### 日志持久化与分析
```bash
# 将日志导出到文件
docker-compose logs > deployment.log

# 查看特定时间范围的日志
docker-compose logs --since 2024-02-24 \
  --until 2024-02-25 api > api.log

# 实时监控特定容器
watch -n 1 'docker-compose logs --tail=20 api'
```

---

## 📌 生产环境检查清单

- [ ] 所有容器运行中 (`docker-compose ps` 显示 UP)
- [ ] MySQL 已初始化（schema.sql 已执行）
- [ ] 前端可访问 (http://121.43.77.213 返回 HTML)
- [ ] 后端健康检查通过 (http://121.43.77.213/api/health 返回 200)
- [ ] 没有容器重启错误 (`docker-compose ps` 的 CONTAINER ID 稳定)
- [ ] 日志无错误 (`docker-compose logs | grep -i error` 为空)
- [ ] Redis 连接成功
- [ ] 数据库连接成功

---

## 🔐 安全建议

1. **修改 MySQL 密码**
   ```bash
   # 在 docker-compose.yml 中更新：
   MYSQL_ROOT_PASSWORD: your-strong-password
   MYSQL_PASSWORD: your-strong-password
   ```

2. **修改 JWT_SECRET**
   ```bash
   # 生成安全的 JWT_SECRET
   openssl rand -base64 32
   
   # 更新到 docker-compose.yml
   JWT_SECRET: <生成的密钥>
   ```

3. **启用 HTTPS**
   - 使用 Nginx 反向代理配置 SSL
   - 参考 nginx-production.conf

4. **资源限制**
   ```yaml
   # docker-compose.yml 中添加
   resources:
     limits:
       cpus: '1'
       memory: 1G
     reservations:
       cpus: '0.5'
       memory: 500M
   ```

---

## 📞 需要帮助？

如遇到问题，执行以下诊断命令并分享输出：

```bash
echo "=== Docker 版本 ===" && docker --version
echo "=== Docker Compose 版本 ===" && docker-compose --version
echo "=== 容器状态 ===" && docker-compose ps
echo "=== 最后 50 行日志 ===" && docker-compose logs --tail=50
echo "=== 系统资源 ===" && free -h && df -h
```

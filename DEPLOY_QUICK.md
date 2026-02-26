# 🚀 一键部署脚本

## ✨ 最简方案（推荐）

### 方案A：使用 sshpass 实现完全自动化

如果您已知道 SSH 密码，执行这个命令：

```bash
# 设置密码为环境变量（这里用 'yourpassword' 替换实际密码）
export SSH_PASSWORD="your_password_here"

# 执行自动部署
cd /Users/cen/Desktop/idea/files

# 上传项目
sshpass -p "$SSH_PASSWORD" scp -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
  video-production-system.tar.gz \
  root@121.43.77.213:/opt/

# 远程部署
sshpass -p "$SSH_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
  root@121.43.77.213 << 'DEPLOY_SCRIPT'
set -e
cd /opt
rm -rf video-production-system
tar -xzf video-production-system.tar.gz
cd video-production-system
echo "启动容器..."
docker-compose down 2>/dev/null || true
docker-compose up -d
echo "等待 30 秒..."
sleep 30
echo "容器状态:"
docker-compose ps
echo ""
echo "✅ 部署完成！"
echo "访问: http://121.43.77.213"
DEPLOY_SCRIPT
```

---

## 方案 B：分步手动执行（最稳定）

### 步骤 1：打开本地终端，上传项目

```bash
cd /Users/cen/Desktop/idea/files
scp -o ConnectTimeout=10 video-production-system.tar.gz root@121.43.77.213:/opt/
# 输入密码
```

### 步骤 2：SSH 连接到服务器

```bash
ssh root@121.43.77.213
# 输入密码
```

### 步骤 3：在服务器上执行部署

```bash
# 进入 /opt 目录
cd /opt

# 显示当前文件
ls -la video-production-system.tar.gz

# 清理旧部署
rm -rf video-production-system

# 解压项目
tar -xzf video-production-system.tar.gz

# 进入项目目录
cd video-production-system

# 查看 docker-compose.yml
cat docker-compose.yml | head -20

# 停止旧容器
docker-compose down 2>/dev/null || true

# 等待 DNS 和网络稳定
sleep 3

# 启动容器
docker-compose up -d

# 等待服务启动
echo "等待 30 秒..."
sleep 30

# 查看容器状态
docker-compose ps
```

### 步骤 4：验证部署状态

```bash
# 查看最后 100 行日志
docker-compose logs --tail=100

# 或查看特定日志
docker-compose logs api | tail -50
docker-compose logs mysql | tail -50
docker-compose logs redis | tail -20
```

---

## 🔍 常见问题排查

### 问题 1：镜像拉取超时

**表现**：看到 `context deadline exceeded` 错误

**解决**：
```bash
# 检查镜像配置是否生效
docker info | grep -A 5 "Registry Mirrors"

# 应该显示：
# Registry Mirrors:
#   https://registry.aliyuncs.com/
#   https://hub-mirror.c.163.com/
#   https://mirror.baidubce.com/

# 如果没有显示，重启 Docker
systemctl daemon-reload
systemctl restart docker

# 再次检查
docker info | grep -A 5 "Registry Mirrors"

# 重试启动容器
cd /opt/video-production-system
docker-compose pull --no-parallel
docker-compose up -d
```

### 问题 2：MySQL 初始化卡住

**表现**：API 连不上 MySQL

**解决**：
```bash
# 查看 MySQL 日志
docker-compose logs mysql | tail -100

# 等待更长时间再检查（MySQL 初始化可能需要 60 秒）
sleep 60
docker-compose logs mysql | tail -20

# 如果还是失败，重启 MySQL
docker-compose restart mysql
sleep 30
docker-compose ps
```

### 问题 3：容器不断重启

**表现**：`docker-compose ps` 显示容器状态为 `Restarting (1) 5 seconds ago`

**解决**：
```bash
# 查看容器详细日志
docker-compose logs --tail=200 api | grep -i "error"

# 清理并重新启动
docker-compose down -v
sleep 5
docker-compose up -d

# 实时查看日志
docker-compose logs -f api
```

### 问题 4：端口冲突

**表现**：`bind: address already in use`

**解决**：
```bash
# 查看占用的端口
lsof -i :3000
lsof -i :3306
lsof -i :6379

# 杀死占用的进程
kill -9 <PID>

# 或停止所有容器
docker-compose down -v
sleep 5
docker-compose up -d
```

---

## 🌐 测试和验证

### 1. 测试服务是否正常运行

```bash
# 测试前端（应返回 HTML）
curl -i http://localhost:80

# 测试 API（应返回 200）
curl -i http://localhost:3000/api/health

# 从本地浏览器访问
# 前端: http://121.43.77.213
# API: http://121.43.77.213/api/health
```

### 2. 进入容器内部调试

```bash
# 进入 API 容器
docker exec -it video-api /bin/sh

# 在容器内测试数据库连接
npm list mysql
npm list redis

# 退出容器
exit

# 进入 MySQL 容器
docker exec -it video-mysql mysql -uroot -proot123456

# 查看数据库
SHOW DATABASES;
USE video_production_db;
SHOW TABLES;
exit
```

### 3. 查看实时监控

```bash
# 查看所有容器的资源使用情况
docker stats

# 实时查看 API 日志
docker-compose logs -f api

# 查看所有日志
docker-compose logs -f

# 按 Ctrl+C 停止
```

---

## 📝 Docker Compose 常用命令

```bash
# 启动容器
docker-compose up -d

# 停止容器
docker-compose stop

# 重启容器
docker-compose restart

# 完全删除（包括卷）
docker-compose down -v

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs [service_name]

# 跟踪日志
docker-compose logs -f

# 进入容器
docker exec -it [container_name] /bin/bash

# 构建镜像
docker-compose build

# 拉取镜像
docker-compose pull
```

---

## 🎯 完整验证检查清单

执行以下命令验证每个组件：

```bash
# 1. 检查所有容器都在运行
docker-compose ps | grep "Up"
# 应该看到 4 个 "Up" 的容器

# 2. 检查 MySQL 连接
docker-compose exec -T mysql mysql -uroot -proot123456 -e "SELECT 1;"
# 应该返回 1

# 3. 检查 Redis 连接
docker-compose exec -T redis redis-cli ping
# 应该返回 PONG

# 4. 检查 API 健康状态
docker-compose exec -T api curl http://localhost:3000/api/health
# 应该返回 JSON

# 5. 查看整体状态
echo "=== 容器状态 ===" && docker-compose ps
echo "" && echo "=== 最后 50 行日志 ===" && docker-compose logs --tail=50
```

---

## 🚨 紧急操作

如果一切都崩溃了，这样重置：

```bash
# 完全清理
cd /opt/video-production-system
docker-compose down -v
docker system prune -a --volumes

# 等待 10 秒
sleep 10

# 重新启动
docker-compose up -d

# 等待启动
sleep 30

# 检查状态
docker-compose ps
```

---

## 📞 获取更多日志信息

```bash
# 导出所有日志到文件
docker-compose logs > /opt/deployment.log

# 导出特定服务的日志
docker-compose logs api > /opt/api.log
docker-compose logs mysql > /opt/mysql.log

# 获取完整的系统诊断
echo "=== Docker 版本 ===" > /opt/diagnosis.txt
docker --version >> /opt/diagnosis.txt
echo "" >> /opt/diagnosis.txt
echo "=== Docker Compose 版本 ===" >> /opt/diagnosis.txt
docker-compose --version >> /opt/diagnosis.txt
echo "" >> /opt/diagnosis.txt
echo "=== 容器列表 ===" >> /opt/diagnosis.txt
docker-compose ps >> /opt/diagnosis.txt
echo "" >> /opt/diagnosis.txt
echo "=== 最后 200 行日志 ===" >> /opt/diagnosis.txt
docker-compose logs --tail=200 >> /opt/diagnosis.txt

# 查看诊断文件
cat /opt/diagnosis.txt
```

---

## 💡 提示

- ⏱️ 首次启动可能需要 1-2 分钟，请耐心等待
- 📊 MySQL 初始化可能需要 30-60 秒
- 🔄 如果镜像拉取失败，多试几次（网络问题）
- 📝 所有日志都可以通过 `docker-compose logs` 查看
- 🛡️ 生产环境中记得修改默认密码

---

**需要帮助？** 查看 `DEPLOY_MANUAL.md` 获取更详细的文档。

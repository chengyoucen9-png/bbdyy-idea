# 📋 部署快速参考

## 🎯 您的部署任务

**目标**：将视频生产系统部署到阿里云 ECS  
**服务器**：121.43.77.213 (root 用户)  
**状态**：✅ 所有文件已准备就绪

---

## 🚀 核心部署命令（复制粘贴）

### 第 1 步：打开终端，替换密码后运行

```bash
# 设置您的 SSH 密码
SSH_PASS="your_password_here"

# 上传项目
sshpass -p "$SSH_PASS" scp -o StrictHostKeyChecking=no \
  /Users/cen/Desktop/idea/files/video-production-system.tar.gz \
  root@121.43.77.213:/opt/

# 远程部署并启动
sshpass -p "$SSH_PASS" ssh -o StrictHostKeyChecking=no root@121.43.77.213 << 'CMD'
cd /opt
rm -rf video-production-system
tar -xzf video-production-system.tar.gz
cd video-production-system
docker-compose down -v 2>/dev/null || true
sleep 2
docker-compose up -d
sleep 30
docker-compose ps
CMD
```

### 第 2 步：从浏览器访问

```
http://121.43.77.213
```

---

## 📚 详细文档位置

📄 **快速指南** → [DEPLOY_QUICK.md](./DEPLOY_QUICK.md)  
📄 **完整手册** → [DEPLOY_MANUAL.md](./DEPLOY_MANUAL.md)  
📄 **阿里云指南** → [ALIYUN_DEPLOYMENT.md](./ALIYUN_DEPLOYMENT.md)

---

## 🔧 如果上面命令有问题，使用手动方式

```bash
# 终端 1：上传
scp /Users/cen/Desktop/idea/files/video-production-system.tar.gz root@121.43.77.213:/opt/
# 输入密码

# 终端 2：连接并部署
ssh root@121.43.77.213
# 输入密码
cd /opt && tar -xzf video-production-system.tar.gz && cd video-production-system
docker-compose down -v 2>/dev/null || true && sleep 2
docker-compose up -d && sleep 30
docker-compose ps
```

---

## ✅ 验证部署成功

```bash
# 查看容器状态（应看到 4 个 UP）
docker-compose ps

# 测试前端
curl http://121.43.77.213

# 测试 API
curl http://121.43.77.213/api/health
```

---

## 📊 项目结构

```
video-production-system/
├── backend/              # NestJS API
├── frontend-react/       # React 前端
├── database/             # MySQL 初始化脚本
├── docker-compose.yml    # 容器编排配置
├── DEPLOY_MANUAL.md      # 详细部署手册
├── DEPLOY_QUICK.md       # 快速指南
└── ...
```

---

## 🐳 Docker Compose 服务

| 服务 | 端口 | 用途 |
|------|------|------|
| mysql | 3306 | 数据库 |
| redis | 6379 | 缓存 |
| api | 3000 | 后端 API |
| frontend | 80 | 前端服务 |

---

## 🛠️ 故障排查

**镜像拉取超时？**
```bash
docker-compose pull --no-parallel
```

**容器不启动？**
```bash
docker-compose logs --tail=100
```

**需要重新部署？**
```bash
docker-compose down -v
docker-compose up -d
```

---

## 💾 文件清单

✅ docker-compose.yml - 容器配置  
✅ backend/ - API 源代码 + Dockerfile  
✅ frontend-react/ - 前端源代码 + Dockerfile  
✅ database/schema.sql - 数据库初始化脚本  
✅ DEPLOY_QUICK.md - 本文档  
✅ DEPLOY_MANUAL.md - 详细手册  

---

**准备好了？从第 1 步开始！**

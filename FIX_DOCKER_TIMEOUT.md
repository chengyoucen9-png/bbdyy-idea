# 🔧 在阿里云服务器上执行的修复步骤

您已经SSH连接到服务器。**直接在服务器终端执行以下命令**：

## 第1步：重配置 Docker 镜像源

```bash
# 创建/修改 Docker daemon.json
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "registry-mirrors": [
    "https://registry.aliyuncs.com/",
    "https://hub-mirror.c.163.com/",
    "https://mirror.baidubce.com/",
    "https://docker.nju.edu.cn/",
    "https://registry.docker-cn.com"
  ],
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# 验证配置
cat /etc/docker/daemon.json
```

## 第2步：重启 Docker 服务

```bash
# 重新加载配置
sudo systemctl daemon-reload

# 重启 Docker
sudo systemctl restart docker

# 等待启动
sleep 5

# 验证镜像源已配置
docker info | grep -A 10 "Registry Mirrors"
```

## 第3步：测试镜像拉取

```bash
# 尝试拉取小镜像进行测试
docker pull alpine:latest

# 如果成功，再测试主镜像
docker pull mysql:8.0

# 如果都成功了，拉取其他镜像
docker pull redis:7-alpine
docker pull node:20-alpine
```

## 第4步：启动容器

```bash
# 进入项目目录
cd /opt/video-production-system

# 停止旧容器
docker-compose down -v

# 等待
sleep 3

# 启动新容器
docker-compose up -d

# 等待容器启动
sleep 30

# 检查状态
docker-compose ps
```

## 第5步：验证部署

```bash
# 查看日志
docker-compose logs --tail=50

# 测试前端
curl http://localhost:80

# 测试 API
curl http://localhost:3000/api/health
```

---

## 📌 快速版本（一行命令执行所有）

```bash
sudo mkdir -p /etc/docker && \
sudo tee /etc/docker/daemon.json > /dev/null << 'CONFIG' && \
{
  "registry-mirrors": [
    "https://registry.aliyuncs.com/",
    "https://hub-mirror.c.163.com/",
    "https://mirror.baidubce.com/"
  ]
}
CONFIG
sudo systemctl daemon-reload && \
sudo systemctl restart docker && \
sleep 5 && \
docker info | grep -A 5 "Registry Mirrors" && \
cd /opt/video-production-system && \
docker-compose down -v 2>/dev/null || true && \
sleep 2 && \
docker-compose up -d && \
sleep 30 && \
docker-compose ps
```

---

## 🔍 如果仍然超时，尝试这些替代方案

### 方案 A：使用不同的镜像仓库

```bash
# 编辑 docker-compose.yml，修改所有 image 字段中的仓库：
# 从: image: mysql:8.0
# 改为: image: registry.aliyuncs.com/aliyun_cloud/mysql:8.0
```

### 方案 B：手动拉取和加标签

```bash
# 从中科大镜像源拉取（如果阿里云仍然超时）
docker pull docker.nju.edu.cn/mysql:8.0
docker tag docker.nju.edu.cn/mysql:8.0 mysql:8.0

docker pull docker.nju.edu.cn/redis:7-alpine
docker tag docker.nju.edu.cn/redis:7-alpine redis:7-alpine

docker pull docker.nju.edu.cn/node:20-alpine
docker tag docker.nju.edu.cn/node:20-alpine node:20-alpine

# 然后启动 docker-compose
cd /opt/video-production-system
docker-compose up -d
```

### 方案 C：增加 Docker 拉取超时

```bash
# 修改 /etc/docker/daemon.json，添加超时和重试设置
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "registry-mirrors": [
    "https://registry.aliyuncs.com/",
    "https://hub-mirror.c.163.com/"
  ],
  "registry-http-addr-timeout": "120s",
  "http-proxy": "",
  "https-proxy": ""
}
EOF

sudo systemctl daemon-reload && sudo systemctl restart docker
```

---

## ✅ 验证成功的标志

- [ ] `docker info` 显示 Registry Mirrors 已配置
- [ ] `docker-compose ps` 显示所有 4 个容器状态为 UP
- [ ] `docker-compose logs` 无错误信息
- [ ] `curl http://localhost:80` 返回 HTML
- [ ] `curl http://localhost:3000/api/health` 返回 JSON

---

## 📞 如果问题仍未解决

1. **检查系统网络**
   ```bash
   # 检查网络连接
   ping -c 2 8.8.8.8
   ping -c 2 registry.aliyuncs.com
   
   # 检查 DNS
   nslookup registry.aliyuncs.com
   ```

2. **查看详细错误日志**
   ```bash
   # Docker 系统日志
   journalctl -u docker -n 100 --no-pager
   
   # Docker Compose 详细日志
   cd /opt/video-production-system
   docker-compose logs --tail=200
   ```

3. **尝试禁用镜像源（仅用于测试）**
   ```bash
   # 临时禁用，直接从官方拉取（可能很慢或失败，但能诊断问题）
   sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
   {}
   EOF
   
   sudo systemctl restart docker
   docker-compose pull --no-parallel
   ```

**现在回到您的终端，执行上面的命令！** 👇

# ⚡ 快速修复指南 - 在您的服务器终端执行

您已经连接到服务器 (`root@iZbp1exmw9pxw6gza8tdu7Z`)

## 🎯 问题
```
ERROR: Get "https://registry-1.docker.io/v2/": net/http: request canceled while waiting for connection
```
**原因**：Docker 镜像拉取超时，需要配置国内镜像源

---

## ⚡ 一键修复（复制整个命令块，粘贴到服务器终端）

```bash
sudo mkdir -p /etc/docker && \
sudo tee /etc/docker/daemon.json > /dev/null << 'CONFIG'
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
docker info | grep -A 5 "Registry Mirrors"
```

---

## 📍 分步执行版本

如果上面的一键变量进不了，**逐行执行**这些命令：

### 步骤 1️⃣：创建 Docker 配置

```bash
sudo mkdir -p /etc/docker
```

### 步骤 2️⃣：写入镜像源配置

```bash
sudo cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://registry.aliyuncs.com/",
    "https://hub-mirror.c.163.com/",
    "https://mirror.baidubce.com/"
  ]
}
EOF
```

### 步骤 3️⃣：验证配置文件

```bash
cat /etc/docker/daemon.json
```

应该显示：
```json
{
  "registry-mirrors": [
    "https://registry.aliyuncs.com/",
    "https://hub-mirror.c.163.com/",
    "https://mirror.baidubce.com/"
  ]
}
```

### 步骤 4️⃣：重启 Docker

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
sleep 5
```

### 步骤 5️⃣：验证镜像源已启用

```bash
docker info | grep -A 5 "Registry Mirrors"
```

应该显示镜像源列表，例如：
```
Registry Mirrors:
  https://registry.aliyuncs.com/
  https://hub-mirror.c.163.com/
  https://mirror.baidubce.com/
```

### 步骤 6️⃣：测试镜像拉取

```bash
docker pull alpine:latest
```

成功的话会看到：
```
latest: Pulling from library/alpine
...
Status: Downloaded newer image for alpine:latest
```

### 步骤 7️⃣：启动项目容器

```bash
cd /opt/video-production-system
docker-compose down -v 2>/dev/null || true
sleep 2
docker-compose up -d
sleep 30
docker-compose ps
```

### 步骤 8️⃣：查看日志确认无错误

```bash
docker-compose logs --tail=50
```

---

## 🔍 故障排查

### 问题 1️⃣：镜像拉取仍然失败

**可能原因**：网络问题或镜像源已失效

**解决方案**：
```bash
# 清理 Docker 缓存
docker system prune -a

# 尝试其他镜像源
sudo cat > /etc/docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://hub-mirror.c.163.com/",
    "https://mirror.baidubce.com/",
    "https://docker.nju.edu.cn/"
  ]
}
EOF

sudo systemctl restart docker
sleep 5
docker pull alpine:latest
```

### 问题 2️⃣：Docker 命令找不到

```bash
# 检查 Docker 是否安装
which docker

# 如果未安装，需要先安装
sudo apt update
sudo apt install docker.io docker-compose -y
```

### 问题 3️⃣：权限拒绝

如果显示 "Got permission denied"：

```bash
# 检查当前用户是否在 docker 组中
groups

# 如果不在，添加到 docker 组
sudo usermod -aG docker $USER

# 需要注销并重新登录，或者使用 sudo
sudo systemctl restart docker
```

---

## ✅ 成功的标志

```bash
# 执行这些命令应该都成功

# 1. Docker 镜像源已配置
docker info | grep "Registry Mirrors"

# 2. 所有容器都在运行
docker-compose ps

# 3. 前端可访问
curl http://localhost:80

# 4. API 可访问
curl http://localhost:3000/api/health

# 5. 从外部可访问
curl http://121.43.77.213
```

---

## 🚨 最坏的情况 - 完全重置

如果一切都不工作，**清空并重新开始**：

```bash
# 停止所有容器
docker-compose down -v

# 清理所有镜像和缓存
docker system prune -a --volumes -f

# 完全删除项目
cd /opt
rm -rf video-production-system*

# 重新上传和部署
# （从本地计算机执行：scp video-production-system-final.tar.gz root@121.43.77.213:/opt/）

# 在服务器上重新配置
cd /opt
tar -xzf video-production-system-final.tar.gz
cd video-production-system
docker-compose up -d
```

---

## 📞 需要进阶帮助？

如果上述都不行，收集诊断信息：

```bash
cat > /tmp/diagnose.txt << 'DIAG'
=== 系统信息 ===
uname -a

=== Docker 信息 ===
docker --version
docker info

=== 网络诊断 ===
nslookup registry.aliyuncs.com
ping -c 2 registry.aliyuncs.com

=== 容器日志 ===
docker-compose logs --tail=100

=== Docker 系统日志 ===
journalctl -u docker -n 50
DIAG

bash /tmp/diagnose.txt
```

---

## 👉 现在就行动！

1. **复制上面"一键修复"的命令块**
2. **粘贴到您的服务器终端**
3. **按 Enter 执行**
4. **等待 1-2 分钟**
5. **看到 "✅ 修复完成" 就成功了**

**祝您部署顺利！** 🎉

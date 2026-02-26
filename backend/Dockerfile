FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装全部依赖（包含 devDependencies，用于构建）
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# ────────────────────────────────────────────
# 生产阶段（仅保留运行时必要文件）
# ────────────────────────────────────────────
FROM node:18-alpine

WORKDIR /app

# 安装 FFmpeg（视频转写需要）
RUN apk add --no-cache ffmpeg

# 只安装生产依赖
COPY package*.json ./
RUN npm ci --only=production

# 复制构建产物
COPY --from=builder /app/dist ./dist

# 确保 uploads 目录存在
RUN mkdir -p /app/uploads

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/main.js"]

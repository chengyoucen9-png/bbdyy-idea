FROM node:18-alpine AS builder

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装全部依赖（含 devDependencies，构建阶段需要 @nestjs/cli）
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM node:18-alpine

WORKDIR /app

# 安装FFmpeg
RUN apk add --no-cache ffmpeg

# 复制依赖和构建产物
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/main.js"]

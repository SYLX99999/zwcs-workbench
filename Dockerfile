# 自有服务器 / 云主机部署（Docker）
# 构建并运行（推荐用 docker-compose，见 docker-compose.yml）：
#   docker compose up -d --build
# 数据持久化：容器 /app/server 通过 volume 挂到宿主机，重启不丢工资/报名数据。
FROM node:18-alpine

WORKDIR /app

# 仅先拷 package.json（利用层缓存，虽零依赖也保持规范）
COPY package.json ./

# 拷贝全部代码（.dockerignore 已排除 data.json / node_modules / test 等）
COPY . .

# 降权运行，避免容器以 root 跑业务进程
RUN chown -R node:node /app
USER node

EXPOSE 8080

# 健康检查：Render / docker 可据此判断存活
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/ping || exit 1

# PORT/HOST 均可由环境变量覆盖；容器内默认 8080 / 0.0.0.0
CMD ["node", "server/server.js"]

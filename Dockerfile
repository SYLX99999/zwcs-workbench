# 云主机 / 容器部署（自有服务器、阿里云、腾讯云、K8s 等）
# 构建：docker build -t zwcs-workbench ./workbench
# 运行：docker run -d --name zwcs -p 8080:8080 zwcs-workbench
# 数据持久化（重要）：把宿主机目录挂载到 /app/server/data.json 所在位置，
# 例如：docker run -d -v /data/zwcs:/app/server -p 8080:8080 zwcs-workbench
FROM node:18-alpine
WORKDIR /app
COPY package.json ./
COPY . .
EXPOSE 8080
CMD ["node", "server/server.js"]

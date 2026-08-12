# 自有服务器部署手册（复制粘贴即可）

适用：你有一台 **Linux 云服务器**（阿里云/腾讯云/华为云 ECS、轻量应用服务器等，有公网 IP）。
方式：Docker 一键起，数据用卷持久化（重启不丢工资/报名数据）。

---

## 一、在服务器上执行（SSH 进服务器，或厂商 Web 终端）

### 1) 装 Docker（如果服务器还没装）
```bash
curl -fsSL https://get.daocloud.io/docker | sh
# 或者用官方： curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
```

### 2) 拉代码 + 启动
```bash
# 没有 git 就先： sudo apt update && sudo apt install -y git
git clone https://github.com/SYLX99999/zwcs-workbench.git
cd zwcs-workbench
docker compose up -d --build
```

### 3) 确认跑起来了
```bash
docker compose ps
curl -s http://127.0.0.1:80/api/ping
# 看到 {"ok":true,...} 就成功了
```

### 4) 打开使用
浏览器访问 **http://<你的服务器公网IP>** 即可。
登录：管理员 `HQ0001` / `888888`，财务 `HQ0002` / `888888`。

---

## 二、以后怎么更新 / 重启

```bash
cd zwcs-workbench
git pull
docker compose up -d --build
```

数据在 `zwcs-data` 卷里，更新、重启都不会丢。

---

## 三、想用域名 + HTTPS（登录更安全，推荐）

最简单：把域名解析到服务器 IP，然后套 **Cloudflare**（免费）开启 HTTPS；
或服务器上用 nginx + certbot 申请证书（免费）。需要我给具体步骤再说。

---

## 四、端口说明
- 容器内后端跑 `8080`；`docker-compose.yml` 已把宿主机 `80` 映射到 `8080`。
- 想换端口：改 `docker-compose.yml` 里 `"80:8080"` 的 `80` 部分（如 `"9000:8080"`），
  然后访问 `http://<IP>:9000`。

## 五、排查
```bash
docker compose logs -f      # 看后端日志
docker compose restart     # 重启
docker compose down        # 停止（数据仍在卷里）
```

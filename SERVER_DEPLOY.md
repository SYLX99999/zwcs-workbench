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

## 三、域名 + HTTPS（Cloudflare 免费，最简单）

前提：服务器已能 `http://<公网IP>` 打开（见上）。以下步骤让 `https://你的域名` 可用。

1. 打开 https://www.cloudflare.com ，注册并「Add a Site」填入你的域名。
2. Cloudflare 会给你两个 DNS 地址，去你的**域名注册商**（阿里云/腾讯云等）
   把域名的 Nameserver 改成 Cloudflare 给的那两个（改一次即可）。
3. 在 Cloudflare 的 DNS 页面，添加一条 **A 记录**：
   - Name：`@`（或 `www`，看你想要什么前缀）
   - IPv4：你的服务器**公网 IP**
   - 代理状态：点亮（橙色云 ☁️）
4. 等几分钟（DNS 生效），再进 Cloudflare「SSL/TLS」→ 选 **Full** 或 **Flexible**，
   并打开「Always Use HTTPS」。
5. 浏览器访问 `https://你的域名` —— 已是加密连接，登录更安全。

> 说明：Cloudflare 负责对外 HTTPS；它与服务器之间是走 80 端口的（服务器 docker 监听 80）。
> 这样你完全不用在服务器上管证书，Cloudflare 自动续期。

### 备选：服务器本地 nginx + certbot（不想动 DNS 时用）
不赘述，需要我再给步骤。

## 四、零命令开机自部署（推荐给不想敲命令的情况）

买服务器时，把仓库里的 **`deploy-boot.sh`** 内容整体粘贴到厂商的
「自定义数据 / 用户数据 / 启动脚本」框（脚本模式）。服务器首次开机即自动
安装 Docker、拉代码、启动服务，装完直接用 IP 访问，再按上面第三步加 HTTPS。

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

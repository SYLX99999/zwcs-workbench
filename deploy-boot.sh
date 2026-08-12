#!/bin/bash
# ============================================================
# 云服务器「用户数据 / 启动脚本」(cloud-init)
# 用法：买服务器时，把本文件内容整体粘贴到
#       「自定义数据 / 用户数据 / 启动脚本」框里（选"脚本"模式）。
# 服务器首次开机就会自动：装 Docker → 拉代码 → 起服务。
# 装完即可用 http://<服务器公网IP> 访问；再用 Cloudflare 加 HTTPS。
# ============================================================
set -e
export DEBIAN_FRONTEND=noninteractive

# 1) 基础工具
apt-get update -y
apt-get install -y git curl

# 2) 安装 Docker（国内镜像源，速度快）
curl -fsSL https://get.daocloud.io/docker | sh
systemctl enable --now docker

# 3) 拉代码（公开仓库，无需账号）
rm -rf /opt/zwcs-workbench
git clone https://github.com/SYLX99999/zwcs-workbench.git /opt/zwcs-workbench
cd /opt/zwcs-workbench

# 4) 启动（宿主机 80 → 容器 8080；zwcs-data 卷持久化数据）
docker compose up -d --build

# 5) 自检
sleep 6
curl -s http://127.0.0.1/api/ping || true
echo "部署脚本执行完毕"

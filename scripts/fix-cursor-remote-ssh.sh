#!/usr/bin/env bash
# 修复 Cursor Remote SSH 在 192.168.52.65 上安装 server 失败的问题。
#
# 根因：SSH 登录用户是 root，但 login shell 的 HOME=/home/node；
#       安装脚本期望 /home/node/.cursor-server，SCP 却写到 /root/.cursor-server。
#
# 用法: ./scripts/fix-cursor-remote-ssh.sh

set -euo pipefail

SSH_HOST="root@192.168.52.65"
SSH_PORT="10112"
SSH_OPTS=(-p "${SSH_PORT}" -o "StrictHostKeyChecking=accept-new")

echo "正在修复远程主机 ${SSH_HOST}:${SSH_PORT} 上的 Cursor server 环境..."
echo "（需要输入 SSH 密码）"
echo ""

ssh -t "${SSH_OPTS[@]}" "${SSH_HOST}" 'bash -s' <<'REMOTE'
set -euo pipefail

CURSOR_DIR="/home/node/.cursor-server"

echo "==> 当前环境"
echo "    id: $(id)"
echo "    login HOME: ${HOME:-<unset>}"
echo "    root HOME: $(getent passwd root | cut -d: -f6)"

echo "==> 停止旧的 cursor-server 进程"
pkill -f '.cursor-server' 2>/dev/null || true

echo "==> 创建正确的安装目录"
mkdir -p "${CURSOR_DIR}"
chmod 755 "${CURSOR_DIR}"
chown -R node:node "${CURSOR_DIR}" 2>/dev/null || true

echo "==> 建立 root 到 node 目录的符号链接（修复 SCP 路径不一致）"
if [[ -e /root/.cursor-server && ! -L /root/.cursor-server ]]; then
  echo "    备份已有 /root/.cursor-server"
  mv /root/.cursor-server "/root/.cursor-server.bak.$(date +%s)"
fi
ln -sfn "${CURSOR_DIR}" /root/.cursor-server

echo "==> 清理残留锁文件和临时包"
rm -rf /tmp/cursor-remote-lock.* /tmp/cursor-server-*.tar.gz
rm -f "${CURSOR_DIR}"/cursor-server-*.tar.gz

echo "==> 检查磁盘空间"
df -h /home/node /root 2>/dev/null | tail -2 || df -h ~

echo "==> 完成。目录状态:"
ls -la /home/node/.cursor-server
ls -la /root/.cursor-server
REMOTE

echo ""
echo "修复完成。请在 Cursor 中："
echo "  1. Cmd+Shift+P -> Remote-SSH: Kill VS Code Server on Host... -> 192.168.52.65"
echo "  2. 重新连接 root@192.168.52.65:10112"
echo ""
echo "首次连接会本地下载约 107MB 并 SCP 到 /home/node/.cursor-server，请耐心等待。"

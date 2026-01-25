#!/bin/bash

# 启动本地n8n实例（使用npx）
# 用法: ./start-n8n-local.sh

echo "=================================="
echo "启动本地n8n实例"
echo "=================================="

echo ""
echo "n8n将在后台运行于: http://localhost:5678"
echo ""
echo "按Ctrl+C停止"
echo ""

# 使用npx运行n8n
npx n8n start \
  --tunnel \
  2>&1 | tee n8n.log

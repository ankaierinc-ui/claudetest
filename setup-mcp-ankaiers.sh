#!/bin/bash

# 配置MCP连接到 n8n.ankaiers.com
# 用法: ./setup-mcp-ankaiers.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}==================================="
echo "配置MCP连接到您的n8n实例"
echo "n8n URL: https://n8n.ankaiers.com"
echo -e "===================================${NC}\n"

# Claude Code配置目录
CLAUDE_CONFIG_DIR="$HOME/.config/claude-code"
MCP_CONFIG_FILE="$CLAUDE_CONFIG_DIR/mcp_settings.json"

# 创建配置目录
if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
    echo -e "${YELLOW}创建Claude Code配置目录...${NC}"
    mkdir -p "$CLAUDE_CONFIG_DIR"
fi

# 备份现有配置
if [ -f "$MCP_CONFIG_FILE" ]; then
    echo -e "${YELLOW}备份现有配置...${NC}"
    cp "$MCP_CONFIG_FILE" "$MCP_CONFIG_FILE.backup.$(date +%s)"
    echo -e "${GREEN}✓ 备份已保存${NC}"
fi

# 获取API Key
echo -e "\n${YELLOW}请输入您的n8n API Key:${NC}"
echo "（从 https://n8n.ankaiers.com → Settings → API → Create API Key 获取）"
echo ""
read -sp "API Key: " N8N_API_KEY
echo ""

if [ -z "$N8N_API_KEY" ]; then
    echo -e "${RED}错误: API Key不能为空${NC}"
    exit 1
fi

# 创建MCP配置
echo -e "\n${YELLOW}创建MCP配置...${NC}"

cat > "$MCP_CONFIG_FILE" <<EOF
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "N8N_API_URL": "https://n8n.ankaiers.com",
        "N8N_API_KEY": "$N8N_API_KEY",
        "N8N_MCP_TELEMETRY_DISABLED": "true"
      }
    }
  }
}
EOF

echo -e "${GREEN}✓ 配置已保存到: $MCP_CONFIG_FILE${NC}"

# 禁用遥测
echo -e "\n${YELLOW}禁用n8n-mcp遥测...${NC}"
npx n8n-mcp telemetry disable 2>/dev/null || true

echo -e "\n${GREEN}==================================="
echo "✓ 配置完成！"
echo -e "===================================${NC}\n"

echo "下一步："
echo "1. 重启Claude Code以加载MCP配置"
echo "2. 在Claude Code中测试:"
echo "   \"请列出n8n中的所有工作流\""
echo ""
echo "3. 查看配置:"
echo "   cat $MCP_CONFIG_FILE"
echo ""
echo -e "${YELLOW}提示: 如果遇到问题，查看 N8N-MCP-SETUP.md 了解故障排除${NC}"

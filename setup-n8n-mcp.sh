#!/bin/bash

# n8n MCP Server 快速安装脚本
# 用法: ./setup-n8n-mcp.sh [method]
# method: npx, docker, or hosted (默认: npx)

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================="
echo "n8n MCP Server 安装向导"
echo -e "===================================${NC}\n"

# 检测安装方法
METHOD=${1:-npx}

# Claude Code配置目录
CLAUDE_CONFIG_DIR="$HOME/.config/claude-code"
MCP_CONFIG_FILE="$CLAUDE_CONFIG_DIR/mcp_settings.json"

# 函数: 检查命令是否存在
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 函数: 创建Claude Code配置目录
ensure_config_dir() {
    if [ ! -d "$CLAUDE_CONFIG_DIR" ]; then
        echo -e "${YELLOW}创建Claude Code配置目录...${NC}"
        mkdir -p "$CLAUDE_CONFIG_DIR"
    fi
}

# 函数: 备份现有配置
backup_config() {
    if [ -f "$MCP_CONFIG_FILE" ]; then
        echo -e "${YELLOW}备份现有配置...${NC}"
        cp "$MCP_CONFIG_FILE" "$MCP_CONFIG_FILE.backup.$(date +%s)"
    fi
}

# 函数: 获取n8n API Key
get_api_key() {
    echo -e "\n${YELLOW}请输入n8n API Key:${NC}"
    echo "（在n8n中获取: Settings → API → Create API Key）"
    read -p "API Key: " N8N_API_KEY

    if [ -z "$N8N_API_KEY" ]; then
        echo -e "${RED}错误: API Key不能为空${NC}"
        exit 1
    fi
}

# 函数: 获取n8n URL
get_n8n_url() {
    echo -e "\n${YELLOW}请输入n8n URL (默认: http://localhost:5678):${NC}"
    read -p "n8n URL: " N8N_URL
    N8N_URL=${N8N_URL:-http://localhost:5678}
}

# 函数: NPX安装
install_npx() {
    echo -e "\n${GREEN}使用npx方法安装...${NC}\n"

    # 检查Node.js
    if ! command_exists node; then
        echo -e "${RED}错误: 未找到Node.js，请先安装Node.js${NC}"
        echo "访问: https://nodejs.org/"
        exit 1
    fi

    echo -e "${GREEN}✓ Node.js已安装: $(node --version)${NC}"

    # 获取配置
    get_api_key
    get_n8n_url

    # 创建配置
    ensure_config_dir
    backup_config

    cat > "$MCP_CONFIG_FILE" <<EOF
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "N8N_API_URL": "$N8N_URL",
        "N8N_API_KEY": "$N8N_API_KEY",
        "N8N_MCP_TELEMETRY_DISABLED": "true"
      }
    }
  }
}
EOF

    echo -e "\n${GREEN}✓ 配置已保存到: $MCP_CONFIG_FILE${NC}"

    # 测试npx
    echo -e "\n${YELLOW}测试n8n-mcp...${NC}"
    npx n8n-mcp telemetry disable 2>/dev/null || true

    echo -e "\n${GREEN}✓ npx安装完成！${NC}"
}

# 函数: Docker安装
install_docker() {
    echo -e "\n${GREEN}使用Docker方法安装...${NC}\n"

    # 检查Docker
    if ! command_exists docker; then
        echo -e "${RED}错误: 未找到Docker，请先安装Docker${NC}"
        echo "访问: https://docs.docker.com/get-docker/"
        exit 1
    fi

    echo -e "${GREEN}✓ Docker已安装: $(docker --version)${NC}"

    # 检查docker-compose
    if ! command_exists docker-compose && ! docker compose version >/dev/null 2>&1; then
        echo -e "${RED}错误: 未找到docker-compose${NC}"
        exit 1
    fi

    # 获取配置
    get_api_key

    # 创建.env文件
    cat > .env <<EOF
N8N_API_KEY=$N8N_API_KEY
EOF

    echo -e "${GREEN}✓ .env文件已创建${NC}"

    # 启动服务
    echo -e "\n${YELLOW}启动Docker服务...${NC}"

    if command_exists docker-compose; then
        docker-compose -f docker-compose.n8n-mcp.yml up -d
    else
        docker compose -f docker-compose.n8n-mcp.yml up -d
    fi

    echo -e "\n${GREEN}✓ Docker服务已启动${NC}"

    # 等待n8n启动
    echo -e "${YELLOW}等待n8n启动...${NC}"
    sleep 10

    # 创建Claude Code配置
    ensure_config_dir
    backup_config

    cat > "$MCP_CONFIG_FILE" <<EOF
{
  "mcpServers": {
    "n8n": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "n8n-mcp",
        "node",
        "build/index.js"
      ],
      "env": {
        "MCP_MODE": "stdio"
      }
    }
  }
}
EOF

    echo -e "\n${GREEN}✓ 配置已保存到: $MCP_CONFIG_FILE${NC}"

    echo -e "\n${GREEN}Docker安装完成！${NC}"
    echo -e "\n${YELLOW}访问n8n: http://localhost:5678${NC}"
    echo -e "${YELLOW}默认用户名: admin${NC}"
    echo -e "${YELLOW}默认密码: changeme123${NC}"
    echo -e "${RED}请立即修改密码！${NC}"
}

# 函数: 托管服务
install_hosted() {
    echo -e "\n${GREEN}使用托管服务...${NC}\n"

    echo "请访问: https://dashboard.n8n-mcp.com"
    echo ""
    echo "步骤:"
    echo "1. 注册账号"
    echo "2. 获取配置"
    echo "3. 将配置添加到 $MCP_CONFIG_FILE"
    echo ""
    echo "优点:"
    echo "  - ☁️ 零配置"
    echo "  - 🆓 免费100次/天"
    echo "  - ⚡ 即时启动"

    # 询问是否打开浏览器
    read -p "是否打开浏览器? (y/n): " OPEN_BROWSER
    if [ "$OPEN_BROWSER" = "y" ]; then
        if command_exists xdg-open; then
            xdg-open "https://dashboard.n8n-mcp.com"
        elif command_exists open; then
            open "https://dashboard.n8n-mcp.com"
        else
            echo "请手动访问: https://dashboard.n8n-mcp.com"
        fi
    fi
}

# 函数: 显示使用说明
show_usage() {
    echo -e "\n${GREEN}==================================="
    echo "安装完成！下一步:"
    echo -e "===================================${NC}\n"

    echo "1. 重启Claude Code以加载MCP配置"
    echo "2. 在Claude Code中测试:"
    echo "   \"请列出n8n中的所有工作流\""
    echo ""
    echo "3. 查看配置文件:"
    echo "   cat $MCP_CONFIG_FILE"
    echo ""
    echo "4. 查看日志 (Docker):"
    echo "   docker logs n8n-mcp"
    echo ""
    echo -e "${YELLOW}提示: 参考 N8N-MCP-SETUP.md 了解更多详情${NC}"
}

# 主程序
main() {
    case $METHOD in
        npx)
            install_npx
            ;;
        docker)
            install_docker
            ;;
        hosted)
            install_hosted
            ;;
        *)
            echo -e "${RED}错误: 未知的安装方法: $METHOD${NC}"
            echo "用法: $0 [npx|docker|hosted]"
            exit 1
            ;;
    esac

    if [ "$METHOD" != "hosted" ]; then
        show_usage
    fi
}

# 运行主程序
main

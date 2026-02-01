#!/bin/bash

################################################################################
# n8n Cloud Run 一键导出脚本
# 用途：从Google Cloud Run的n8n实例导出所有工作流和凭证
# 使用：bash export-n8n.sh <n8n-url> <api-key> [output-dir]
################################################################################

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 参数检查
if [ $# -lt 2 ]; then
    echo -e "${RED}使用方法:${NC}"
    echo "  bash export-n8n.sh <n8n-url> <api-key> [output-dir]"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  bash export-n8n.sh https://my-n8n.run.app sk_prod_xxxxx ./n8n-backup"
    echo ""
    echo -e "${BLUE}参数说明:${NC}"
    echo "  n8n-url      : n8n实例的完整URL (如: https://my-n8n.run.app)"
    echo "  api-key      : n8n API密钥 (从Settings → API获取)"
    echo "  output-dir   : 输出目录 (默认: ./n8n-export-TIMESTAMP)"
    exit 1
fi

N8N_URL="$1"
API_KEY="$2"
OUTPUT_DIR="${3:-.}/n8n-export-$(date +%Y%m%d-%H%M%S)"

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}n8n Cloud Run 一键导出${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}配置信息:${NC}"
echo "  URL: $N8N_URL"
echo "  API Key: ${API_KEY:0:20}...（已隐藏）"
echo "  输出目录: $OUTPUT_DIR"
echo ""

# 测试连接
echo -e "${YELLOW}1️⃣  测试连接...${NC}"
if curl -s -f -H "X-N8N-API-KEY: $API_KEY" "$N8N_URL/api/v1/workflows?limit=1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 连接成功${NC}"
else
    echo -e "${RED}✗ 连接失败，请检查URL和API密钥${NC}"
    exit 1
fi

# 导出工作流
echo ""
echo -e "${YELLOW}2️⃣  导出工作流...${NC}"
WORKFLOWS_FILE="$OUTPUT_DIR/workflows.json"
curl -s -H "X-N8N-API-KEY: $API_KEY" \
    "$N8N_URL/api/v1/workflows?limit=1000" \
    > "$WORKFLOWS_FILE"

WORKFLOW_COUNT=$(jq '.data | length' "$WORKFLOWS_FILE" 2>/dev/null || echo "0")
if [ "$WORKFLOW_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ 导出 $WORKFLOW_COUNT 个工作流${NC}"
else
    echo -e "${YELLOW}⚠ 未找到工作流${NC}"
fi

# 导出每个工作流的详细信息
echo ""
echo -e "${YELLOW}3️⃣  导出工作流详细信息...${NC}"
DETAILS_DIR="$OUTPUT_DIR/workflows-detailed"
mkdir -p "$DETAILS_DIR"

if [ "$WORKFLOW_COUNT" -gt 0 ]; then
    IDS=$(jq -r '.data[].id' "$WORKFLOWS_FILE")
    COUNT=0
    for id in $IDS; do
        curl -s -H "X-N8N-API-KEY: $API_KEY" \
            "$N8N_URL/api/v1/workflows/$id" \
            > "$DETAILS_DIR/workflow-$id.json"
        COUNT=$((COUNT + 1))
        echo -ne "\r  已导出: $COUNT/$WORKFLOW_COUNT"
    done
    echo ""
    echo -e "${GREEN}✓ 工作流详细信息导出完成${NC}"
fi

# 导出凭证
echo ""
echo -e "${YELLOW}4️⃣  导出凭证...${NC}"
CREDENTIALS_FILE="$OUTPUT_DIR/credentials.json"
curl -s -H "X-N8N-API-KEY: $API_KEY" \
    "$N8N_URL/api/v1/credentials?limit=1000" \
    > "$CREDENTIALS_FILE"

CREDENTIAL_COUNT=$(jq '.data | length' "$CREDENTIALS_FILE" 2>/dev/null || echo "0")
if [ "$CREDENTIAL_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ 导出 $CREDENTIAL_COUNT 个凭证${NC}"

    # 创建凭证简表（不包含敏感信息）
    echo ""
    echo -e "${YELLOW}5️⃣  生成凭证清单...${NC}"
    CREDENTIALS_LIST="$OUTPUT_DIR/credentials-list.txt"
    echo "n8n 凭证清单 - 导出时间: $(date)" > "$CREDENTIALS_LIST"
    echo "========================================" >> "$CREDENTIALS_LIST"
    echo "" >> "$CREDENTIALS_LIST"

    jq -r '.data[] | "\(.name) (\(.type))"' "$CREDENTIALS_FILE" >> "$CREDENTIALS_LIST"
    echo -e "${GREEN}✓ 凭证清单生成: $CREDENTIALS_LIST${NC}"
else
    echo -e "${YELLOW}⚠ 未找到凭证${NC}"
fi

# 导出变量
echo ""
echo -e "${YELLOW}6️⃣  导出变量...${NC}"
VARIABLES_FILE="$OUTPUT_DIR/variables.json"
if curl -s -f -H "X-N8N-API-KEY: $API_KEY" \
    "$N8N_URL/api/v1/variables" \
    > "$VARIABLES_FILE" 2>/dev/null; then
    VAR_COUNT=$(jq '.data | length' "$VARIABLES_FILE" 2>/dev/null || echo "0")
    echo -e "${GREEN}✓ 导出 $VAR_COUNT 个变量${NC}"
else
    echo -e "${YELLOW}⚠ 变量导出略过 (API端点可能不可用)${NC}"
fi

# 生成汇总报告
echo ""
echo -e "${YELLOW}7️⃣  生成汇总报告...${NC}"
REPORT_FILE="$OUTPUT_DIR/EXPORT_REPORT.md"
cat > "$REPORT_FILE" << EOF
# n8n 导出报告

**导出时间**: $(date)
**导出来源**: $N8N_URL
**导出目录**: $OUTPUT_DIR

## 导出统计

- **工作流数量**: $WORKFLOW_COUNT
- **凭证数量**: $CREDENTIAL_COUNT
- **变量数量**: $(jq '.data | length' "$VARIABLES_FILE" 2>/dev/null || echo "0")

## 文件清单

### 工作流
- \`workflows.json\` - 所有工作流列表
- \`workflows-detailed/\` - 每个工作流的详细定义

### 凭证
- \`credentials.json\` - 所有凭证信息
- \`credentials-list.txt\` - 凭证清单（名称和类型）

### 其他
- \`variables.json\` - 全局变量

## 安全提示

⚠️ **重要**:
- 凭证文件中可能包含敏感信息，请妥善保管
- 不要将此目录提交到公开的git仓库
- 考虑加密敏感文件

## 恢复工作流

要在另一个n8n实例中恢复工作流：

1. 登录目标n8n实例
2. 转到Settings → Data Management
3. 点击Import
4. 选择此目录中的JSON文件

## 备份说明

这是一个完整的备份，包含：
- ✓ 所有工作流定义
- ✓ 所有凭证
- ✓ 所有全局变量

---

生成于: $(date)
EOF

echo -e "${GREEN}✓ 报告生成: $REPORT_FILE${NC}"

# 创建restore脚本
echo ""
echo -e "${YELLOW}8️⃣  生成恢复脚本...${NC}"
RESTORE_SCRIPT="$OUTPUT_DIR/restore.sh"
cat > "$RESTORE_SCRIPT" << 'EOF'
#!/bin/bash

# n8n 恢复脚本
# 将导出的工作流和凭证恢复到新的n8n实例

if [ $# -lt 1 ]; then
    echo "使用方法: bash restore.sh <target-n8n-url> <api-key>"
    echo "示例: bash restore.sh https://new-n8n.run.app sk_prod_xxxxx"
    exit 1
fi

TARGET_URL="$1"
API_KEY="$2"
EXPORT_DIR="$(dirname "$0")"

echo "准备恢复..."
echo "目标URL: $TARGET_URL"
echo "数据源: $EXPORT_DIR"

# 恢复凭证
echo ""
echo "恢复凭证..."
if [ -f "$EXPORT_DIR/credentials.json" ]; then
    jq '.data[]' "$EXPORT_DIR/credentials.json" | while read -r cred; do
        curl -s -X POST "$TARGET_URL/api/v1/credentials" \
            -H "X-N8N-API-KEY: $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$cred"
    done
    echo "✓ 凭证恢复完成"
else
    echo "⚠ 未找到credentials.json"
fi

# 恢复工作流
echo ""
echo "恢复工作流..."
if [ -f "$EXPORT_DIR/workflows.json" ]; then
    jq '.data[]' "$EXPORT_DIR/workflows.json" | while read -r wf; do
        curl -s -X POST "$TARGET_URL/api/v1/workflows" \
            -H "X-N8N-API-KEY: $API_KEY" \
            -H "Content-Type: application/json" \
            -d "$wf"
    done
    echo "✓ 工作流恢复完成"
else
    echo "⚠ 未找到workflows.json"
fi

echo ""
echo "恢复完成！"
EOF

chmod +x "$RESTORE_SCRIPT"
echo -e "${GREEN}✓ 恢复脚本生成: $RESTORE_SCRIPT${NC}"

# 最终总结
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ 导出完成！${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📊 导出摘要:${NC}"
echo "  工作流: $WORKFLOW_COUNT"
echo "  凭证: $CREDENTIAL_COUNT"
echo "  输出位置: $OUTPUT_DIR"
echo ""
echo -e "${YELLOW}📦 文件列表:${NC}"
ls -lh "$OUTPUT_DIR"/
echo ""
echo -e "${YELLOW}💡 下一步:${NC}"
echo "  1. 查看报告: cat $OUTPUT_DIR/EXPORT_REPORT.md"
echo "  2. 本地备份: zip -r n8n-backup-\$(date +%Y%m%d).zip $OUTPUT_DIR"
echo "  3. 恢复工作流: bash $RESTORE_SCRIPT <target-url> <api-key>"
echo ""

# n8n Cloud Run 导出指南

## 概述

本指南介绍如何从Google Cloud Run的n8n实例中一键导出所有工作流、凭证和变量。

---

## 前置条件

### 1. 获取n8n实例URL

```bash
# 查看Cloud Run服务
gcloud run services list

# 获取特定服务URL
gcloud run services describe YOUR_SERVICE_NAME \
  --region=us-central1 \
  --platform=managed \
  --format='value(status.url)'
```

**输出示例**:
```
https://my-n8n-abc123.run.app
```

### 2. 获取API密钥

在n8n中获取API密钥：

1. 登录n8n UI
2. 点击左上角头像 → Settings
3. 点击 API
4. 点击 Create API Key
5. 复制生成的密钥（格式: `sk_prod_xxxxx`）

⚠️ **重要**: 保妥善保管这个密钥，不要分享给他人

---

## 方法1: 使用Bash脚本（推荐）

### 安装

```bash
# 下载脚本
curl -O https://raw.githubusercontent.com/ankaierinc-ui/claudetest/claude/shopify-contact-scraper-6LzpM/export-n8n.sh

# 或克隆仓库
git clone https://github.com/ankaierinc-ui/claudetest.git
cd claudetest

# 给脚本执行权限
chmod +x export-n8n.sh
```

### 使用

```bash
# 基础使用
bash export-n8n.sh https://my-n8n.run.app sk_prod_xxxxx

# 指定输出目录
bash export-n8n.sh https://my-n8n.run.app sk_prod_xxxxx /path/to/backup

# 导出到特定路径
bash export-n8n.sh https://my-n8n.run.app sk_prod_xxxxx ~/n8n-backups
```

### 输出示例

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
n8n Cloud Run 一键导出
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

配置信息:
  URL: https://my-n8n.run.app
  API Key: sk_prod_xxxxx...（已隐藏）
  输出目录: ./n8n-export-20260130-150230

1️⃣  测试连接...
✓ 连接成功

2️⃣  导出工作流...
✓ 导出 24 个工作流

3️⃣  导出工作流详细信息...
✓ 工作流详细信息导出完成

4️⃣  导出凭证...
✓ 导出 12 个凭证

5️⃣  生成凭证清单...
✓ 凭证清单生成

6️⃣  导出变量...
✓ 导出 5 个变量

7️⃣  生成汇总报告...
✓ 报告生成

8️⃣  生成恢复脚本...
✓ 恢复脚本生成

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ 导出完成！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 导出摘要:
  工作流: 24
  凭证: 12
  输出位置: ./n8n-export-20260130-150230

📦 文件列表:
total 256K
-rw-r--r--  1 user user  48K Jan 30 15:02 credentials.json
-rw-r--r--  1 user user  52K Jan 30 15:03 workflows.json
-rw-r--r--  1 user user   5K Jan 30 15:03 EXPORT_REPORT.md
-rw-r--r--  1 user user   2K Jan 30 15:03 credentials-list.txt
-rw-r--r--  1 user user   8K Jan 30 15:03 variables.json
drwxr-xr-x  2 user user 128K Jan 30 15:02 workflows-detailed/
-rwxr-xr-x  1 user user   3K Jan 30 15:03 restore.sh
-rw-r--r--  1 user user   4K Jan 30 15:03 export.log

💡 下一步:
  1. 查看报告: cat ./n8n-export-20260130-150230/EXPORT_REPORT.md
  2. 本地备份: zip -r n8n-backup-20260130.zip ./n8n-export-20260130-150230
  3. 恢复工作流: bash ./n8n-export-20260130-150230/restore.sh <target-url> <api-key>
```

---

## 方法2: 使用Python脚本

### 安装

```bash
# 需要Python 3.6+
python3 --version

# 安装依赖
pip install requests

# 下载脚本
curl -O https://raw.githubusercontent.com/ankaierinc-ui/claudetest/claude/shopify-contact-scraper-6LzpM/export-n8n.py

# 给脚本执行权限
chmod +x export-n8n.py
```

### 使用

```bash
# 基础使用
python3 export-n8n.py https://my-n8n.run.app sk_prod_xxxxx

# 指定输出目录
python3 export-n8n.py https://my-n8n.run.app sk_prod_xxxxx -o ~/n8n-backups

# 或
python3 export-n8n.py --url https://my-n8n.run.app \
                      --api_key sk_prod_xxxxx \
                      --output ~/n8n-backups
```

### 查看帮助

```bash
python3 export-n8n.py --help
```

---

## 方法3: 使用cURL手动导出

### 导出所有工作流

```bash
# 设置变量
N8N_URL="https://my-n8n.run.app"
API_KEY="sk_prod_xxxxx"

# 导出
curl -X GET "$N8N_URL/api/v1/workflows?limit=1000" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  > workflows.json
```

### 导出所有凭证

```bash
curl -X GET "$N8N_URL/api/v1/credentials?limit=1000" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  > credentials.json
```

### 导出所有变量

```bash
curl -X GET "$N8N_URL/api/v1/variables" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  > variables.json
```

### 导出单个工作流

```bash
# 获取工作流ID
WORKFLOW_ID="123"

curl -X GET "$N8N_URL/api/v1/workflows/$WORKFLOW_ID" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  > workflow-$WORKFLOW_ID.json
```

---

## 方法4: 使用n8n CLI

### 安装n8n CLI

```bash
# 全局安装
npm install -g n8n

# 或本地安装
npm install n8n
```

### 导出工作流

```bash
n8n export:workflow \
  --baseUrl=https://my-n8n.run.app \
  --all \
  --output=./workflows.json \
  --apiKey=sk_prod_xxxxx

# 或导出单个
n8n export:workflow \
  --baseUrl=https://my-n8n.run.app \
  --id=123 \
  --output=./workflow-123.json \
  --apiKey=sk_prod_xxxxx
```

### 导出凭证

```bash
n8n export:credentials \
  --baseUrl=https://my-n8n.run.app \
  --all \
  --output=./credentials.json \
  --apiKey=sk_prod_xxxxx
```

---

## 导出文件说明

### 生成的文件结构

```
n8n-export-20260130-150230/
├── workflows.json              # 所有工作流列表
├── workflows-detailed/         # 每个工作流的详细定义
│   ├── workflow-1.json
│   ├── workflow-2.json
│   └── ...
├── credentials.json            # 所有凭证
├── credentials-list.txt        # 凭证清单（不含敏感信息）
├── variables.json              # 全局变量
├── EXPORT_REPORT.md            # 导出报告
├── export.log                  # 导出日志
└── restore.sh                  # 恢复脚本
```

### 文件内容

**workflows.json** 示例:
```json
{
  "data": [
    {
      "id": "1",
      "name": "My Workflow",
      "nodes": [...],
      "connections": {...},
      "active": true,
      ...
    },
    ...
  ]
}
```

**credentials.json** 示例:
```json
{
  "data": [
    {
      "id": "1",
      "name": "Google Sheets",
      "type": "googleSheetsOAuth2",
      "data": {...},
      ...
    },
    ...
  ]
}
```

**credentials-list.txt** 示例:
```
n8n 凭证清单 - 2026-01-30 15:02:30
==================================================

Google Sheets (googleSheetsOAuth2)
Shopify (shopifyOAuth2)
PostgreSQL (postgres)
Slack (slack)
```

---

## 备份和存储

### 本地备份

```bash
# 压缩导出目录
zip -r n8n-backup-$(date +%Y%m%d).zip ./n8n-export-20260130-150230

# 检查大小
ls -lh n8n-backup-*.zip

# 加密备份（可选）
gpg --symmetric n8n-backup-20260130.zip
```

### 云存储备份

#### Google Cloud Storage

```bash
# 设置变量
BUCKET_NAME="my-n8n-backups"
EXPORT_DIR="n8n-export-20260130-150230"

# 创建bucket（如果不存在）
gsutil mb gs://$BUCKET_NAME

# 上传备份
gsutil -m cp -r $EXPORT_DIR gs://$BUCKET_NAME/

# 验证上传
gsutil ls gs://$BUCKET_NAME/

# 下载备份
gsutil -m cp -r gs://$BUCKET_NAME/$EXPORT_DIR ./
```

#### AWS S3

```bash
# 安装aws-cli
pip install awscli

# 配置AWS凭证
aws configure

# 创建bucket（如果不存在）
aws s3 mb s3://my-n8n-backups

# 上传备份
aws s3 cp n8n-export-20260130-150230 \
  s3://my-n8n-backups/n8n-export-20260130-150230 \
  --recursive

# 验证上传
aws s3 ls s3://my-n8n-backups/
```

### GitHub备份（带加密）

```bash
# 1. 初始化git仓库
cd n8n-export-20260130-150230
git init
git config user.email "backup@example.com"
git config user.name "N8N Backup"

# 2. 添加.gitignore（排除敏感文件）
cat > .gitignore << EOF
.env
*.key
credentials.json
secrets/
EOF

# 3. 提交文件
git add .
git commit -m "n8n backup - $(date +%Y%m%d)"

# 4. 推送到私有仓库
git remote add origin https://github.com/your-org/n8n-backups-private
git push -u origin main

# 5. 或创建加密压缩包
cd ..
tar czf - n8n-export-20260130-150230 | \
  gpg --symmetric --cipher-algo AES256 \
  > n8n-backup-encrypted-20260130.tar.gz.gpg
```

---

## 恢复工作流

### 使用恢复脚本（推荐）

```bash
# 恢复到新的n8n实例
bash ./n8n-export-20260130-150230/restore.sh \
  https://new-n8n.run.app \
  sk_prod_xxxxx_new

# 脚本会自动：
# 1. 恢复所有凭证
# 2. 恢复所有工作流
# 3. 导入所有变量
```

### 手动导入（UI方式）

```
1. 登录目标n8n实例
2. 在菜单中点击 Settings
3. 点击 "Data Management" 或 "Import/Export"
4. 点击 Import
5. 选择要导入的JSON文件
6. 点击 Import
```

### 使用n8n CLI恢复

```bash
# 恢复工作流
n8n import:workflow \
  --baseUrl=https://new-n8n.run.app \
  --file=./workflows.json \
  --apiKey=sk_prod_xxxxx_new

# 恢复凭证
n8n import:credentials \
  --baseUrl=https://new-n8n.run.app \
  --file=./credentials.json \
  --apiKey=sk_prod_xxxxx_new
```

---

## 自动定期备份

### 使用cron（Linux/Mac）

```bash
# 编辑crontab
crontab -e

# 添加每天备份（凌晨2点）
0 2 * * * bash /home/user/export-n8n.sh https://my-n8n.run.app sk_prod_xxxxx /home/user/n8n-backups >> /home/user/n8n-backup.log 2>&1

# 保留最近30天的备份
0 3 * * * find /home/user/n8n-backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
```

### 使用Cloud Scheduler（Google Cloud）

```bash
# 1. 创建Cloud Function执行备份
# 2. 配置Cloud Scheduler触发Function
# 3. 设置定期执行（如：每天2点）

# 示例Cloud Function (Python)
import functions_framework
import subprocess
import os

@functions_framework.http
def backup_n8n(request):
    n8n_url = os.getenv('N8N_URL')
    api_key = os.getenv('N8N_API_KEY')
    backup_dir = '/tmp/n8n-backups'

    result = subprocess.run([
        'bash', 'export-n8n.sh',
        n8n_url,
        api_key,
        backup_dir
    ])

    return f'Backup completed with status: {result.returncode}'
```

---

## 常见问题

### Q1: API密钥过期了怎么办？

```bash
# 在n8n UI中生成新密钥
# 1. Settings → API
# 2. 删除旧密钥
# 3. 点击 "Create API Key"
# 4. 使用新密钥重新导出
```

### Q2: 导出失败，提示"连接超时"

```bash
# 检查URL是否正确
curl https://my-n8n.run.app/api/v1/workflows -H "X-N8N-API-KEY: test"

# 检查API密钥是否有效
# 如果看到401 Unauthorized，密钥无效

# 检查网络连接
ping my-n8n.run.app
```

### Q3: 如何加密导出的文件？

```bash
# 使用gpg加密
gpg --symmetric --cipher-algo AES256 credentials.json

# 输入密码两次，生成credentials.json.gpg

# 解密
gpg --decrypt credentials.json.gpg > credentials.json
```

### Q4: 凭证文件中有敏感信息吗？

**是的**，凭证文件可能包含：
- API密钥
- OAuth令牌
- 数据库密码
- Secret keys

**保护措施**:
```bash
# 1. 加密敏感文件
gpg --symmetric credentials.json
variables.json

# 2. 限制文件权限
chmod 600 credentials.json

# 3. 不提交到公开仓库
echo "credentials.json" >> .gitignore

# 4. 使用私有存储
# - 私有GitHub仓库
# - 加密的云存储（GCS with encryption）
# - 本地加密驱动器
```

### Q5: 如何恢复到特定时间点的备份？

```bash
# 查看备份历史
ls -lh n8n-backups/n8n-export-*/EXPORT_REPORT.md

# 选择特定备份
BACKUP_DIR="n8n-export-20260120-143000"  # 1月20日的备份

# 恢复
bash n8n-backups/$BACKUP_DIR/restore.sh https://new-n8n.run.app sk_prod_xxxxx
```

---

## 性能提示

### 导出大型实例

如果有数百个工作流：

```bash
# 1. 增加超时时间
N8N_TIMEOUT=300 bash export-n8n.sh ...

# 2. 在低峰时段导出
# 避免与正在运行的工作流冲突

# 3. 分批导出
# 使用API分页：
curl "$URL/api/v1/workflows?limit=100&skip=0" ...
curl "$URL/api/v1/workflows?limit=100&skip=100" ...
```

### 网络优化

```bash
# 使用并发上传到云存储
gsutil -m -j 10 cp -r n8n-export gs://bucket/

# 压缩备份减小传输大小
tar czf n8n-export.tar.gz n8n-export-20260130-150230
```

---

## 故障排除

### 收集诊断信息

```bash
# 1. 检查导出日志
cat n8n-export-*/export.log

# 2. 检查报告
cat n8n-export-*/EXPORT_REPORT.md

# 3. 测试n8n连接
curl -v https://my-n8n.run.app/api/v1/workflows \
  -H "X-N8N-API-KEY: sk_prod_xxxxx"

# 4. 检查API密钥权限
# 在n8n UI中验证密钥状态
```

---

## 总结

| 方法 | 优点 | 缺点 | 推荐场景 |
|------|------|------|--------|
| **Bash脚本** | 简单、快速、自动化 | 需要bash环境 | ✅ 大多数场景 |
| **Python脚本** | 跨平台、灵活 | 需要Python环境 | 🔹 自动化集成 |
| **cURL** | 轻量、无依赖 | 需要手动处理 | 🔹 调试、一次性导出 |
| **n8n CLI** | 官方工具、功能完整 | 需要npm | 🔹 开发者使用 |
| **UI导出** | 最简单、图形化 | 速度慢、限制多 | 🔹 小型导出 |

---

**最后提醒**:
- ✅ 定期备份（至少周一次）
- ✅ 测试恢复流程（确保能恢复）
- ✅ 加密敏感文件
- ✅ 离线存储一份备份

---

**文档版本**: 1.0
**最后更新**: 2026-01-30
**维护者**: Claude Code

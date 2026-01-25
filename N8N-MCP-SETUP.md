# n8n MCP Server 安装配置指南

## 概述

**n8n-mcp** 是一个Model Context Protocol服务器，允许Claude Code直接与您的n8n实例交互，无需手动导入JSON文件。

### 功能特性

- ✅ 访问1,084个n8n节点（537核心 + 547社区）
- ✅ 直接创建、更新、删除工作流
- ✅ 触发工作流执行并监控
- ✅ 搜索n8n节点文档
- ✅ 访问2,709个工作流模板
- ✅ AI工作流验证
- ✅ 平均响应时间~12ms

---

## 安装方式对比

| 方式 | 优点 | 适用场景 |
|------|------|---------|
| **托管服务** | 零配置，即用即走 | 快速测试 |
| **npx** | 简单快速 | 本地开发 |
| **Docker** | 隔离环境，易部署 | 生产环境 ⭐推荐 |
| **源码** | 完全控制 | 高级定制 |

---

## 方法1: 托管服务（最快）

### 优点
- ☁️ 云端部署，无需本地安装
- 🆓 免费套餐：100次/天
- ⚡ 即时启动
- 🔄 自动更新

### 步骤

1. **访问服务**
   ```
   https://dashboard.n8n-mcp.com
   ```

2. **获取配置**
   - 注册账号
   - 复制提供的MCP配置

3. **添加到Claude Code**
   - 编辑 `~/.config/claude-code/mcp_settings.json`
   - 添加托管服务提供的配置

### 限制
- 每天100次工具调用（免费版）
- 需要互联网连接

---

## 方法2: npx 快速启动（推荐本地开发）

### 前置要求
```bash
# 检查Node.js版本（任何版本均可）
node --version
```

### 安装步骤

1. **运行MCP服务器**
   ```bash
   npx n8n-mcp
   ```

2. **配置Claude Code**

   编辑 `~/.config/claude-code/mcp_settings.json`：

   ```json
   {
     "mcpServers": {
       "n8n": {
         "command": "npx",
         "args": ["n8n-mcp"],
         "env": {
           "MCP_MODE": "stdio",
           "LOG_LEVEL": "error",
           "N8N_API_URL": "http://localhost:5678",
           "N8N_API_KEY": "your-n8n-api-key-here"
         }
       }
     }
   }
   ```

3. **获取n8n API Key**

   在n8n中：
   ```
   Settings → API → Create API Key
   ```

4. **重启Claude Code**
   ```bash
   # 重启以加载MCP服务器
   ```

### 禁用遥测（可选）
```bash
npx n8n-mcp telemetry disable
```

---

## 方法3: Docker部署（推荐生产）⭐

### 优点
- 🐳 隔离环境
- 📦 82%更小的镜像（无n8n依赖）
- 🔒 更安全
- 🚀 易于部署

### 快速启动

```bash
docker run -d \
  --name n8n-mcp \
  -e N8N_API_URL=http://host.docker.internal:5678 \
  -e N8N_API_KEY=your-api-key \
  -e MCP_MODE=stdio \
  -e LOG_LEVEL=error \
  ghcr.io/czlonkowski/n8n-mcp:latest
```

### docker-compose 配置

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  n8n-mcp:
    image: ghcr.io/czlonkowski/n8n-mcp:latest
    container_name: n8n-mcp
    environment:
      - N8N_API_URL=http://n8n:5678
      - N8N_API_KEY=${N8N_API_KEY}
      - MCP_MODE=stdio
      - LOG_LEVEL=error
      - N8N_MCP_TELEMETRY_DISABLED=true
    restart: unless-stopped
    networks:
      - n8n-network

  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=password
      - WEBHOOK_SECURITY_MODE=moderate
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped
    networks:
      - n8n-network

networks:
  n8n-network:
    driver: bridge

volumes:
  n8n_data:
```

创建 `.env` 文件：
```bash
N8N_API_KEY=your-api-key-here
```

启动：
```bash
docker-compose up -d
```

### Claude Code配置（Docker）

编辑 `~/.config/claude-code/mcp_settings.json`：

```json
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
```

---

## 方法4: 从源码安装

### 适用场景
- 需要自定义功能
- 开发贡献

### 步骤

```bash
# 1. 克隆仓库
git clone https://github.com/czlonkowski/n8n-mcp.git
cd n8n-mcp

# 2. 安装依赖
npm install

# 3. 构建
npm run build

# 4. 重建数据库
npm run rebuild

# 5. 运行
npm start
```

### Claude Code配置

```json
{
  "mcpServers": {
    "n8n": {
      "command": "node",
      "args": ["/path/to/n8n-mcp/build/index.js"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "N8N_API_URL": "http://localhost:5678",
        "N8N_API_KEY": "your-api-key"
      }
    }
  }
}
```

---

## n8n API密钥配置

### 获取API Key

1. 打开n8n（通常是 `http://localhost:5678`）
2. 点击右上角用户图标
3. **Settings** → **API**
4. 点击 **"Create API Key"**
5. 复制生成的密钥

### 设置Webhook安全（本地n8n）

在n8n的环境变量中设置：
```bash
WEBHOOK_SECURITY_MODE=moderate
```

或在docker-compose中：
```yaml
environment:
  - WEBHOOK_SECURITY_MODE=moderate
```

---

## Claude Code MCP配置完整示例

### 完整配置文件

`~/.config/claude-code/mcp_settings.json`:

```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "LOG_LEVEL": "error",
        "N8N_API_URL": "http://localhost:5678",
        "N8N_API_KEY": "n8n_api_1234567890abcdef",
        "N8N_MCP_TELEMETRY_DISABLED": "true"
      }
    }
  }
}
```

### 环境变量说明

| 变量 | 必需 | 说明 |
|------|------|------|
| `MCP_MODE` | ✅ 是 | 必须设置为 `stdio` |
| `LOG_LEVEL` | ❌ 否 | 日志级别：`error`, `warn`, `info`, `debug` |
| `N8N_API_URL` | ⚠️ 可选* | n8n实例URL |
| `N8N_API_KEY` | ⚠️ 可选* | n8n API密钥 |
| `N8N_MCP_TELEMETRY_DISABLED` | ❌ 否 | 禁用遥测：`true`/`false` |

*注：不提供API配置时，只能使用文档查询功能，无法直接操作工作流

---

## 可用的MCP工具

### 文档工具（7个，无需API）

1. **n8n_search_nodes** - 搜索n8n节点
2. **n8n_get_node_docs** - 获取节点文档
3. **n8n_validate_workflow** - 验证工作流配置
4. **n8n_search_templates** - 搜索工作流模板
5. **n8n_get_template** - 获取模板详情
6. **n8n_validate_ai_agent** - 验证AI代理配置
7. **n8n_get_configuration_examples** - 获取配置示例

### 管理工具（13个，需要API）

1. **n8n_create_workflow** - 创建工作流
2. **n8n_update_workflow** - 更新工作流
3. **n8n_delete_workflow** - 删除工作流
4. **n8n_list_workflows** - 列出所有工作流
5. **n8n_get_workflow** - 获取工作流详情
6. **n8n_activate_workflow** - 激活工作流
7. **n8n_deactivate_workflow** - 停用工作流
8. **n8n_execute_workflow** - 执行工作流
9. **n8n_get_execution** - 获取执行详情
10. **n8n_list_executions** - 列出执行历史
11. **n8n_get_credentials** - 获取凭证列表
12. **n8n_health_check** - 健康检查
13. **n8n_get_tags** - 获取标签列表

---

## 验证安装

### 测试MCP连接

在Claude Code中询问：
```
能帮我列出n8n中所有的工作流吗？
```

如果配置正确，Claude将使用 `n8n_list_workflows` 工具获取列表。

### 测试工作流创建

```
帮我在n8n中创建一个简单的测试工作流
```

### 查看日志

**npx**:
```bash
# 查看控制台输出
```

**Docker**:
```bash
docker logs n8n-mcp
```

---

## 最佳实践

### ⚠️ 安全警告

> **永远不要直接编辑生产工作流！**

推荐流程：
```
1. 复制生产工作流
2. 让AI在副本上测试
3. 人工验证
4. 再部署到生产
```

### 推荐工作流

```
Claude Code → n8n MCP → 测试工作流 → 人工审核 → 生产部署
```

### 调试技巧

1. **设置详细日志**
   ```json
   "LOG_LEVEL": "debug"
   ```

2. **检查API连接**
   ```bash
   curl http://localhost:5678/api/v1/workflows \
     -H "X-N8N-API-KEY: your-api-key"
   ```

3. **验证MCP模式**
   ```json
   "MCP_MODE": "stdio"  // 必须是stdio，否则报错
   ```

---

## 故障排除

### 问题1: JSON解析错误

**原因**: `MCP_MODE` 未设置为 `stdio`

**解决**:
```json
"env": {
  "MCP_MODE": "stdio"
}
```

### 问题2: 无法连接n8n API

**检查清单**:
- [ ] n8n是否运行？ (`http://localhost:5678`)
- [ ] API Key是否正确？
- [ ] URL是否可访问？
- [ ] 防火墙是否阻止？

**Docker网络问题**:
```bash
# 使用host.docker.internal代替localhost
N8N_API_URL=http://host.docker.internal:5678
```

### 问题3: 工具不可用

**原因**: 未配置API凭证

**解决**: 添加 `N8N_API_URL` 和 `N8N_API_KEY`

### 问题4: 遥测问题

**禁用方法**:

**npx**:
```bash
npx n8n-mcp telemetry disable
```

**Docker**:
```yaml
environment:
  - N8N_MCP_TELEMETRY_DISABLED=true
```

---

## 系统要求

- **Node.js**: 任何版本（有自动降级支持）
- **内存**: ~100-120 MB（SQLite数据库）
- **磁盘**: ~200 MB
- **网络**: 需要访问n8n实例

---

## 性能优化

- ⚡ 平均响应时间: ~12ms
- 📦 Docker镜像: 82%更小
- 🔍 全文搜索: 支持
- 💾 本地缓存: SQLite

---

## 下一步

1. ✅ 安装n8n MCP server
2. ✅ 配置Claude Code连接
3. ✅ 测试基本功能
4. 🚀 开始用Claude直接管理n8n工作流！

---

## 相关资源

- **GitHub**: https://github.com/czlonkowski/n8n-mcp
- **托管服务**: https://dashboard.n8n-mcp.com
- **n8n文档**: https://docs.n8n.io/
- **MCP协议**: https://modelcontextprotocol.io/

---

## 许可证

MIT License - 免费使用

**建议**: 如果觉得有用，给项目点个Star ⭐

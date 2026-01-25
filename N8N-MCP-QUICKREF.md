# n8n MCP 快速参考

## 一键安装 🚀

```bash
# npx方式（最简单）
./setup-n8n-mcp.sh npx

# Docker方式（推荐）
./setup-n8n-mcp.sh docker

# 托管服务（零配置）
./setup-n8n-mcp.sh hosted
```

---

## 配置文件位置

```bash
~/.config/claude-code/mcp_settings.json
```

---

## 快速测试

### 1. 列出工作流
```
请帮我列出n8n中所有的工作流
```

### 2. 创建简单工作流
```
在n8n中创建一个测试工作流，包含Manual Trigger和Code节点
```

### 3. 搜索节点
```
n8n中有哪些Google相关的节点？
```

---

## 常用命令

### 查看Docker日志
```bash
docker logs n8n-mcp
docker logs n8n
```

### 重启服务
```bash
docker-compose -f docker-compose.n8n-mcp.yml restart
```

### 停止服务
```bash
docker-compose -f docker-compose.n8n-mcp.yml down
```

### 禁用遥测（npx）
```bash
npx n8n-mcp telemetry disable
```

---

## MCP工具列表

### 无需API（7个）
- `n8n_search_nodes` - 搜索节点
- `n8n_get_node_docs` - 获取文档
- `n8n_validate_workflow` - 验证工作流
- `n8n_search_templates` - 搜索模板
- `n8n_get_template` - 获取模板
- `n8n_validate_ai_agent` - 验证AI代理
- `n8n_get_configuration_examples` - 配置示例

### 需要API（13个）
- `n8n_create_workflow` - 创建
- `n8n_update_workflow` - 更新
- `n8n_delete_workflow` - 删除
- `n8n_list_workflows` - 列出
- `n8n_get_workflow` - 获取详情
- `n8n_activate_workflow` - 激活
- `n8n_deactivate_workflow` - 停用
- `n8n_execute_workflow` - 执行
- `n8n_get_execution` - 执行详情
- `n8n_list_executions` - 执行历史
- `n8n_get_credentials` - 凭证列表
- `n8n_health_check` - 健康检查
- `n8n_get_tags` - 标签列表

---

## 故障排除

### MCP连接失败
```bash
# 检查配置
cat ~/.config/claude-code/mcp_settings.json

# 确保MCP_MODE=stdio
```

### n8n API连接失败
```bash
# 测试API
curl http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: your-key"

# 检查API Key是否正确
```

### Docker服务未启动
```bash
# 检查状态
docker ps | grep n8n

# 启动服务
docker-compose -f docker-compose.n8n-mcp.yml up -d
```

---

## 配置示例

### npx配置
```json
{
  "mcpServers": {
    "n8n": {
      "command": "npx",
      "args": ["n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "N8N_API_URL": "http://localhost:5678",
        "N8N_API_KEY": "your-key"
      }
    }
  }
}
```

### Docker配置
```json
{
  "mcpServers": {
    "n8n": {
      "command": "docker",
      "args": ["exec", "-i", "n8n-mcp", "node", "build/index.js"],
      "env": {
        "MCP_MODE": "stdio"
      }
    }
  }
}
```

---

## 与原工作流的对比

| 方式 | 优点 | 缺点 |
|------|------|------|
| **JSON导入** | 完全控制 | 手动操作多 |
| **MCP直连** | 自动化、实时 | 需要配置 |

### 推荐使用场景

**使用JSON导入**:
- 一次性项目
- 完全离线环境
- 需要版本控制

**使用MCP**:
- 频繁修改工作流
- 需要实时调试
- 多工作流管理

---

## 资源链接

- 详细文档: `N8N-MCP-SETUP.md`
- GitHub: https://github.com/czlonkowski/n8n-mcp
- 托管服务: https://dashboard.n8n-mcp.com
- n8n文档: https://docs.n8n.io/

---

## 下一步

- [ ] 安装n8n MCP server
- [ ] 测试基本功能
- [ ] 迁移现有工作流
- [ ] 探索高级功能

# 无Docker环境下的n8n MCP设置

## 快速设置（npx方式）

### 前置条件
- ✅ Node.js: v22.22.0
- ✅ npm: 10.9.4

---

## 方案A: 最简单方式（推荐）

### 步骤1: 启动n8n（终端1）

```bash
# 启动n8n实例
./start-n8n-local.sh
```

或手动运行：
```bash
npx n8n start
```

等待启动完成，访问 `http://localhost:5678` 完成初始设置。

### 步骤2: 创建API Key

1. 访问 http://localhost:5678
2. 注册账号并登录
3. Settings → API → Create API Key
4. **复制API Key**（稍后需要）

### 步骤3: 配置MCP（终端2）

在另一个终端运行：

```bash
./setup-n8n-mcp.sh npx
```

按提示输入：
- **API Key**: 刚才复制的密钥
- **n8n URL**: http://localhost:5678（默认）

### 步骤4: 重启Claude Code

配置会自动保存到 `~/.config/claude-code/mcp_settings.json`

重启Claude Code后测试：
```
请列出n8n中所有的工作流
```

---

## 方案B: 手动配置

### 1. 启动n8n
```bash
npx n8n start
```

### 2. 获取API Key
访问 http://localhost:5678 → Settings → API → Create API Key

### 3. 手动创建MCP配置

编辑 `~/.config/claude-code/mcp_settings.json`:

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
        "N8N_API_KEY": "你的API密钥",
        "N8N_MCP_TELEMETRY_DISABLED": "true"
      }
    }
  }
}
```

### 4. 重启Claude Code

---

## 方案C: 使用托管n8n

如果不想本地运行n8n，可以使用n8n Cloud：

1. 注册 https://n8n.io/cloud/
2. 获取实例URL（如 `https://yourname.app.n8n.cloud`）
3. 创建API Key
4. 修改MCP配置中的 `N8N_API_URL`

---

## 常见问题

### Q: n8n启动很慢？
A: 首次启动需要下载依赖，等待1-2分钟

### Q: 端口5678被占用？
A: 修改端口
```bash
export N8N_PORT=5679
npx n8n start
```

### Q: MCP连接失败？
A: 检查：
1. n8n是否在运行？
2. API Key是否正确？
3. `MCP_MODE` 是否为 `stdio`？

---

## 进程管理

### 后台运行n8n

使用screen或tmux：

```bash
# 使用screen
screen -S n8n
npx n8n start
# 按 Ctrl+A, D 分离

# 重新连接
screen -r n8n
```

或使用PM2：

```bash
# 安装PM2
npm install -g pm2

# 启动n8n
pm2 start n8n

# 查看状态
pm2 status

# 停止
pm2 stop n8n
```

---

## 下一步

1. ✅ 启动n8n
2. ✅ 运行 `./setup-n8n-mcp.sh npx`
3. ✅ 测试MCP连接
4. 🚀 开始使用！

---

## 对比Docker方式

| 特性 | npx方式 | Docker方式 |
|------|---------|-----------|
| 安装难度 | ⭐⭐⭐⭐⭐ 简单 | ⭐⭐⭐ 中等 |
| 资源占用 | ⭐⭐⭐⭐ 较低 | ⭐⭐⭐ 中等 |
| 隔离性 | ⭐⭐ 低 | ⭐⭐⭐⭐⭐ 高 |
| 生产就绪 | ⭐⭐⭐ 中等 | ⭐⭐⭐⭐⭐ 高 |
| 升级便利 | ⭐⭐⭐⭐ 高 | ⭐⭐⭐⭐⭐ 高 |

**结论**: npx适合开发测试，Docker适合生产部署

# DTC品牌联系信息爬虫 + n8n MCP集成

完整的n8n自动化工作流方案，用于爬取DTC电商品牌的联系信息（邮箱、电话、社交媒体），支持Claude Code直接管理n8n实例。

---

## 🎯 项目概述

本项目提供两种方式使用n8n爬虫：

### 方案1: JSON工作流导入
手动导入预配置的n8n工作流，快速开始爬取DTC品牌数据。

### 方案2: MCP直连（推荐）⭐
通过Model Context Protocol直接从Claude Code管理n8n，实现对话式自动化开发。

---

## ✨ 核心功能

### DTC爬虫工作流
- 🔍 自动爬取DTC品牌网站
- 📧 提取邮箱、电话、社交媒体链接
- 🔥 使用Firecrawl API高质量解析
- 📊 自动保存到Google Sheets
- ⏰ 支持定时任务和去重
- 📝 包含10个预设品牌

### n8n MCP集成
- 🤖 Claude Code直接管理n8n工作流
- 📚 访问1,084个n8n节点文档
- 🔧 实时创建和修改工作流
- ▶️ 远程执行和监控
- 🎯 20个MCP工具（7个文档 + 13个管理）

---

## 📦 项目文件

### 核心工作流文件
| 文件 | 大小 | 说明 |
|------|------|------|
| `n8n-dtc-scraper-workflow.json` | 11K | DTC爬虫n8n工作流配置 |
| `dtc-brands-list.json` | 2.3K | 10个预设DTC品牌列表 |
| `google-sheets-template.csv` | 82B | Google Sheets列标题模板 |

### MCP配置文件
| 文件 | 大小 | 说明 |
|------|------|------|
| `setup-mcp-ankaiers.sh` | 2.2K | ⭐ 您的专用MCP配置脚本 |
| `mcp_settings.ankaiers.json` | 318B | MCP配置模板（ankaiers） |
| `setup-n8n-mcp.sh` | 6.3K | 通用MCP安装脚本 |
| `mcp_settings.example.json` | 319B | 通用MCP配置模板 |

### Docker部署文件
| 文件 | 大小 | 说明 |
|------|------|------|
| `docker-compose.n8n-mcp.yml` | 1.2K | Docker Compose配置 |
| `install-docker.sh` | 1.5K | Docker自动安装脚本 |

### 本地开发文件
| 文件 | 大小 | 说明 |
|------|------|------|
| `start-n8n-local.sh` | 372B | 启动本地n8n实例 |

### 文档文件
| 文件 | 大小 | 说明 |
|------|------|------|
| `README-SCRAPER.md` | 9.5K | 爬虫工作流完整指南 |
| `QUICKSTART.md` | 1.6K | 快速开始（3分钟） |
| `N8N-MCP-SETUP.md` | 9.3K | MCP安装配置详解 |
| `N8N-MCP-QUICKREF.md` | 3.3K | MCP快速参考 |
| `SETUP-WITHOUT-DOCKER.md` | 3.0K | 无Docker环境设置 |
| `MCP-SETUP-COMPLETE.md` | 5.1K | ✅ 您的MCP配置状态 |

---

## 🚀 快速开始

### 方式A: 使用已配置的MCP（最快）⭐

**您的MCP已配置完成！** 查看 `MCP-SETUP-COMPLETE.md`

1. **重启Claude Code** 加载MCP配置
2. **测试连接**:
   ```
   请列出我的n8n实例中的所有工作流
   ```
3. **开始使用**:
   ```
   帮我在n8n中创建DTC爬虫工作流
   ```

### 方式B: 手动导入工作流

1. **访问您的n8n**: https://n8n.ankaiers.com
2. **导入工作流**: 选择 `n8n-dtc-scraper-workflow.json`
3. **配置Google Sheets**: 添加凭证和表格ID
4. **运行测试**: 执行工作流查看结果

详细步骤见 `QUICKSTART.md`

---

## 📖 使用指南

### 初次使用 - 推荐流程

```bash
# 1. 查看MCP配置状态
cat MCP-SETUP-COMPLETE.md

# 2. 阅读快速开始指南
cat QUICKSTART.md

# 3. 如需手动安装MCP（已为您配置，可跳过）
./setup-mcp-ankaiers.sh
```

### 文档阅读顺序

**快速上手** (15分钟):
1. `README.md` (本文件) - 项目概览
2. `MCP-SETUP-COMPLETE.md` - MCP配置状态
3. `QUICKSTART.md` - 3分钟快速开始

**深入了解** (1小时):
4. `README-SCRAPER.md` - 爬虫工作流详解
5. `N8N-MCP-QUICKREF.md` - MCP快速参考
6. `N8N-MCP-SETUP.md` - MCP完整指南

---

## 🎯 使用场景

### 场景1: 快速测试爬虫
```
在Claude Code中：
"请在n8n中运行DTC爬虫工作流，爬取5个品牌"
```

### 场景2: 修改爬虫逻辑
```
"修改DTC爬虫工作流，增加对产品价格的提取"
```

### 场景3: 批量爬取
```
"将品牌列表改为从Google Sheets读取，
支持每周自动更新100个品牌"
```

### 场景4: 结果分析
```
"分析已爬取的数据，找出缺少邮箱的品牌"
```

---

## 🔧 配置详情

### 您的n8n实例
- **URL**: https://n8n.ankaiers.com
- **MCP配置**: ✅ 已完成
- **API Key**: ✅ 已配置

### MCP配置位置
```
~/.config/claude-code/mcp_settings.json
```

### Firecrawl API
- **API Key**: `fc-e0319c5bab3c478baf14ae2fa00e50f5`
- **已配置在**: `n8n-dtc-scraper-workflow.json`

---

## 📊 技术栈

### 核心技术
- **n8n**: 工作流自动化平台
- **Firecrawl**: 智能网页爬虫API
- **Google Sheets**: 数据存储
- **MCP**: Model Context Protocol

### 开发工具
- **Node.js**: v22.22.0（用于npx）
- **Claude Code**: AI辅助开发
- **Git**: 版本控制

---

## 🎓 学习资源

### MCP相关
- [n8n MCP GitHub](https://github.com/czlonkowski/n8n-mcp)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [n8n MCP Dashboard](https://dashboard.n8n-mcp.com)

### n8n相关
- [n8n官方文档](https://docs.n8n.io/)
- [n8n工作流模板](https://n8n.io/workflows/)
- [Firecrawl文档](https://docs.firecrawl.dev/)

---

## ⚡ 常见任务

### 查看配置
```bash
# 查看MCP配置
cat ~/.config/claude-code/mcp_settings.json

# 查看工作流
cat n8n-dtc-scraper-workflow.json | jq .

# 查看品牌列表
cat dtc-brands-list.json | jq .
```

### 备份和恢复
```bash
# 备份MCP配置
cp ~/.config/claude-code/mcp_settings.json mcp_settings.backup.json

# 恢复配置
cp mcp_settings.backup.json ~/.config/claude-code/mcp_settings.json
```

### 更新API Key
```bash
# 编辑MCP配置
nano ~/.config/claude-code/mcp_settings.json

# 或使用脚本重新配置
./setup-mcp-ankaiers.sh
```

---

## 🔒 安全提示

### API Key安全
- ✅ API Key已配置，请勿分享
- ✅ 定期轮换API密钥
- ✅ 不要提交到公开仓库
- ✅ 使用环境变量存储敏感信息

### n8n安全
- 🔐 使用强密码
- 🔑 限制API Key权限
- 📊 定期检查执行日志
- 🚫 不要在工作流中硬编码密钥

---

## 🐛 故障排除

### MCP连接失败
查看: `MCP-SETUP-COMPLETE.md` → 故障排除部分

### 工作流执行错误
查看: `README-SCRAPER.md` → 常见问题部分

### 快速诊断
```bash
# 测试n8n连接
curl https://n8n.ankaiers.com

# 检查MCP配置
cat ~/.config/claude-code/mcp_settings.json

# 查看n8n日志（如使用Docker）
docker logs n8n
```

---

## 📈 项目统计

- **总文件数**: 16个
- **代码行数**: ~2,000+
- **文档页数**: 50+
- **支持的n8n节点**: 1,084个
- **预设品牌**: 10个
- **MCP工具**: 20个

---

## 🎉 开始使用

### 立即测试MCP
在Claude Code中发送：
```
请帮我列出n8n中所有的工作流
```

### 创建你的第一个爬虫
```
在n8n中创建一个爬虫工作流，
爬取Shopify商店的联系信息
```

### 导入预设工作流
访问 https://n8n.ankaiers.com，导入 `n8n-dtc-scraper-workflow.json`

---

## 📝 更新日志

### 2026-01-25
- ✅ 创建DTC爬虫工作流
- ✅ 配置n8n MCP集成
- ✅ 完成ankaiers.com实例连接
- ✅ 添加完整文档和脚本
- ✅ 提供10个预设DTC品牌

---

## 🤝 支持

如有问题：
1. 查看相关文档（见上方文件列表）
2. 检查 `MCP-SETUP-COMPLETE.md`
3. 参考 `N8N-MCP-SETUP.md` 故障排除

---

## 📄 许可证

本项目基于MIT许可证。

---

**准备好了吗？开始您的自动化之旅！** 🚀

试试在Claude Code中说：
```
"帮我优化DTC爬虫工作流的性能"
```

或

```
"创建一个新的n8n工作流，每天自动发送爬虫结果报告"
```

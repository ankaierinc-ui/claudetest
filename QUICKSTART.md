# 🚀 快速开始指南

## 3分钟快速部署DTC品牌爬虫

### 准备工作（5分钟）

#### 1️⃣ 创建Google Sheets
```
1. 访问 https://sheets.google.com
2. 创建新表格，命名：DTC Brands Contact Database
3. 导入 google-sheets-template.csv 或手动添加表头
4. 复制表格ID（URL中的长字符串）
```

#### 2️⃣ 准备n8n
```
- 确保已安装n8n（自托管或Cloud）
- 登录n8n控制台
```

---

### 导入工作流（2分钟）

1. **导入JSON文件**
   - n8n右上角 → "..." → "Import from File"
   - 选择 `n8n-dtc-scraper-workflow.json`

2. **配置Google凭证**
   - 左侧菜单 → "Credentials" → "Add Credential"
   - 选择 "Google Sheets OAuth2 API"
   - 按提示授权

3. **更新Sheet ID**
   - 点击 "Save to Google Sheets" 节点
   - 粘贴你的Google Sheets ID
   - 选择刚创建的凭证

---

### 运行测试（1分钟）

```
1. 点击右上角 "Execute Workflow"
2. 观察节点执行（绿色=成功）
3. 检查Google Sheets是否有数据
```

---

### 预期结果

✅ 爬取10个DTC品牌
✅ 提取邮箱、电话、社交媒体
✅ 数据保存到Google Sheets
⏱️ 总耗时：约2-3分钟

---

### 遇到问题？

| 问题 | 解决方案 |
|------|---------|
| Firecrawl错误 | 检查API Key配额 |
| Google Sheets失败 | 重新授权凭证 |
| 没有数据 | 查看执行日志 |

详细文档请查看 `README-SCRAPER.md`

---

### 下一步

- [ ] 设置定时任务（每周运行）
- [ ] 添加更多品牌（编辑 Load Brand URLs 节点）
- [ ] 启用去重逻辑
- [ ] 扩展到100+品牌

**🎉 开始爬取吧！**

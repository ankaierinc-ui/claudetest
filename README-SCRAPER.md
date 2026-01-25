# DTC Brand Contact Scraper - n8n Workflow

自动爬取DTC电商品牌的联系信息（邮箱、电话、社交媒体链接）并保存到Google Sheets。

---

## 📋 目录

1. [功能特性](#功能特性)
2. [工作流程](#工作流程)
3. [前置要求](#前置要求)
4. [快速开始](#快速开始)
5. [配置步骤](#配置步骤)
6. [使用方法](#使用方法)
7. [定期更新设置](#定期更新设置)
8. [常见问题](#常见问题)
9. [扩展与优化](#扩展与优化)

---

## ✨ 功能特性

- ✅ 自动爬取DTC品牌网站的联系页面
- ✅ 提取邮箱、电话、社交媒体链接
- ✅ 使用Firecrawl API进行高质量内容提取
- ✅ 自动保存到Google Sheets
- ✅ 支持定期更新（避免重复爬取）
- ✅ 包含10个预设的知名DTC品牌

---

## 🔄 工作流程

```
触发器 → 加载品牌列表 → 爬取首页 → 查找联系页面 → 爬取联系页面 → 提取联系信息 → 保存到Google Sheets
```

### 详细步骤：

1. **Manual Trigger**: 手动触发工作流（可改为定时触发）
2. **Load Brand URLs**: 加载10个DTC品牌URL
3. **Scrape Homepage**: 使用Firecrawl爬取品牌首页
4. **Find Contact Pages**: 从首页找到Contact Us、About Us等页面链接
5. **Scrape Contact Pages**: 爬取联系页面内容
6. **Extract Contact Info**: 使用正则表达式提取邮箱、电话、社交媒体
7. **Save to Google Sheets**: 保存数据到Google表格

---

## 📦 前置要求

### 1. n8n 实例
- 自托管n8n或使用n8n Cloud
- 版本：建议 1.0+

### 2. Firecrawl API Key
- ✅ 已提供：`fc-e0319c5bab3c478baf14ae2fa00e50f5`
- 确保API有足够的配额

### 3. Google账号
- 需要Google Sheets访问权限
- 需要在n8n中配置Google OAuth认证

---

## 🚀 快速开始

### 步骤 1: 准备Google Sheets

1. 打开 [Google Sheets](https://sheets.google.com)
2. 创建新的电子表格，命名为 `DTC Brands Contact Database`
3. 在第一行添加以下列标题：

```
Brand Name | Brand URL | Emails | Phones | Facebook | Instagram | Twitter | LinkedIn | Scraped At
```

4. 复制表格的ID（URL中的一串字符）
   - 示例URL: `https://docs.google.com/spreadsheets/d/1ABC...XYZ/edit`
   - ID就是: `1ABC...XYZ`

### 步骤 2: 导入n8n工作流

1. 登录你的n8n实例
2. 点击右上角 **"+"** 创建新工作流
3. 点击右上角 **"..."** 菜单 → **"Import from File"**
4. 选择 `n8n-dtc-scraper-workflow.json` 文件
5. 工作流将被导入

### 步骤 3: 配置Google Sheets凭证

1. 在n8n中，点击左侧 **"Credentials"**
2. 点击 **"Add Credential"** → 搜索 **"Google Sheets OAuth2 API"**
3. 按照提示授权你的Google账号
4. 保存凭证

### 步骤 4: 更新工作流配置

在工作流中找到 **"Save to Google Sheets"** 节点：

1. 点击该节点
2. 在 **"Credential to connect with"** 下拉菜单中选择你刚创建的凭证
3. 在 **"Document"** 字段中粘贴你的Google Sheets ID
4. 确保 **"Sheet"** 字段设置为 `Sheet1`（或你的工作表名称）
5. 点击 **"Execute Node"** 测试连接

### 步骤 5: 测试运行

1. 点击右上角 **"Execute Workflow"** 按钮
2. 观察每个节点的执行情况
3. 检查Google Sheets中是否有数据写入

---

## ⚙️ 配置步骤

### 修改品牌列表

在 **"Load Brand URLs"** 节点中修改品牌列表：

```javascript
const brands = [
  { "name": "品牌名", "url": "https://www.example.com" },
  // 添加更多品牌...
];
```

或者，导入 `dtc-brands-list.json` 中的品牌。

### 调整Firecrawl设置

如果需要更改Firecrawl的爬取选项，编辑节点中的 `bodyParameters`：

```json
{
  "url": "={{ $json.url }}",
  "formats": ["markdown", "html"],
  "onlyMainContent": true,  // 只爬取主要内容
  "includeTags": ["a", "p", "div"]  // 指定要包含的HTML标签
}
```

### 配置去重逻辑

目前工作流会追加所有数据。要实现去重：

1. 在 **"Save to Google Sheets"** 节点之前添加 **"Google Sheets"** 读取节点
2. 添加 **"Code"** 节点过滤已存在的品牌
3. 只保存新品牌数据

示例代码：

```javascript
const currentData = $input.first().json;
const existingBrands = $('Read Existing Data').all().map(item => item.json.brandUrl);

// 过滤掉已存在的品牌
if (!existingBrands.includes(currentData.brandUrl)) {
  return [$input.item];
}
return [];
```

---

## 📖 使用方法

### 手动运行

1. 打开工作流
2. 点击右上角 **"Execute Workflow"**
3. 等待执行完成（约2-5分钟，取决于网站数量）
4. 查看Google Sheets中的结果

### 查看执行日志

1. 点击左侧 **"Executions"**
2. 查看每次运行的详细日志
3. 检查是否有错误或警告

### 查看提取的数据

打开Google Sheets查看：
- **Brand Name**: 品牌名称
- **Brand URL**: 品牌网站
- **Emails**: 提取的邮箱（多个用逗号分隔）
- **Phones**: 提取的电话
- **Social Media**: Facebook、Instagram、Twitter、LinkedIn链接
- **Scraped At**: 爬取时间戳

---

## ⏰ 定期更新设置

### 改为定时触发

1. 删除 **"Manual Trigger"** 节点
2. 添加 **"Schedule Trigger"** 节点：
   - 点击 **"+"** → 搜索 **"Schedule Trigger"**
3. 配置触发时间：
   - **Rule**: "Every Week"
   - **Day**: "Monday"
   - **Hour**: "9"（上午9点）
   - **Minute**: "0"

### 启用去重

为避免重复爬取相同品牌：

1. 在工作流中添加 **"Google Sheets - Read"** 节点
2. 读取现有数据
3. 在 **"Load Brand URLs"** 之后添加过滤逻辑

示例：

```javascript
// 在 Load Brand URLs 节点后添加
const existingData = $('Read Existing Brands').all();
const existingUrls = existingData.map(item => item.json.brandUrl);

// 过滤掉已爬取的品牌
const brands = [ /* 你的品牌列表 */ ];
const newBrands = brands.filter(brand => !existingUrls.includes(brand.url));

return newBrands.map(brand => ({ json: brand }));
```

### 自动添加新品牌

可以将品牌列表存储在另一个Google Sheet中：

1. 创建 **"Brand Queue"** 工作表
2. 添加 **"Google Sheets - Read"** 节点读取队列
3. 爬取后标记为已处理

---

## ❓ 常见问题

### Q1: Firecrawl API返回错误

**可能原因：**
- API配额用尽
- API Key无效
- 网站阻止爬虫

**解决方法：**
- 检查Firecrawl仪表板的配额
- 验证API Key是否正确
- 在请求中添加延迟（防止被封）

### Q2: 没有提取到邮箱

**可能原因：**
- 网站使用JavaScript动态加载联系信息
- 邮箱被编码或隐藏
- 联系页面URL找不到

**解决方法：**
- 检查 **"Find Contact Pages"** 节点是否找到正确的URL
- 手动添加已知的联系页面URL
- 尝试爬取更多页面

### Q3: Google Sheets保存失败

**可能原因：**
- 凭证过期
- 权限不足
- 表格ID错误

**解决方法：**
- 重新授权Google账号
- 确保表格共享设置正确
- 检查表格ID是否正确

### Q4: 工作流运行很慢

**可能原因：**
- 每个品牌爬取多个页面
- Firecrawl API响应慢

**解决方法：**
- 限制爬取的联系页面数量（在 **"Find Contact Pages"** 中设置 `.slice(0, 3)`）
- 添加批处理逻辑
- 使用n8n的 **"Wait"** 节点添加延迟

---

## 🔧 扩展与优化

### 1. 添加AI提取

使用OpenAI API提高提取准确性：

1. 添加 **"OpenAI"** 节点
2. 使用GPT-4提取联系信息：

```
从以下内容中提取：
1. 所有邮箱地址
2. 电话号码
3. 社交媒体链接

内容：
{{ $json.data.markdown }}
```

### 2. 批量爬取

修改 **"Load Brand URLs"** 从Google Sheets读取：

1. 创建品牌列表表格
2. 使用 **"Google Sheets - Read"** 读取
3. 可以轻松管理数百个品牌

### 3. 错误处理

添加 **"Error Trigger"** 节点：

1. 捕获失败的爬取
2. 发送通知（Email/Slack）
3. 记录到错误日志表格

### 4. 数据验证

添加邮箱验证：

1. 使用 **"HTTP Request"** 调用邮箱验证API
2. 标记无效邮箱
3. 只保存有效数据

### 5. 与CRM集成

将数据直接发送到：
- **HubSpot**: 使用HubSpot节点创建联系人
- **Salesforce**: 使用Salesforce节点
- **Airtable**: 使用Airtable节点

---

## 📊 Google Sheets模板

### 基础模板结构

| 列名 | 数据类型 | 说明 |
|------|---------|------|
| Brand Name | 文本 | 品牌名称 |
| Brand URL | 文本 | 品牌官网 |
| Emails | 文本 | 邮箱地址（逗号分隔） |
| Phones | 文本 | 电话号码（逗号分隔） |
| Facebook | 文本 | Facebook链接 |
| Instagram | 文本 | Instagram链接 |
| Twitter | 文本 | Twitter/X链接 |
| LinkedIn | 文本 | LinkedIn公司页面 |
| Scraped At | 日期时间 | 爬取时间 |

### 可选扩展列

- **Category**: 品牌类目
- **Country**: 所在国家
- **Status**: 验证状态
- **Notes**: 备注
- **Last Updated**: 最后更新时间

---

## 🎯 下一步

1. ✅ 导入工作流
2. ✅ 配置Google Sheets
3. ✅ 测试运行
4. ⏰ 设置定时任务
5. 🔄 添加去重逻辑
6. 📈 扩展品牌列表
7. 🤖 考虑添加AI提取

---

## 📝 文件说明

- **n8n-dtc-scraper-workflow.json**: n8n工作流配置文件
- **dtc-brands-list.json**: 10个预设DTC品牌列表
- **README-SCRAPER.md**: 本文档

---

## 🔗 相关资源

- [n8n官方文档](https://docs.n8n.io/)
- [Firecrawl API文档](https://docs.firecrawl.dev/)
- [Google Sheets API](https://developers.google.com/sheets/api)
- [DTC品牌目录](https://www.dtcdatabase.com/)

---

## 📞 支持

如有问题，请检查：
1. n8n执行日志
2. Firecrawl API配额
3. Google Sheets权限
4. 网络连接

---

**祝您爬取顺利！** 🎉

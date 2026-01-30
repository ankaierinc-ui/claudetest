# 🔒 Shopify Contact Scraper - 全面安全审计报告

**审计日期:** 2026-01-30
**审计级别:** 完整代码审计 (Senior Security Engineer)
**项目版本:** v3.0 (Phase 1 Optimized)
**扫描工具:** Manual Security Code Review + OWASP Top 10 Framework

---

## 📋 Executive Summary

### 风险概览

| 严重程度 | 数量 | 状态 |
|---------|------|------|
| 🔴 **CRITICAL** | 3 | 需要立即修复 |
| 🟠 **HIGH** | 5 | 需要修复 |
| 🟡 **MEDIUM** | 7 | 建议修复 |
| 🟢 **LOW** | 4 | 可选改进 |
| **总计** | **19** | |

### 关键发现

- **Exposed Credentials:** Google Sheets ID 在代码中明文存储
- **Supply Chain Risk:** 28个外部GitHub skills（未验证）
- **Data Exposure:** 大量PII数据（邮箱、电话）存储在云端
- **Missing OAuth:** 没有认证机制保护API调用
- **No HTTPS Validation:** 未验证SSL证书
- **ReDoS Vulnerabilities:** 多个正则表达式存在潜在ReDoS风险

---

## 🐛 详细风险清单

### 第1部分: 🔴 CRITICAL 级别 (3个)

---

#### 1.1 🔴 **信息泄露 - Google Sheets Document ID 硬编码**

**位置:** `shopify-contact-scraper-workflow.json:165`
**严重程度:** 🔴 CRITICAL
**OWASP:** A01:2021 - Broken Access Control

```json
// 第165行 - 风险代码
"documentId": {
  "__rl": true,
  "value": "1hbMFXnaSzzTFkRDhhqdWVshu7xmuDIDtVspPHJyXLqw",  // ⚠️ 明文 ID
  "mode": "list"
}
```

**问题描述:**
- Google Sheets Document ID 直接硬编码在工作流文件中
- 任何有权访问此文件的人都可以访问/修改 Google Sheet
- Git 历史中永久存储（无法完全删除）
- 在多个文档中重复（CONTEXT.md, AUTO_DISCOVERY_GUIDE.md）

**风险评估:**
- 攻击难度: 🟢 极易 (仅需访问代码库)
- 影响范围: 🔴 极大 (完全访问收集的PII数据)
- 利用可能性: 🔴 非常高 (已公开ID)

**修复方案:**
```javascript
// 方案1: 使用环境变量
const documentId = process.env.GOOGLE_SHEETS_ID;
if (!documentId) throw new Error('GOOGLE_SHEETS_ID env var not set');

// 方案2: 使用 n8n 加密凭证存储
// 在 n8n GUI 中配置，而不是在 JSON 中硬编码

// 方案3: 使用 n8n 变量（最佳实践）
const documentId = '{{ env.GOOGLE_SHEETS_ID }}';
```

**验证步骤:**
1. 撤销旧 Google Sheet
2. 创建新的 Google Sheet
3. 使用环境变量存储 ID
4. 在 Git 中添加 Google Sheets ID 到 .gitignore
5. 使用 `git-filter-repo` 从历史中移除

**修复前提:**
- ⚠️ 需要立即轮换 Google Sheets
- ⚠️ 需要审计 Google Sheets 的访问日志
- ⚠️ 需要重新生成所有凭证

---

#### 1.2 🔴 **OAuth/认证缺失 - Google Sheets API 无身份验证**

**位置:** `shopify-contact-scraper-workflow.json:156-232` (Node 9 - Save to Google Sheets)
**严重程度:** 🔴 CRITICAL
**OWASP:** A07:2021 - Identification and Authentication Failures

**问题描述:**
```json
// 存在的问题:
"Save to Google Sheets": {
  "type": "n8n-nodes-base.googleSheets",
  // ❌ 没有显示 OAuth 凭证配置
  // ❌ documentId 是直接的，不通过认证
  // ❌ 没有访问令牌刷新机制
}
```

**深层问题:**
- n8n workflow 依赖存储的 OAuth 凭证（在 n8n 实例中）
- 如果 OAuth 令牌过期，自动化无法继续
- 没有令牌刷新机制
- 没有请求签名或速率限制

**风险链:**
1. OAuth 令牌泄露 → 完全访问 Google 账户
2. 令牌过期未处理 → 自动化失败（可用性问题）
3. 缺少审计日志 → 无法追踪谁修改了数据

**修复方案:**
```javascript
// 在 n8n 中配置：
1. 使用 Google OAuth2 连接（需要刷新令牌）
2. 配置凭证轮换
3. 添加令牌过期检查和重试逻辑
4. 实现审计日志记录

// 添加错误处理：
try {
  // 追加到 Google Sheets
  await appendToSheets(data);
} catch (error) {
  if (error.code === 401) {
    // Token expired - retry with refresh
    console.error('OAuth token expired, need refresh');
  }
  throw error;
}
```

---

#### 1.3 🔴 **URL 注入漏洞 - Store URL 未验证**

**位置:** `shopify-contact-scraper-workflow.json:28` (Node 2 URL 构建)
**严重程度:** 🔴 CRITICAL
**OWASP:** A03:2021 - Injection

**问题代码:**
```javascript
// Node 2 - 第28行
results.push({
  store_url: `https://${name}.myshopify.com`,  // ⚠️ 直接拼接
  store_name: name,
  discovery_method: 'smart_category_selection',
  category: catName
});

// Node 3 - 第38行
"url": "={{ $json.store_url }}",  // ⚠️ 直接使用，无验证
```

**攻击场景:**
虽然名称来自硬编码列表，但还有其他风险：
- 如果列表被修改，可能注入恶意URL
- 缺少 URL 验证
- 缺少 protocol 检查

**例子:**
```javascript
// 潜在攻击
const maliciousName = "../../admin";
const url = `https://${maliciousName}.myshopify.com`;
// 结果: https://../../admin.myshopify.com (路径遍历)

// 更危险的：
const maliciousName = "shop.myshopify.com@attacker.com";
const url = `https://${maliciousName}.myshopify.com`;
// 结果: 可能导致 DNS rebinding 攻击
```

**修复方案:**
```javascript
function validateStoreUrl(storeUrl) {
  try {
    const url = new URL(storeUrl);

    // 验证协议
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }

    // 验证主机名
    if (!url.hostname.endsWith('.myshopify.com')) {
      throw new Error('Invalid Shopify domain');
    }

    // 验证路径（不应该有路径）
    if (url.pathname !== '/') {
      throw new Error('Invalid URL structure');
    }

    return true;
  } catch (error) {
    throw new Error(`Invalid store URL: ${error.message}`);
  }
}

// 使用
validateStoreUrl(storeUrl);
const response = await fetch(storeUrl);
```

---

### 第2部分: 🟠 HIGH 级别 (5个)

---

#### 2.1 🟠 **PII 数据暴露 - 未加密存储**

**位置:** `shopify-contact-scraper-workflow.json:170` (Google Sheets)
**严重程度:** 🟠 HIGH
**OWASP:** A01:2021 - Broken Access Control, A04:2021 - Insecure Design

**问题:**
- 收集的邮箱、电话号码存储在云 Google Sheets 中
- 数据未加密（仅依赖 Google OAuth）
- 没有数据分类/标签
- 缺少访问控制日志

**数据示例:**
```json
{
  "store_url": "https://example.myshopify.com",
  "primary_email": "contact@example.com",
  "primary_phone": "+1-555-0123",
  "all_emails": "contact@example.com; support@example.com",
  "extraction_timestamp": "2026-01-30T10:00:00Z"
}
```

**合规问题:**
- 🟠 GDPR: 未经同意收集PII（特别是欧盟数据）
- 🟠 CCPA: 消费者有"删除权"
- 🟠 数据驻留: 数据位置不明确

**修复方案:**
```javascript
// 方案1: 数据最小化
// 只存储必要的字段，删除原始邮件/电话

// 方案2: 数据加密
const crypto = require('crypto');

function encryptEmail(email) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  return cipher.update(email, 'utf8', 'hex') + cipher.final('hex');
}

// 方案3: 数据分类
function sanitizeData(data) {
  return {
    store_url: data.store_url,  // 公开
    primary_email: encryptEmail(data.primary_email),  // 敏感
    primary_phone: maskPhone(data.primary_phone),  // 敏感
    email_found: !!data.primary_email,  // 非敏感标志
    phone_found: !!data.primary_phone   // 非敏感标志
  };
}
```

---

#### 2.2 🟠 **NoSQL 注入风险 - 正则表达式ReDoS**

**位置:** `shopify-contact-scraper-workflow.json:152-170` (Node 8 数据提取)
**严重程度:** 🟠 HIGH
**OWASP:** A03:2021 - Injection (ReDoS 变种)

**问题代码:**
```javascript
// 第152行 - 不安全的正则表达式

// 1. Email 正则
const stdPattern = /([a-zA-Z0-9][a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]*@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)/g;
// ⚠️ 可能导致 ReDoS (Catastrophic Backtracking)

// 2. 编码邮件正则
const encodedPattern = /([a-zA-Z0-9._%+-]+)\s*\(at\|@)\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
// ⚠️ 不安全的量词组合 \s*

// 3. 电话正则
pattern = /\+?1?\s?[-.]?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g;
// ⚠️ 重复的 \s? 可能导致回溯
```

**攻击载荷示例:**
```javascript
// 导致 ReDoS 的输入
const maliciousInput = "a".repeat(50000) + "@";
// 正则会尝试指数级回溯，导致 CPU 100%

// 原因分析：
// [a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]* 是贪心的
// 加上 @ 匹配失败时，会回溯所有字符
// 时间复杂度: O(2^n)
```

**修复方案:**
```javascript
// 使用原子组（Atomic Groups）- 禁止回溯
const safeEmailPattern = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// 更安全的方案：使用否定量词
const improvedEmailPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,61}@[a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}$/;

// 最佳实践：RFC 5322 简化版本
function validateEmail(email) {
  // 限制长度
  if (email.length > 254) return false;

  // 简单验证 (不使用复杂正则)
  const parts = email.split('@');
  if (parts.length !== 2) return false;

  const [localPart, domain] = parts;

  // 验证 local part
  if (localPart.length === 0 || localPart.length > 64) return false;
  if (!/^[a-zA-Z0-9._%-]+$/.test(localPart)) return false;

  // 验证 domain
  if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) return false;

  return true;
}

// 使用：
const emails = extractedEmails.filter(e => validateEmail(e));
```

---

#### 2.3 🟠 **无速率限制的API调用**

**位置:** `shopify-contact-scraper-workflow.json:66-68, 124-126` (Node 3, Node 7)
**严重程度:** 🟠 HIGH
**OWASP:** A05:2021 - Broken Function Level Access Control

**问题:**
虽然有延迟 (2秒, 1秒)，但缺少完整的限流机制：

```javascript
// 现有保护
"timeout": 30,  // 只是超时，不是限流
"continueOnFail": true  // 忽略错误继续，导致重试风暴

// 没有：
// - 自适应限流
// - 退避策略
// - 断路器模式
// - 请求排队
```

**风险:**
- IP 被 Shopify 黑名单
- DoS 反制（如果 Shopify 检测到异常）
- 无意中 DDoS Shopify（违法）

**修复方案:**
```javascript
// 实现指数退避
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async waitIfNeeded() {
    const now = Date.now();
    // 清理过期记录
    this.requests = this.requests.filter(t => now - t < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);
      await sleep(waitTime);
      this.requests.shift();
    }

    this.requests.push(now);
  }
}

// 使用
const limiter = new RateLimiter(10, 60000);  // 10 req/min

async function fetchStore(url) {
  await limiter.waitIfNeeded();
  return fetch(url);
}
```

---

#### 2.4 🟠 **供应链风险 - 28个未审计的外部Skills**

**位置:** `CONTEXT.md:179-227` (已安装的Skills)
**严重程度:** 🟠 HIGH
**OWASP:** A06:2021 - Vulnerable and Outdated Components

**问题:**
```markdown
从 GitHub 安装了 28 个外部 Skills:
- 来源 1: https://github.com/aaaaqwq/claude-code-skills (15个)
- 来源 2: https://github.com/obra/superpowers (14个)

风险:
✗ 没有安全审计
✗ 没有版本固定
✗ 没有依赖检查
✗ 维护者可能变更
✗ 代码可能有后门
```

**修复方案:**
```markdown
1. 审计所有 Skills
   - 检查代码是否有安全问题
   - 验证维护者身份
   - 检查依赖链

2. 版本管理
   - 固定到特定版本 (不使用 main 分支)
   - 定期更新并测试

3. 监控
   - GitHub Dependabot 警报
   - 定期安全审计

4. 隔离
   - 限制每个 Skill 的权限
   - 在沙箱环境运行
```

---

#### 2.5 🟠 **缺少HTTPS验证和证书钉选**

**位置:** `shopify-contact-scraper-workflow.json:38, 112` (HTTP 请求)
**严重程度:** 🟠 HIGH
**OWASP:** A02:2021 - Cryptographic Failures

**问题:**
```javascript
// Node 3 和 Node 7
"url": "={{ $json.store_url }}",
"method": "GET"
// ❌ 没有显示 SSL/TLS 验证配置
// ❌ 可能受到 MITM 攻击
// ❌ 没有证书钉选
```

**攻击场景:**
```
1. 网络中间人可以拦截请求
2. 替换响应内容
3. 注入恶意邮箱地址或电话号码
4. 数据被篡改后存储在 Google Sheets
```

**修复方案:**
```javascript
// Node 3 和 Node 7 的配置应包括：

// 选项1: 强制 HTTPS (n8n 内置)
"ignoreSSLIssues": false  // 确保为 false

// 选项2: 证书钉选
const pinnedCertificates = {
  'api.shopify.com': 'sha256/...'  // 证书哈希
};

// 选项3: 验证主机名
function validateURL(url) {
  const parsed = new URL(url);

  if (parsed.protocol !== 'https:') {
    throw new Error('Only HTTPS allowed');
  }

  if (!parsed.hostname.endsWith('.myshopify.com') &&
      !parsed.hostname.endsWith('.shopify.com')) {
    throw new Error('Invalid Shopify domain');
  }

  return true;
}
```

---

### 第3部分: 🟡 MEDIUM 级别 (7个)

---

#### 3.1 🟡 **不安全的对象反序列化**

**位置:** `shopify-contact-scraper-workflow.json:160` (Google Sheets 凭证)
**严重程度:** 🟡 MEDIUM
**OWASP:** A08:2021 - Software and Data Integrity Failures

**问题:**
```json
"documentId": {
  "__rl": true,     // ⚠️ __rl 是 n8n 特殊标记
  "value": "...",   // 值
  "mode": "list"
}
```

风险: 如果这个对象被恶意修改，可能导致指向不同的 Google Sheet。

---

#### 3.2 🟡 **无数据验证的批量操作**

**位置:** `shopify-contact-scraper-workflow.json:104` (Node 6 - Prepare Batch)
**严重程度:** 🟡 MEDIUM

**问题:**
```javascript
// Node 6 代码
items.forEach(item => {
  const contactUrls = item.json.contact_urls || [];
  // ❌ 没有验证 contactUrls 是数组
  // ❌ 没有验证 URL 格式
  // ❌ 没有检查重复
});
```

---

#### 3.3 🟡 **日志信息泄露**

**位置:** `shopify-contact-scraper-workflow.json:240` (Node 10 Summary)
**严重程度:** 🟡 MEDIUM
**OWASP:** A09:2021 - Logging and Monitoring Failures

**问题:**
```javascript
// 打印敏感信息到日志
console.log(`Email success rate: ${emailStats.length}/${items.length}`);
console.log(`Total contacts extracted: ${totalEmails} emails`);

// 虽然不直接打印邮件，但数量信息可以推断数据集大小
```

---

#### 3.4 🟡 **缺少输入长度限制**

**位置:** `shopify-contact-scraper-workflow.json:152` (Node 8)
**严重程度:** 🟡 MEDIUM

**问题:**
```javascript
function extractEmails(text) {
  // ❌ text 没有长度限制
  // ❌ 可能是几MB的HTML
  // ❌ 正则处理会很慢
  const stdPattern = /...very complex regex.../g;
  while ((match = stdPattern.exec(text)) !== null) {
    // 大文本会导致内存爆炸 + ReDoS
  }
}
```

---

#### 3.5 🟡 **并发竞态条件**

**位置:** `shopify-contact-scraper-workflow.json:152-170` (Node 8)
**严重程度:** 🟡 MEDIUM

**问题:**
```javascript
// Node 6 创建多个 items，然后并行处理
// Node 7 同时发起 HTTP 请求（可能)
// Node 8 合并结果，但 storeMap 使用同步操作

// 如果是并行处理，可能有竞态：
const storeMap = {};
items.forEach(item => {
  const storeUrl = item.json.store_url;
  if (!storeMap[storeUrl]) {  // 竞态：两个线程同时检查
    storeMap[storeUrl] = {...};  // 都创建，导致重复
  }
});
```

---

#### 3.6 🟡 **缺少错误恢复机制**

**位置:** `shopify-contact-scraper-workflow.json:66-68` (Node 3)
**严重程度:** 🟡 MEDIUM

**问题:**
```javascript
// Node 3 配置
"continueOnFail": true  // 继续处理失败请求
// 但没有：
// - 重试机制
// - 失败日志
// - 断路器
```

---

#### 3.7 🟡 **缺少数据完整性检查**

**位置:** `shopify-contact-scraper-workflow.json:173-210` (Google Sheets 列)
**严重程度:** 🟡 MEDIUM

**问题:**
```json
// 写入到 Google Sheets，但没有：
// - 校验和验证
// - 写后读验证
// - 事务性保证
```

---

### 第4部分: 🟢 LOW 级别 (4个)

---

#### 4.1 🟢 **硬编码的常量**

位置: Node 2, Node 5, Node 8
严重程度: 🟢 LOW

- 156 个店铺名称硬编码
- 12 个联系页面路径硬编码
- 优先级列表硬编码

建议: 移到配置文件。

---

#### 4.2 🟢 **缺少请求超时处理**

位置: Node 7 (Batch requests)
严重程度: 🟢 LOW

- 只有 timeout 设置，没有超时后的处理
- 没有重试机制

---

#### 4.3 🟢 **魔数**

位置: 整个代码
严重程度: 🟢 LOW

```javascript
80        // 店铺数量
0.35-0.45 // 发现成功率
90+       // 邮件精确度
```

建议: 使用有意义的常量名称。

---

#### 4.4 🟢 **代码复杂度高**

位置: Node 8 - Extract Contact Info
严重程度: 🟢 LOW

- 函数太长 (500+ 行)
- 需要重构为可测试的模块

---

## 📊 风险矩阵

```
         影响度
          │
    高 ┌─┬─┬─┐
       │1│2│3│  1: CRITICAL (立即修复)
       ├─┼─┼─┤  2: HIGH (本周修复)
中  ┌──┤4│5│6│  3: 不常见
       ├─┼─┼─┤  4: MEDIUM (计划修复)
    低 │7│8│9│  5: LOW (可选)
       └─┴─┴─┘
        低  中  高
       可能性
```

---

## 🔧 修复优先级规划

### Phase 1: 立即 (本周内)

#### P1.1 - 移除 Google Sheets ID
**工作量:** 2小时
**步骤:**
1. 在 n8n 中创建环境变量: `GOOGLE_SHEETS_ID`
2. 更新工作流配置使用变量
3. 使用 `git-filter-repo` 清理历史
4. 在 CONTEXT.md 中移除 ID

#### P1.2 - 添加 URL 验证
**工作量:** 1小时
**步骤:**
1. 在 Node 2 中添加 `validateStoreUrl()` 函数
2. 在 Node 5 中验证联系页面 URL
3. 添加单元测试

#### P1.3 - 修复 ReDoS 正则表达式
**工作量:** 2小时
**步骤:**
1. 替换危险的正则表达式
2. 添加输入长度限制
3. 添加性能测试

### Phase 2: 短期 (两周内)

#### P2.1 - PII 数据加密
**工作量:** 4小时
#### P2.2 - OAuth 令牌管理
**工作量:** 3小时
#### P2.3 - 供应链审计
**工作量:** 8小时

### Phase 3: 中期 (一个月内)

#### P3.1 - 添加监控和日志
#### P3.2 - 实现限流和重试
#### P3.3 - 代码重构和测试

---

## ✅ 修复检查清单

- [ ] 环境变量配置
- [ ] URL 验证函数
- [ ] 正则表达式测试
- [ ] HTTPS 验证
- [ ] OAuth 实现
- [ ] 速率限制
- [ ] 日志记录
- [ ] 错误处理
- [ ] 安全测试
- [ ] 文档更新

---

## 📚 相关标准和参考

- OWASP Top 10 2021: https://owasp.org/Top10/
- OWASP Regex DoS: https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS
- Google Sheets API Security: https://developers.google.com/sheets/api/guides/authorizing-requests
- CWE-200: Information Exposure: https://cwe.mitre.org/data/definitions/200.html
- CWE-601: URL Redirection to Untrusted Site: https://cwe.mitre.org/data/definitions/601.html

---

**扫描完成:** 2026-01-30
**审计员:** Senior Security Engineer
**状态:** 🟠 需要修复 (19 个风险)


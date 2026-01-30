# 🔧 Security Remediation Plan - Detailed Implementation Strategy

**Version:** 1.0
**Date:** 2026-01-30
**Status:** Planning Phase
**Total Vulnerabilities:** 19
**Estimated Effort:** 15-20 hours

---

## 📋 Executive Overview

This document provides a detailed, step-by-step implementation plan to remediate all 19 security vulnerabilities identified in the security audit.

### Plan Structure
- **Phase 1:** Critical Fixes (2-3 days)
- **Phase 2:** High Priority Fixes (3-4 days)
- **Phase 3:** Medium Priority Fixes (2-3 days)
- **Phase 4:** Low Priority Improvements (1-2 days)

### Implementation Approach
- **Sequential fixes** for dependent issues
- **Parallel development** where possible
- **Automated testing** after each fix
- **Zero-downtime** deployment strategy

---

## 🔴 PHASE 1: CRITICAL FIXES (Days 1-3)

### Issue 1.1: Remove Hardcoded Google Sheets ID

**Severity:** 🔴 CRITICAL
**Current Risk:** Anyone with code access can modify your data
**Effort:** 2 hours
**Dependencies:** None
**Affected Files:** 4 files

#### Step 1.1.1: Create Environment Variable Structure

**File to create:** `.env.example`

```bash
# Google Sheets Configuration
GOOGLE_SHEETS_ID=your-sheet-id-here
GOOGLE_SHEETS_SHEET_ID=1489016821

# API Keys (if needed)
SHOPIFY_API_KEY=
SHOPIFY_API_SECRET=

# Security
ENCRYPTION_KEY=your-256-bit-key-here
```

**Instructions:**
1. Create `.env.example` with template values
2. Add `.env` to `.gitignore` (already done)
3. Document in README how to configure

#### Step 1.1.2: Update Workflow JSON

**File to modify:** `shopify-contact-scraper-workflow.json` (Node 9)

**Current code (lines 163-166):**
```json
"documentId": {
  "__rl": true,
  "value": "1hbMFXnaSzzTFkRDhhqdWVshu7xmuDIDtVspPHJyXLqw",
  "mode": "list"
},
```

**Solution for n8n:**
In n8n UI (not JSON), configure:
1. Create a new credential: `Google Sheets API` → OAuth2
2. Store the Document ID as a **n8n variable**: `{{ env.GOOGLE_SHEETS_ID }}`
3. Reference in workflow: `"value": "{{ env.GOOGLE_SHEETS_ID }}"`

**Updated JSON would be:**
```json
"documentId": {
  "__rl": true,
  "value": "{{ env.GOOGLE_SHEETS_ID }}",
  "mode": "list"
},
"sheetName": {
  "__rl": true,
  "value": "{{ env.GOOGLE_SHEETS_SHEET_ID }}",
  "mode": "list"
}
```

**Implementation:**
```bash
# In n8n Instance Settings:
# 1. Add environment variables:
export GOOGLE_SHEETS_ID="1hbMFXnaSzzTFkRDhhqdWVshu7xmuDIDtVspPHJyXLqw"
export GOOGLE_SHEETS_SHEET_ID="1489016821"

# 2. In n8n Workflow, use template syntax:
# {{ env.GOOGLE_SHEETS_ID }}
```

#### Step 1.1.3: Clean Git History

**Command to run:**
```bash
# Option 1: Remove from all history (NUCLEAR - irreversible)
git filter-repo --path shopify-contact-scraper-workflow.json \
  --path CONTEXT.md \
  --path AUTO_DISCOVERY_GUIDE.md \
  --path BUG_FIXES_v3_CRITICAL.md \
  --replace-text <(echo '1hbMFXnaSzzTFkRDhhqdWVshu7xmuDIDtVspPHJyXLqw==>REDACTED<')

# Option 2: Remove specific commits (safer)
# First, amend the commits to remove IDs
git log --oneline | grep -E "(Google|CONTEXT|AUTO_DISCOVERY)"
# Then manually rewrite history for those commits only
```

**Important:**
- This is **irreversible** - backup before running
- All users must re-clone after `git filter-repo`
- Need to force-push (dangerous, coordinate with team)

#### Step 1.1.4: Rotate Credentials

**Manual steps:**
1. Go to Google Drive
2. Share settings → Remove all external access except trusted accounts
3. Audit access logs: https://myaccount.google.com/security-checkup
4. Create **new** Google Sheet for production
5. Archive old sheet with ID: `1hbMFXnaSzzTFkRDhhqdWVshu7xmuDIDtVspPHJyXLqw`

#### Verification Checklist ✅
- [ ] `.env.example` created with template
- [ ] `.env` is in `.gitignore`
- [ ] n8n variables configured for env access
- [ ] Workflow JSON updated with `{{ env.GOOGLE_SHEETS_ID }}`
- [ ] Git history cleaned (if proceeding with filter-repo)
- [ ] New Google Sheet created and tested
- [ ] Old Sheet archived
- [ ] Documentation updated in README

---

### Issue 1.2: Implement OAuth2 Token Refresh

**Severity:** 🔴 CRITICAL
**Current Risk:** Tokens expire → Automation breaks
**Effort:** 2-3 hours
**Dependencies:** Issue 1.1 (must use env vars)
**Affected Components:** Node 9 (Google Sheets)

#### Step 1.2.1: Understand n8n OAuth Handling

**Current State:**
- n8n stores OAuth credentials internally
- Manual token refresh not visible in workflow
- Need to configure OAuth scopes and refresh logic

#### Step 1.2.2: Configure OAuth2 Credentials in n8n

**UI Steps:**
1. Admin Panel → Credentials
2. Create new credential type: `Google OAuth2`
3. Set scopes:
   ```
   https://www.googleapis.com/auth/spreadsheets
   https://www.googleapis.com/auth/drive
   offline_access  // CRITICAL: enables refresh tokens
   ```
4. Set redirect URI (from n8n settings)

#### Step 1.2.3: Add Token Expiry Check to Workflow

**Add new node before Node 9 (Save to Google Sheets)**

**New Node: "Check OAuth Token" (Code node)**
```javascript
// Check if OAuth token is valid/expired
const credentials = $credentials.googleOAuth2;

if (!credentials) {
  throw new Error('Google OAuth2 credentials not configured');
}

// n8n automatically handles refresh, but we can check:
const expiresAt = credentials.expiresAt;
const now = Date.now();
const timeUntilExpiry = (expiresAt - now) / 1000 / 60; // minutes

console.log(`OAuth Token expires in ${timeUntilExpiry} minutes`);

if (timeUntilExpiry < 5) {
  console.warn('Token expiring soon - n8n will auto-refresh');
  // n8n handles this automatically
}

return [{ json: {
  token_valid: true,
  expires_in_minutes: Math.round(timeUntilExpiry)
}}];
```

#### Step 1.2.4: Add Error Handling for Token Failures

**Modify Node 9 (Save to Google Sheets)**
- Set `continueOnFail: false` (currently true)
- Add error catching node after
- Implement retry logic

**New Error Handler Node:**
```javascript
// Error handling for Google Sheets write failures
const error = $node.previous().error;

if (error && error.message.includes('401')) {
  // Unauthorized - token issue
  console.error('OAuth token invalid - likely expired');
  console.error('Action: Re-authorize in n8n credentials settings');
  throw new Error('OAuth Token Refresh Required - Manual intervention needed');
}

if (error && error.message.includes('403')) {
  // Forbidden - permission issue
  console.error('Permission denied on Google Sheet');
  throw error;
}

if (error && error.message.includes('429')) {
  // Rate limited - backoff
  console.warn('Google API rate limited - backing off');
  // Don't retry, just log
}

return [{ json: { error: error.message } }];
```

#### Step 1.2.5: Implement Automated Token Refresh

**Create helper workflow (separate):**

**Workflow: "Refresh OAuth Tokens" (runs daily)**
```javascript
// This runs daily to ensure tokens are fresh

const credentials = {
  googleOAuth2: $credentials.googleOAuth2
};

console.log('Checking OAuth token freshness...');

try {
  // Make a test API call to validate token
  const response = await fetch(
    'https://www.googleapis.com/drive/v3/about?fields=user',
    {
      headers: {
        Authorization: `Bearer ${credentials.googleOAuth2.accessToken}`
      }
    }
  );

  if (response.status === 401) {
    console.log('Token expired - triggering refresh');
    // n8n will auto-refresh on next use
  } else if (response.ok) {
    console.log('Token is valid');
  }
} catch (error) {
  console.error('Token check failed:', error.message);
}

return [{ json: { status: 'token_check_complete' } }];
```

#### Verification Checklist ✅
- [ ] OAuth2 credentials created in n8n UI
- [ ] Offline access scope enabled
- [ ] Token expiry check node added
- [ ] Error handling implemented
- [ ] Token refresh tested
- [ ] Daily token check workflow created
- [ ] Logs show successful token operations
- [ ] Manual re-authorization documented

---

### Issue 1.3: Add URL Validation - Store URL Injection Prevention

**Severity:** 🔴 CRITICAL
**Current Risk:** DNS rebinding attacks, malicious URLs
**Effort:** 1.5 hours
**Dependencies:** None
**Affected Node:** Node 2 (Load Shopify URLs), Node 5 (Find Contact Pages)

#### Step 1.3.1: Create URL Validation Function

**Add to Node 2 (Load Shopify URLs)**

```javascript
// CRITICAL: Add URL validation function at top of Node 2

function validateStoreUrl(storeUrl) {
  const errors = [];

  try {
    // 1. Parse URL
    const url = new URL(storeUrl);

    // 2. Check protocol
    if (!['https:', 'http:'].includes(url.protocol)) {
      errors.push(`Invalid protocol: ${url.protocol}`);
    }

    // 3. Check hostname (only .myshopify.com allowed)
    if (!url.hostname.endsWith('.myshopify.com')) {
      errors.push(`Invalid Shopify domain: ${url.hostname}`);
    }

    // 4. Check for IPv6/localhost (DNS rebinding prevention)
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Pattern.test(url.hostname) ||
        url.hostname === 'localhost' ||
        url.hostname.startsWith('[')) {
      errors.push('IP addresses not allowed');
    }

    // 5. Check path (should be root only)
    if (url.pathname !== '/' && url.pathname !== '') {
      errors.push(`Invalid URL path: ${url.pathname}`);
    }

    // 6. Check port (should be 80 or 443)
    if (url.port && !['80', '443'].includes(url.port)) {
      errors.push(`Invalid port: ${url.port}`);
    }

    // 7. Check for special characters that might bypass validation
    if (/%[0-9a-f]{2}|@|\.\./.test(storeUrl)) {
      errors.push('URL contains suspicious encoding');
    }

    // 8. Length limit (prevent DOS)
    if (storeUrl.length > 2048) {
      errors.push('URL too long');
    }

    if (errors.length > 0) {
      throw new Error(`URL Validation Failed: ${errors.join('; ')}`);
    }

    return true;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('Invalid URL')) {
      throw new Error(`Malformed URL: ${storeUrl}`);
    }
    throw error;
  }
}

// Updated Node 2 code with validation
const commonStoreNames = { /* ... existing code ... */ };

function smartSelection(categories, totalLimit) {
  const results = [];
  // ... existing code ...

  results.forEach(item => {
    // ADD THIS VALIDATION
    try {
      validateStoreUrl(item.store_url);
    } catch (error) {
      console.error(`Skipping invalid URL: ${item.store_url} - ${error.message}`);
      // Don't add this item
      return;
    }

    // Continue with valid URLs only
    validatedResults.push(item);
  });

  return validatedResults;
}

// Run smart selection
const storeList = smartSelection(commonStoreNames, 80);

console.log(`Generated ${storeList.length} validated candidate stores`);

return storeList.map(store => ({ json: store }));
```

#### Step 1.3.2: Add Contact URL Validation

**Add to Node 5 (Find Contact Pages)**

```javascript
// Add validation to Node 5

function validateContactUrl(contactUrl, baseUrl) {
  // 1. Must be same domain as base
  const baseUrlObj = new URL(baseUrl);
  const contactUrlObj = new URL(contactUrl);

  if (contactUrlObj.hostname !== baseUrlObj.hostname) {
    throw new Error(`Contact URL on different domain: ${contactUrlObj.hostname}`);
  }

  // 2. Must use same protocol
  if (contactUrlObj.protocol !== baseUrlObj.protocol) {
    throw new Error(`Contact URL uses different protocol: ${contactUrlObj.protocol}`);
  }

  // 3. Path must be under /pages/ or common paths
  const allowedPaths = [
    '/pages/contact', '/pages/contact-us', '/contact', '/contact-us',
    '/pages/about', '/pages/support', '/support', '/help',
    '/pages/locations', '/locations', '/pages/faq', '/faq'
  ];

  if (!allowedPaths.includes(contactUrlObj.pathname)) {
    throw new Error(`Disallowed path: ${contactUrlObj.pathname}`);
  }

  // 4. No parameters allowed
  if (contactUrlObj.search) {
    throw new Error(`Contact URLs should not have query parameters`);
  }

  return true;
}

// Use in Node 5
const items = $input.all();

return items.map(item => {
  const storeUrl = item.json.store_url;

  try {
    const urlObj = new URL(storeUrl);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

    const contactPaths = [
      '/pages/contact', '/pages/contact-us', '/contact', '/contact-us',
      '/pages/about', '/pages/support', '/support', '/help',
      '/pages/locations', '/locations', '/pages/faq', '/faq'
    ];

    const contact_urls = [];

    contactPaths.forEach(path => {
      const contactUrl = baseUrl + path;

      try {
        validateContactUrl(contactUrl, baseUrl); // ADD THIS
        contact_urls.push(contactUrl);
      } catch (error) {
        console.debug(`Skipping invalid contact path: ${path} - ${error.message}`);
      }
    });

    return {
      json: {
        store_url: item.json.store_url,
        store_name: item.json.store_name,
        homepage_content: item.json.homepage_content,
        contact_urls: contact_urls,
        scraped_pages: item.json.scraped_pages || [],
        error: item.json.error,
        scraped_at: item.json.scraped_at
      }
    };
  } catch (error) {
    console.error(`Error processing store: ${error.message}`);
    return {
      json: {
        store_url: item.json.store_url,
        store_name: item.json.store_name,
        homepage_content: item.json.homepage_content,
        contact_urls: [],
        error: `Failed to generate contact URLs: ${error.message}`,
        scraped_at: item.json.scraped_at
      }
    };
  }
});
```

#### Step 1.3.3: Add Unit Tests

**Create test file:** `tests/url-validation.test.js`

```javascript
const { validateStoreUrl, validateContactUrl } = require('../utils/url-validator');

describe('URL Validation', () => {
  describe('validateStoreUrl', () => {

    it('should accept valid Shopify URLs', () => {
      const validUrls = [
        'https://shop.myshopify.com',
        'https://example-store.myshopify.com',
        'http://test-123.myshopify.com'
      ];

      validUrls.forEach(url => {
        expect(() => validateStoreUrl(url)).not.toThrow();
      });
    });

    it('should reject non-Shopify domains', () => {
      const invalidUrls = [
        'https://example.com',
        'https://evil.com',
        'https://127.0.0.1:8000'
      ];

      invalidUrls.forEach(url => {
        expect(() => validateStoreUrl(url))
          .toThrow(/Invalid Shopify domain/);
      });
    });

    it('should reject IP addresses', () => {
      expect(() => validateStoreUrl('https://192.168.1.1'))
        .toThrow(/IP addresses not allowed/);
    });

    it('should reject URLs with non-root paths', () => {
      expect(() => validateStoreUrl('https://shop.myshopify.com/admin'))
        .toThrow(/Invalid URL path/);
    });

    it('should reject unusual protocols', () => {
      expect(() => validateStoreUrl('ftp://shop.myshopify.com'))
        .toThrow(/Invalid protocol/);
    });

    it('should reject encoded paths', () => {
      expect(() => validateStoreUrl('https://shop.myshopify.com/%2e%2e'))
        .toThrow(/suspicious encoding/);
    });
  });

  describe('validateContactUrl', () => {

    it('should accept valid contact paths', () => {
      const baseUrl = 'https://shop.myshopify.com';
      const validPaths = [
        'https://shop.myshopify.com/contact',
        'https://shop.myshopify.com/pages/contact-us',
        'https://shop.myshopify.com/support'
      ];

      validPaths.forEach(url => {
        expect(() => validateContactUrl(url, baseUrl)).not.toThrow();
      });
    });

    it('should reject URLs on different domains', () => {
      const baseUrl = 'https://shop.myshopify.com';
      const evilUrl = 'https://attacker.com/contact';

      expect(() => validateContactUrl(evilUrl, baseUrl))
        .toThrow(/different domain/);
    });

    it('should reject URLs with query parameters', () => {
      const baseUrl = 'https://shop.myshopify.com';
      const urlWithParams = 'https://shop.myshopify.com/contact?redirect=//evil.com';

      expect(() => validateContactUrl(urlWithParams, baseUrl))
        .toThrow(/query parameters/);
    });
  });
});
```

#### Verification Checklist ✅
- [ ] URL validation functions implemented in Node 2
- [ ] Contact URL validation implemented in Node 5
- [ ] Test cases created and passing
- [ ] Invalid URLs logged (not silently skipped)
- [ ] Error handling graceful (doesn't crash workflow)
- [ ] Performance acceptable (<50ms per URL)
- [ ] Documentation updated with URL validation logic

---

## 🟠 PHASE 2: HIGH PRIORITY FIXES (Days 4-7)

### Issue 2.1: Fix ReDoS Vulnerabilities in Regular Expressions

**Severity:** 🟠 HIGH
**Current Risk:** CPU 100%, DoS via malicious input
**Effort:** 3 hours
**Dependencies:** Issue 1.1 (env setup)
**Affected Node:** Node 8 (Extract Contact Info)

#### Step 2.1.1: Identify Problematic Regex Patterns

**Current dangerous patterns:**
```javascript
// DANGEROUS - catastrophic backtracking risk
const stdPattern = /([a-zA-Z0-9][a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]*@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)/g;
// Issue: [a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]* is greedy + optional repetition = exponential backtracking

const encodedPattern = /([a-zA-Z0-9._%+-]+)\s*\(at\|@)\s*([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
// Issue: \s* can match whitespace in multiple ways, causing excessive backtracking

const phonePattern = /\+?1?\s?[-.]?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g;
// Issue: Multiple optional separators create exponential matching paths
```

#### Step 2.1.2: Replace with Safe Patterns

**New implementation for Node 8:**

```javascript
// SAFE EMAIL EXTRACTION - No catastrophic backtracking

class ContactExtractor {
  constructor(maxInputLength = 1000000) {
    this.maxInputLength = maxInputLength;

    // Safe, bounded regex patterns
    this.emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    this.phonePattern = /^\+?1?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/;
  }

  // SAFE EMAIL EXTRACTION
  extractEmails(text) {
    if (!text || typeof text !== 'string') return [];

    // CRITICAL: Limit input length to prevent ReDoS
    if (text.length > this.maxInputLength) {
      console.warn(`Input text truncated from ${text.length} to ${this.maxInputLength}`);
      text = text.substring(0, this.maxInputLength);
    }

    const emails = new Set();

    // Method 1: Split by @ and validate both parts
    // This avoids complex regex backtracking
    const potentialEmails = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [];

    potentialEmails.forEach(email => {
      // Validate using simple rules, not regex
      if (this.isValidEmail(email)) {
        emails.add(email.toLowerCase());
      }
    });

    return Array.from(emails).sort();
  }

  // Helper: Validate email without complex regex
  isValidEmail(email) {
    // Simple checks that don't use backtracking
    if (email.length > 254) return false;
    if (email.startsWith('.') || email.endsWith('.')) return false;
    if (email.includes('..')) return false;

    const [local, domain] = email.split('@');

    if (!local || !domain) return false;
    if (local.length > 64) return false;
    if (domain.length < 3) return false;

    // Whitelist checks
    const blocklist = ['noreply', 'no-reply', 'example', 'test', 'admin@localhost'];
    if (blocklist.some(item => email.toLowerCase().includes(item))) return false;

    // Must have valid TLD
    if (!domain.match(/\.[a-zA-Z]{2,}$/)) return false;

    return true;
  }

  // SAFE PHONE EXTRACTION
  extractPhones(text) {
    if (!text || typeof text !== 'string') return [];

    // Limit input
    if (text.length > this.maxInputLength) {
      text = text.substring(0, this.maxInputLength);
    }

    const phones = new Set();

    // Method: Find digit sequences, then validate
    // Avoid complex alternation in regex

    // Pattern 1: International format +[0-9]{1,3} [0-9]{6,14}
    const internationalMatches = text.match(/\+\d{1,3}\s?[\d\s\-\.]{6,14}\d/g) || [];
    internationalMatches.forEach(p => {
      const cleaned = this.cleanPhone(p);
      if (this.isValidPhone(cleaned)) phones.add(p.trim());
    });

    // Pattern 2: US format (XXX) XXX-XXXX
    const usMatches = text.match(/\(?(\d{3})\)?[\s\-\.]?(\d{3})[\s\-\.]?(\d{4})/g) || [];
    usMatches.forEach(p => {
      const cleaned = this.cleanPhone(p);
      if (this.isValidPhone(cleaned)) phones.add(p.trim());
    });

    // Pattern 3: Common formats XXX-XXX-XXXX
    const commonMatches = text.match(/\d{3}[\s\-\.]\d{3}[\s\-\.]\d{4}/g) || [];
    commonMatches.forEach(p => {
      const cleaned = this.cleanPhone(p);
      if (this.isValidPhone(cleaned)) phones.add(p.trim());
    });

    return Array.from(phones).sort();
  }

  cleanPhone(phone) {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  isValidPhone(phone) {
    const cleaned = this.cleanPhone(phone);

    // Basic validation
    if (cleaned.length < 10) return false;
    if (cleaned.length > 15) return false;

    // Not all same digit
    if (/^(\d)\1{9,}$/.test(cleaned)) return false;

    // Not patterns like 000-000-0000
    if (/^(000|111|222|333|444|555|666|777|888|999)/.test(cleaned)) return false;

    return true;
  }
}

// Usage in Node 8
const extractor = new ContactExtractor(1000000); // 1MB limit

const items = $input.all();
const storeMap = {};

// ... consolidate content ...

const results = [];

Object.values(storeMap).forEach(store => {
  const emails = extractor.extractEmails(store.all_content);
  const phones = extractor.extractPhones(store.all_content);

  // ... rest of logic ...
});
```

#### Step 2.1.3: Add Input Length Limits

**Update Node 8:**

```javascript
// At the START of Node 8

const MAX_CONTENT_LENGTH = 5_000_000; // 5MB
const MAX_EMAILS = 1000;
const MAX_PHONES = 1000;

const items = $input.all();

// Validate input sizes
items.forEach((item, idx) => {
  const contentLength = (item.json.all_content || '').length;

  if (contentLength > MAX_CONTENT_LENGTH) {
    console.warn(`Item ${idx}: Content truncated from ${contentLength} to ${MAX_CONTENT_LENGTH}`);
    item.json.all_content = item.json.all_content.substring(0, MAX_CONTENT_LENGTH);
  }
});

// ... rest of extraction ...

// Validate output sizes
const results = [];
Object.values(storeMap).forEach(store => {
  const emails = extractor.extractEmails(store.all_content).slice(0, MAX_EMAILS);
  const phones = extractor.extractPhones(store.all_content).slice(0, MAX_PHONES);

  results.push({
    json: {
      // ... fields ...
      all_emails: emails.join('; '),
      email_count: emails.length,
      all_phones: phones.join('; '),
      phone_count: phones.length,
      // ... other fields ...
    }
  });
});

return results;
```

#### Step 2.1.4: Add ReDoS Test Cases

**Create:** `tests/redos-tests.js`

```javascript
const { ContactExtractor } = require('../utils/contact-extractor');

describe('ReDoS Protection Tests', () => {
  let extractor;

  beforeEach(() => {
    extractor = new ContactExtractor(1000000);
  });

  it('should handle pathological email input without hanging', () => {
    // Input that would cause catastrophic backtracking
    const maliciousInput = 'a'.repeat(50000) + '@';

    const startTime = Date.now();
    const result = extractor.extractEmails(maliciousInput);
    const duration = Date.now() - startTime;

    // Should complete in < 100ms even with 50k character input
    expect(duration).toBeLessThan(100);
    expect(result).toEqual([]);
  });

  it('should handle repeated separators in phone extraction', () => {
    // Pattern that would cause backtracking
    const maliciousInput = '1'.repeat(10000) + '-';

    const startTime = Date.now();
    const result = extractor.extractPhones(maliciousInput);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });

  it('should enforce input length limits', () => {
    const hugeInput = 'x'.repeat(2000000); // 2MB

    const result = extractor.extractEmails(hugeInput);

    // Input should be truncated, not cause memory issue
    expect(result.length).toBeLessThanOrEqual(1000);
  });

  it('should safely extract emails from normal text', () => {
    const normalText = `
      Contact us at: contact@example.com or sales@example.com
      For support: support@example.co.uk
    `;

    const result = extractor.extractEmails(normalText);

    expect(result).toContain('contact@example.com');
    expect(result).toContain('sales@example.com');
    expect(result).toContain('support@example.co.uk');
  });
});
```

#### Verification Checklist ✅
- [ ] New ContactExtractor class created
- [ ] Dangerous regex patterns replaced with safe versions
- [ ] Input length limits enforced (5MB for content)
- [ ] Output limits enforced (1000 emails, 1000 phones)
- [ ] ReDoS test cases created and passing
- [ ] Performance test: 50k char input < 100ms
- [ ] Node 8 updated to use new extractor
- [ ] No functional regression in email/phone extraction

---

### Issue 2.2: Encrypt PII Data - Email and Phone Numbers

**Severity:** 🟠 HIGH
**Current Risk:** Plain text PII in Google Sheets
**Effort:** 4 hours
**Dependencies:** Issue 1.1 (env setup)
**Affected Node:** Node 8, Node 9 (Data storage)

#### Step 2.2.1: Create Encryption Utility

**New file:** `utils/encryption.js`

```javascript
const crypto = require('crypto');

class PIIEncryption {
  constructor(encryptionKey) {
    // Key must be 32 bytes for aes-256
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable not set');
    }

    if (encryptionKey.length < 32) {
      // Derive key from password
      this.key = crypto
        .createHash('sha256')
        .update(encryptionKey)
        .digest();
    } else {
      this.key = Buffer.from(encryptionKey.slice(0, 32), 'utf8');
    }
  }

  encrypt(plaintext) {
    if (!plaintext) return null;

    try {
      // Generate random IV (initialization vector)
      const iv = crypto.randomBytes(16);

      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-cbc', this.key, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine IV + encrypted data
      // Format: iv:encrypted (both hex encoded)
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decrypt(ciphertext) {
    if (!ciphertext) return null;

    try {
      const parts = ciphertext.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid ciphertext format');
      }

      const [ivHex, encryptedHex] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');

      const decipher = crypto.createDecipheriv('aes-256-cbc', this.key, iv);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Hash function for verification (non-reversible)
  hash(plaintext) {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
  }

  // Mask/anonymize email
  maskEmail(email) {
    if (!email || !email.includes('@')) return '***';

    const [local, domain] = email.split('@');
    const maskedLocal = local[0] + '*'.repeat(Math.max(1, local.length - 2)) + local[local.length - 1];
    return `${maskedLocal}@${domain}`;
  }

  // Mask/anonymize phone
  maskPhone(phone) {
    if (!phone) return '***';

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***';

    const masked = '*'.repeat(digits.length - 4) + digits.slice(-4);
    return masked;
  }
}

module.exports = PIIEncryption;
```

#### Step 2.2.2: Implement in Node 8 - Extract Contact Info

**Update Node 8 to encrypt data:**

```javascript
const PIIEncryption = require('./encryption');

// Initialize encryption (key from env)
const encryptionKey = process.env.ENCRYPTION_KEY;
if (!encryptionKey) {
  console.warn('ENCRYPTION_KEY not set - PII will not be encrypted');
}
const encryption = new PIIEncryption(encryptionKey);

// ... extraction logic ...

// Modified results with encryption
const results = [];

Object.values(storeMap).forEach(store => {
  const emails = extractor.extractEmails(store.all_content);
  const phones = extractor.extractPhones(store.all_content);

  const emailPriority = prioritizeEmails(emails);
  const phonePriority = prioritizePhones(phones);
  const qualityScore = calculateQualityScore(emails, phones, store.page_count);

  results.push({
    json: {
      store_url: store.store_url,
      store_name: store.store_name,

      // ✅ ENCRYPTED
      primary_email_encrypted: encryption.encrypt(emailPriority.primary),
      secondary_email_encrypted: encryption.encrypt(emailPriority.secondary),
      all_emails_encrypted: encryption.encrypt(emails.join('; ')),

      // ✅ MASKED
      primary_email_masked: encryption.maskEmail(emailPriority.primary),
      secondary_email_masked: encryption.maskEmail(emailPriority.secondary),

      email_confidence: emailPriority.confidence,
      email_count: emails.length,

      // ✅ ENCRYPTED
      primary_phone_encrypted: encryption.encrypt(phonePriority.primary),
      secondary_phone_encrypted: encryption.encrypt(phonePriority.secondary),
      all_phones_encrypted: encryption.encrypt(phones.join('; ')),

      // ✅ MASKED
      primary_phone_masked: encryption.maskPhone(phonePriority.primary),
      secondary_phone_masked: encryption.maskPhone(phonePriority.secondary),

      phone_count: phones.length,

      // ✅ HASH for verification
      primary_email_hash: encryption.hash(emailPriority.primary),
      primary_phone_hash: encryption.hash(phonePriority.primary),

      email_found: emailPriority.primary.length > 0,
      phone_found: phonePriority.primary.length > 0,
      pages_scraped: store.page_count + 1,
      data_quality_score: qualityScore,
      extraction_timestamp: new Date().toISOString()
    }
  });
});

return results;
```

#### Step 2.2.3: Create Decryption Helper

**New Node (after Node 9, optional):**

```javascript
// New node: "Decrypt PII (if needed)"
// Only use this when you need to access decrypted data

const PIIEncryption = require('./encryption');
const encryption = new PIIEncryption(process.env.ENCRYPTION_KEY);

const items = $input.all();

return items.map(item => ({
  json: {
    ...item.json,

    // Decrypted versions (for authorized use only)
    primary_email_decrypted: encryption.decrypt(item.json.primary_email_encrypted),
    primary_phone_decrypted: encryption.decrypt(item.json.primary_phone_encrypted),

    // Log access for audit
    decryption_timestamp: new Date().toISOString(),
    decrypted_by: process.env.USER || 'automated'
  }
}));
```

#### Step 2.2.4: Update Google Sheets Columns

**Modify Node 9 column mapping:**

```json
"columns": {
  "value": {
    "store_url": "store_url",
    "store_name": "store_name",

    // Encrypted fields
    "primary_email_encrypted": "primary_email_encrypted",
    "secondary_email_encrypted": "secondary_email_encrypted",
    "all_emails_encrypted": "all_emails_encrypted",

    // Masked fields (readable but protected)
    "primary_email_masked": "primary_email_masked",
    "secondary_email_masked": "secondary_email_masked",

    // Hash fields (verification only)
    "primary_email_hash": "primary_email_hash",

    // Phone equivalents
    "primary_phone_encrypted": "primary_phone_encrypted",
    "secondary_phone_encrypted": "secondary_phone_encrypted",
    "all_phones_encrypted": "all_phones_encrypted",
    "primary_phone_masked": "primary_phone_masked",
    "secondary_phone_masked": "secondary_phone_masked",
    "primary_phone_hash": "primary_phone_hash",

    // Metadata
    "email_count": "email_count",
    "phone_count": "phone_count",
    "email_confidence": "email_confidence",
    "email_found": "email_found",
    "phone_found": "phone_found",
    "pages_scraped": "pages_scraped",
    "data_quality_score": "data_quality_score",
    "extraction_timestamp": "extraction_timestamp"
  }
}
```

#### Verification Checklist ✅
- [ ] PIIEncryption class created and tested
- [ ] ENCRYPTION_KEY environment variable set
- [ ] Node 8 updated to encrypt email/phone
- [ ] Masked versions generated for readability
- [ ] Hash values generated for verification
- [ ] Google Sheets columns updated
- [ ] Decryption helper node available (optional)
- [ ] Encryption/decryption round-trip tested
- [ ] Performance acceptable (<50ms per item)
- [ ] Test data successfully encrypted and decrypted

---

## 🟡 PHASE 3: MEDIUM PRIORITY (Days 8-10)

### Issue 3.1: Add Rate Limiting and Retry Logic

**Severity:** 🟡 MEDIUM
**Current Risk:** IP blacklist, Shopify blocking, uncontrolled retries
**Effort:** 3 hours
**Dependencies:** None
**Affected Nodes:** Node 3, Node 7 (HTTP requests)

#### Step 3.1.1: Create Rate Limiter Class

**New file:** `utils/rate-limiter.js`

```javascript
class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 10;
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.requests = [];
  }

  async waitIfNeeded() {
    const now = Date.now();

    // Remove old requests outside window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);

      // Sleep
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Recursive check after waiting
      return this.waitIfNeeded();
    }

    this.requests.push(now);
  }

  getCurrentRate() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    return this.requests.length;
  }
}

module.exports = RateLimiter;
```

#### Step 3.1.2: Implement Exponential Backoff Retry

**New file:** `utils/retry-strategy.js`

```javascript
class RetryStrategy {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelayMs = options.initialDelayMs || 100;
    this.maxDelayMs = options.maxDelayMs || 30000;
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitterFactor = options.jitterFactor || 0.1;
  }

  async executeWithRetry(asyncFn, context = {}) {
    let attempt = 0;
    let lastError = null;

    while (attempt < this.maxRetries) {
      try {
        return await asyncFn();
      } catch (error) {
        lastError = error;
        attempt++;

        // Check if error is retryable
        if (!this.isRetryable(error)) {
          throw error;
        }

        if (attempt < this.maxRetries) {
          const delay = this.calculateDelay(attempt);
          console.log(`Retry attempt ${attempt}/${this.maxRetries} after ${delay}ms: ${error.message}`);

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed after ${this.maxRetries} attempts: ${lastError.message}`);
  }

  isRetryable(error) {
    // Only retry on specific errors
    const retryableErrors = [
      429,  // Too Many Requests
      503,  // Service Unavailable
      504,  // Gateway Timeout
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND'
    ];

    const statusCode = error.statusCode || error.code;
    const message = error.message || '';

    return retryableErrors.some(err =>
      statusCode === err || message.includes(err)
    );
  }

  calculateDelay(attempt) {
    // Exponential backoff: 100ms, 200ms, 400ms...
    let delay = this.initialDelayMs * Math.pow(this.backoffMultiplier, attempt - 1);

    // Cap at max delay
    delay = Math.min(delay, this.maxDelayMs);

    // Add random jitter (±10%)
    const jitter = delay * this.jitterFactor * (Math.random() * 2 - 1);
    delay += jitter;

    return Math.round(delay);
  }
}

module.exports = RetryStrategy;
```

#### Step 3.1.3: Update Node 3 with Rate Limiting

**Modify Node 3 (Scrape Homepage):**

```javascript
const RateLimiter = require('./rate-limiter');
const RetryStrategy = require('./retry-strategy');

// Initialize rate limiter (10 requests per minute)
const rateLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60000
});

// Initialize retry strategy
const retryStrategy = new RetryStrategy({
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000
});

const items = $input.all();

const results = [];

for (const item of items) {
  try {
    // Wait if rate limit reached
    await rateLimiter.waitIfNeeded();

    // Make request with retry logic
    const result = await retryStrategy.executeWithRetry(async () => {
      const response = await fetch(item.json.store_url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        },
        timeout: 30000
      });

      if (response.statusCode >= 500) {
        const error = new Error(`Server error: ${response.statusCode}`);
        error.statusCode = response.statusCode;
        throw error;
      }

      return response;
    });

    // Log success
    console.log(`✓ Scraped ${item.json.store_url} (attempt ${1})`);

    results.push({
      json: {
        ...item.json,
        statusCode: result.statusCode,
        body: result.body
      }
    });

  } catch (error) {
    console.error(`✗ Failed to scrape ${item.json.store_url}: ${error.message}`);

    results.push({
      json: {
        ...item.json,
        statusCode: 0,
        error: error.message,
        body: null
      }
    });
  }
}

return results;
```

#### Verification Checklist ✅
- [ ] RateLimiter class created and working
- [ ] RetryStrategy class created with exponential backoff
- [ ] Retryable errors identified (429, 503, 504, timeouts)
- [ ] Node 3 updated with rate limiting
- [ ] Retry logic tested with simulated failures
- [ ] No duplicate requests on retry
- [ ] Jitter applied to prevent thundering herd
- [ ] Max delay capped at 30 seconds

---

### Issue 3.2: Implement HTTPS Certificate Validation

**Severity:** 🟡 MEDIUM
**Current Risk:** MITM attacks, data interception
**Effort:** 2 hours
**Dependencies:** None
**Affected Nodes:** Node 3, Node 7 (HTTP requests)

#### Step 3.2.1: Configure n8n HTTP Verification

**In n8n workflow:**

```json
// Node 3 and Node 7 configuration should have:

{
  "id": "3",
  "name": "Scrape Homepage with Retry",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "url": "={{ $json.store_url }}",
    "method": "GET",

    // ✅ ADD THESE SECURITY SETTINGS:
    "ignoreSSLIssues": false,           // Enforce SSL verification
    "requestFormat": "form",
    "responseFormat": "text",
    "timeout": 30,
    "continueOnFail": false,             // Fail on error (don't ignore)

    // Certificate pinning (if supported)
    "allowUnauthorizedCerts": false,

    "headerParameters": {
      "parameters": [
        // ... existing headers ...
      ]
    }
  }
}
```

#### Step 3.2.2: Add Certificate Validation in Code

**Add to Node 3 (as Code node before HTTP request):**

```javascript
function validateUrl(urlString) {
  try {
    const url = new URL(urlString);

    // Only allow HTTPS (not HTTP)
    if (url.protocol !== 'https:') {
      throw new Error(`Insecure protocol: ${url.protocol}. Only HTTPS allowed.`);
    }

    // Validate hostname
    if (!url.hostname.endsWith('.myshopify.com')) {
      throw new Error(`Invalid Shopify domain: ${url.hostname}`);
    }

    return true;
  } catch (error) {
    throw new Error(`URL validation failed: ${error.message}`);
  }
}

// Use in Node 3
const items = $input.all();

items.forEach(item => {
  validateUrl(item.json.store_url);  // Throws if invalid
});

return items;
```

#### Verification Checklist ✅
- [ ] ignoreSSLIssues set to false in Nodes 3 and 7
- [ ] Only HTTPS protocol allowed
- [ ] Certificate validation enforced
- [ ] Hostname validation implemented
- [ ] Invalid certificates logged and rejected
- [ ] Testing with invalid cert performs properly

---

### Issue 3.3: Add Input/Output Length Validation

**Severity:** 🟡 MEDIUM
**Current Risk:** Memory issues, DoS
**Effort:** 2 hours
**Dependencies:** None
**Affected Nodes:** Node 2, 6, 8

#### Step 3.3.1: Add Validation in Node 2

```javascript
// Top of Node 2

const MAX_STORES = 100;
const MAX_URL_LENGTH = 2048;

// Validate output
const storeList = smartSelection(commonStoreNames, 80);

storeList.forEach((store, idx) => {
  if (store.store_url.length > MAX_URL_LENGTH) {
    throw new Error(`Store URL too long at index ${idx}: ${store.store_url.length} bytes`);
  }

  if (idx >= MAX_STORES) {
    console.warn(`Limiting to ${MAX_STORES} stores (had ${idx + 1})`);
  }
});

return storeList.slice(0, MAX_STORES).map(store => ({ json: store }));
```

#### Verification Checklist ✅
- [ ] Max store count enforced (100)
- [ ] URL length validated
- [ ] Content length capped
- [ ] Output size limits enforced

---

## 🟢 PHASE 4: LOW PRIORITY (Days 11-12)

### Issue 4.1: Refactor Code and Remove Hardcoded Values

**Severity:** 🟢 LOW
**Effort:** 2 hours
**Dependencies:** None

#### Configuration File

**Create:** `config/extraction.config.js`

```javascript
module.exports = {
  discovery: {
    maxStores: 100,
    storeNamesPerCategory: 6
  },

  contactPages: [
    '/pages/contact',
    '/pages/contact-us',
    '/contact',
    '/contact-us',
    '/pages/about',
    '/pages/support',
    '/support',
    '/help',
    '/pages/locations',
    '/locations',
    '/pages/faq',
    '/faq'
  ],

  emailPriorities: ['contact', 'hello', 'info', 'support', 'sales', 'help'],

  limits: {
    maxContentLength: 5000000,  // 5MB
    maxEmails: 1000,
    maxPhones: 1000,
    maxUrlLength: 2048
  },

  rateLimiting: {
    maxRequests: 10,
    windowMs: 60000,
    retryAttempts: 3,
    initialRetryDelayMs: 1000,
    maxRetryDelayMs: 30000
  },

  timeouts: {
    homepageMs: 30000,
    contactPageMs: 20000,
    connectMs: 10000
  }
};
```

#### Verification Checklist ✅
- [ ] Config file created
- [ ] All magic numbers moved to config
- [ ] Config referenced in nodes
- [ ] No hardcoded values remain

---

## 📊 Overall Implementation Timeline

```
Phase 1: CRITICAL (Days 1-3) - 5-7 hours
├─ 1.1: Remove Google Sheets ID (2h)
├─ 1.2: Implement OAuth2 (2-3h)
└─ 1.3: Add URL Validation (1-1.5h)

Phase 2: HIGH (Days 4-7) - 7-10 hours
├─ 2.1: Fix ReDoS Vulnerabilities (3h)
├─ 2.2: Encrypt PII Data (4h)
└─ 2.3: Rate Limiting & Retry (3h)

Phase 3: MEDIUM (Days 8-10) - 5-7 hours
├─ 3.1: Complete Rate Limiting (3h)
├─ 3.2: HTTPS Validation (2h)
└─ 3.3: Length Limits (2h)

Phase 4: LOW (Days 11-12) - 2-3 hours
└─ 4.1: Code Refactoring (2-3h)

Total: 15-20 hours over 2 weeks
```

---

## ✅ Implementation Checklist

### Pre-Implementation
- [ ] Backup current workflow
- [ ] Create new Google Sheet (for Phase 1.1)
- [ ] Set environment variables locally
- [ ] Review all code changes with team

### Phase 1
- [ ] Remove Google Sheets ID
- [ ] Implement OAuth2 flow
- [ ] Add URL validation
- [ ] Test all changes

### Phase 2
- [ ] Fix ReDoS patterns
- [ ] Implement encryption
- [ ] Add rate limiting
- [ ] Run security tests

### Phase 3
- [ ] Add HTTPS validation
- [ ] Implement input/output limits
- [ ] Complete all validations
- [ ] Performance testing

### Phase 4
- [ ] Refactor and cleanup
- [ ] Documentation update
- [ ] Final security review
- [ ] Deployment preparation

### Post-Implementation
- [ ] Deploy to production
- [ ] Monitor logs for issues
- [ ] Collect feedback
- [ ] Document lessons learned

---

## 🔒 Security Testing Strategy

### Unit Tests
- Input validation
- Encryption/decryption
- Rate limiting
- ReDoS patterns

### Integration Tests
- End-to-end workflow
- OAuth token refresh
- Rate limit compliance
- Error handling

### Security Tests
- Malicious input handling
- HTTPS enforcement
- Certificate validation
- PII encryption verification

### Load Tests
- 1000 concurrent requests
- ReDoS protection
- Memory under stress
- Timeout handling

---

## 📝 Documentation Updates

### Files to Update
- [ ] README.md - Add security section
- [ ] CLAUDE.md - Add security guidelines
- [ ] Add DEPLOYMENT.md with security checklist
- [ ] Add ENCRYPTION.md with key management
- [ ] Add OAUTH.md with token management

### Documentation to Add
- [ ] Environment variable setup guide
- [ ] Encryption key generation
- [ ] OAuth credential configuration
- [ ] Deployment checklist
- [ ] Incident response playbook

---

**Status:** 📋 Ready for Implementation
**Next Step:** Awaiting approval to proceed with Phase 1 fixes


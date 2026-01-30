# OAuth2 Token Management Guide

**Last Updated:** 2026-01-30
**Component:** Google Sheets Integration
**Status:** Implementation Guide

---

## Overview

This document describes how to properly configure and manage OAuth2 authentication for the Shopify Contact Scraper workflow to ensure reliable long-term operation.

---

## 1. Configure OAuth2 Credentials in n8n

### Step 1.1: Create New Credential

1. In n8n UI, go to **Admin → Credentials**
2. Click **Create New**
3. Select credential type: **Google Sheets**
4. Click **Authenticate with Google**

### Step 1.2: Configure OAuth2 Scopes

During Google OAuth authorization, ensure these scopes are requested:

```
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/drive
offline_access
```

**Important:** The `offline_access` scope is **CRITICAL**. Without it, you won't get a refresh token.

### Step 1.3: Store Credential

- Name it: `GoogleSheets-ProductionAPI`
- Description: `Production Google Sheets API with refresh token support`
- Save the credential

---

## 2. Enable Token Refresh in n8n

### Automatic Token Refresh (Built-in)

n8n automatically handles OAuth2 token refresh with these features:

- **Automatic Refresh:** When a token is about to expire, n8n automatically requests a new one
- **Background Refresh:** Happens transparently without interrupting the workflow
- **Retry on Failure:** If refresh fails, the workflow can retry

### Configuration

In your n8n environment settings, ensure:

```bash
# .env file (n8n server)
CREDENTIALS_ENCRYPTION_KEY=your-encryption-key
N8N_ENCRYPTION_KEY=your-encryption-key
```

---

## 3. Token Lifecycle

### Token Expiry Schedule

Google OAuth2 access tokens:
- **Lifetime:** 1 hour (3600 seconds)
- **Refresh before:** 5 minutes before expiry
- **Refresh token:** Valid for ~6 months (or until revoked)

### Monitoring Token Status

You can add a "Check OAuth Token" node to monitor:

```javascript
// Code to check token status (for monitoring)
try {
  // Make a test API call to Google Sheets
  const response = await this.helpers.request({
    method: 'GET',
    url: 'https://www.googleapis.com/drive/v3/about?fields=user',
    // Uses stored credential for auth
  });

  if (response.status === 200) {
    return [{ json: {
      token_valid: true,
      timestamp: new Date().toISOString()
    }}];
  } else if (response.status === 401) {
    return [{ json: {
      token_valid: false,
      error: 'Unauthorized - token may be expired',
      timestamp: new Date().toISOString()
    }}];
  }
} catch (error) {
  return [{ json: {
    token_valid: false,
    error: error.message,
    timestamp: new Date().toISOString()
  }}];
}
```

---

## 4. Handling Token Failures

### Error Scenarios

| Error | Status | Retryable | Action |
|-------|--------|-----------|--------|
| Token expired | 401 | Yes | Auto-refresh, then retry |
| Invalid token | 401 | No | Manual re-auth needed |
| Quota exceeded | 403 | Yes | Backoff and retry |
| Rate limited | 429 | Yes | Backoff and retry |
| Network error | 0 | Yes | Retry with backoff |

### Error Handling in Workflow

Add error handling node after Google Sheets operation:

```javascript
// Error Handler Node (after Google Sheets operation)
const error = $node.previous().error;

if (!error) {
  // Success - pass through
  return $input.all();
}

const { message, statusCode } = error;

// 401 = Authentication failure
if (statusCode === 401) {
  console.error('OAuth token authentication failed');
  console.error('Required action: Re-authorize in n8n Credentials settings');
  console.error('Time: ' + new Date().toISOString());

  // Don't retry - need manual intervention
  throw new Error('OAuth token invalid - manual re-authorization required');
}

// 429 = Rate limit
if (statusCode === 429) {
  console.warn('Google API rate limited - backing off');
  // n8n workflow engine will handle backoff
  throw error;
}

// Other errors - log and fail
console.error(`Google Sheets operation failed: ${message}`);
throw error;
```

---

## 5. Token Refresh Workflow (Optional)

Create a separate workflow to proactively refresh tokens:

**Workflow: "Daily OAuth Token Refresh"**

```
Schedule (Daily at 2 AM)
  ↓
Check Google API (make test request)
  ↓
Log Status (success/failure)
  ↓
Alert if credentials need renewal
```

```javascript
// Check node code
const testRequest = await this.helpers.request({
  method: 'GET',
  url: 'https://www.googleapis.com/drive/v3/about?fields=user'
  // Implicitly uses stored Google credential
  // If credential is expired, n8n will auto-refresh
});

const timeToExpiry = testRequest.data?.user?.displayName ?
  'Token is valid' :
  'Token verification incomplete';

return [{ json: {
  check_timestamp: new Date().toISOString(),
  status: 'checked',
  details: timeToExpiry
}}];
```

---

## 6. Best Practices

### ✅ DO

- ✅ Configure offline access scope during OAuth
- ✅ Store credentials in n8n UI (encrypted)
- ✅ Monitor workflow logs for 401 errors
- ✅ Create backup Google Sheet (archive old one)
- ✅ Keep audit logs of who has Sheet access
- ✅ Rotate service accounts periodically
- ✅ Test token refresh manually (make test API call)

### ❌ DON'T

- ❌ Hardcode OAuth tokens in workflow
- ❌ Commit access tokens to Git
- ❌ Share credential files
- ❌ Use user account tokens (use service account)
- ❌ Ignore 401 authentication errors
- ❌ Store tokens in logs or alerts

---

## 7. Troubleshooting

### Issue: "401 Unauthorized" Error

**Cause:** OAuth token is invalid or expired

**Fix:**
1. Go to **Admin → Credentials**
2. Edit the Google Sheets credential
3. Click **Authenticate with Google** again
4. Re-authorize with your Google account
5. Save the updated credential
6. Retry the workflow

### Issue: Token Refresh Fails Silently

**Diagnosis:**
1. Check n8n logs: `docker logs n8n-container | grep -i oauth`
2. Verify offline scope was requested
3. Check Google account security: https://myaccount.google.com/security-checkup

**Fix:**
1. Revoke the old credential
2. Create a new credential (goes through full OAuth flow)
3. Ensure offline scope is enabled

### Issue: "Invalid Grant" Error

**Cause:** Refresh token has expired (after 6 months)

**Fix:**
1. Remove the old credential
2. Create new credential with fresh authorization

---

## 8. Security Checklist

- [ ] OAuth configured with offline access scope
- [ ] Credential stored in n8n UI (not hardcoded)
- [ ] Google account has 2FA enabled
- [ ] Regular audit of Google Sheet access logs
- [ ] Backup Sheet created
- [ ] Old credential revoked in Google Security settings
- [ ] Error handling configured for 401 responses
- [ ] Token refresh tested and working
- [ ] Workflow logs monitored for OAuth errors
- [ ] Documentation updated with credential name

---

## 9. References

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Sheets API Setup](https://developers.google.com/sheets/api/guides/authorizing-requests)
- [n8n Google Sheets Node](https://docs.n8n.io/nodes/n8n-nodes-base.googleSheets/)
- [n8n Credentials Management](https://docs.n8n.io/credentials/)

---

**Last Reviewed:** 2026-01-30
**Next Review:** 2026-02-28 (monthly)

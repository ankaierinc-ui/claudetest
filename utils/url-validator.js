/**
 * URL Validation Utilities
 * Prevents URL injection, DNS rebinding, and malicious redirects
 *
 * Security measures:
 * - Protocol validation (HTTPS/HTTP only)
 * - Domain whitelist (Shopify only)
 * - IP address blocking (prevents DNS rebinding)
 * - Path validation
 * - Special character blocking
 * - Length limits
 */

class URLValidator {
  /**
   * Validate Shopify store URL
   * @param {string} storeUrl - URL to validate
   * @returns {boolean} true if valid
   * @throws {Error} if invalid
   */
  static validateStoreUrl(storeUrl) {
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
        errors.push('IP addresses and localhost not allowed');
      }

      // 5. Check path (should be root only)
      if (url.pathname !== '/' && url.pathname !== '') {
        errors.push(`Invalid URL path: ${url.pathname}`);
      }

      // 6. Check port (should be 80 or 443 if specified)
      if (url.port && !['80', '443'].includes(url.port)) {
        errors.push(`Invalid port: ${url.port}`);
      }

      // 7. Check for special characters that might bypass validation
      if (/%[0-9a-fA-F]{2}|@|\.\./.test(storeUrl)) {
        errors.push('URL contains suspicious encoding or special characters');
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

  /**
   * Validate contact page URL
   * Ensures URL is on same domain as base URL and uses allowed paths
   *
   * @param {string} contactUrl - URL to validate
   * @param {string} baseUrl - Base store URL for domain comparison
   * @returns {boolean} true if valid
   * @throws {Error} if invalid
   */
  static validateContactUrl(contactUrl, baseUrl) {
    try {
      // 1. Parse URLs
      const baseUrlObj = new URL(baseUrl);
      const contactUrlObj = new URL(contactUrl);

      // 2. Must be same domain as base
      if (contactUrlObj.hostname !== baseUrlObj.hostname) {
        throw new Error(`Contact URL on different domain: ${contactUrlObj.hostname}`);
      }

      // 3. Must use same protocol
      if (contactUrlObj.protocol !== baseUrlObj.protocol) {
        throw new Error(`Contact URL uses different protocol: ${contactUrlObj.protocol}`);
      }

      // 4. Path must be under allowed paths
      const allowedPaths = [
        '/pages/contact', '/pages/contact-us', '/contact', '/contact-us',
        '/pages/about', '/pages/support', '/support', '/help',
        '/pages/locations', '/locations', '/pages/faq', '/faq'
      ];

      if (!allowedPaths.includes(contactUrlObj.pathname)) {
        throw new Error(`Disallowed path: ${contactUrlObj.pathname}`);
      }

      // 5. No parameters allowed
      if (contactUrlObj.search) {
        throw new Error('Contact URLs should not have query parameters');
      }

      // 6. No hash fragments
      if (contactUrlObj.hash) {
        throw new Error('Contact URLs should not have hash fragments');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sanitize URL for logging (remove sensitive parts)
   * @param {string} url - URL to sanitize
   * @returns {string} sanitized URL
   */
  static sanitizeForLogging(url) {
    try {
      const parsed = new URL(url);
      // Keep protocol, hostname, port, pathname
      // Remove search params and hash
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
    } catch {
      return '[invalid-url]';
    }
  }
}

module.exports = URLValidator;

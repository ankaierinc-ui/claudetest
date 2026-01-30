/**
 * Contact Information Extractor
 * Safe email and phone extraction with ReDoS protection
 *
 * Prevents Regular Expression Denial of Service (ReDoS) attacks
 * by avoiding catastrophic backtracking in regex patterns
 */

class ContactExtractor {
  constructor(maxInputLength = 5000000) {
    this.maxInputLength = maxInputLength; // 5MB default limit

    // Safe, bounded regex patterns (no backtracking risk)
    // These patterns are designed to NOT have nested quantifiers
    this.patterns = {
      // Simple pattern for basic email detection
      basicEmail: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,

      // International format +[0-9]{1,3} [0-9]{6,14}
      internationalPhone: /\+\d{1,3}\s?[\d\s\-\.]{6,14}\d/g,

      // US format (XXX) XXX-XXXX
      usPhone: /\(?(\d{3})\)?[\s\-\.]?(\d{3})[\s\-\.]?(\d{4})/g,

      // Common formats XXX-XXX-XXXX
      commonPhone: /\d{3}[\s\-\.]\d{3}[\s\-\.]\d{4}/g
    };
  }

  /**
   * Extract emails from text - ReDoS safe version
   * Uses simple string matching instead of complex regex
   * @param {string} text - Text to extract from
   * @returns {string[]} Array of valid emails
   */
  extractEmails(text) {
    if (!text || typeof text !== 'string') return [];

    // CRITICAL: Limit input length to prevent ReDoS
    if (text.length > this.maxInputLength) {
      console.warn(`Input text truncated from ${text.length} to ${this.maxInputLength}`);
      text = text.substring(0, this.maxInputLength);
    }

    const emails = new Set();

    try {
      // Method: Match potential emails, then validate
      // This avoids complex regex backtracking
      const potentialEmails = text.match(this.patterns.basicEmail) || [];

      potentialEmails.forEach(email => {
        if (this.isValidEmail(email)) {
          emails.add(email.toLowerCase());
        }
      });

    } catch (error) {
      console.error(`Email extraction error: ${error.message}`);
      // Return what we have so far
    }

    return Array.from(emails).sort();
  }

  /**
   * Validate email without complex regex
   * Uses simple string checks instead of backtracking patterns
   * @param {string} email - Email to validate
   * @returns {boolean} true if valid
   */
  isValidEmail(email) {
    // Basic structural checks (no regex backtracking)
    if (email.length > 254) return false;
    if (email.startsWith('.') || email.endsWith('.')) return false;
    if (email.includes('..')) return false;

    const [local, domain] = email.split('@');

    // Local part validation
    if (!local || !domain) return false;
    if (local.length > 64) return false;
    if (local.startsWith('-') || local.endsWith('-')) return false;

    // Domain validation
    if (domain.length < 3) return false;
    if (domain.startsWith('-') || domain.endsWith('-')) return false;

    // Must have valid TLD
    const domainParts = domain.split('.');
    if (domainParts.length < 2) return false;
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2 || tld.length > 6) return false;
    if (!/^[a-zA-Z]+$/.test(tld)) return false;

    // Blocklist checks
    const blocklist = [
      'noreply', 'no-reply', 'donotreply', 'example',
      'test', 'admin@localhost', 'fake', 'dummy'
    ];
    const lowerEmail = email.toLowerCase();
    if (blocklist.some(item => lowerEmail.includes(item))) return false;

    return true;
  }

  /**
   * Extract phone numbers - ReDoS safe version
   * Uses multiple simple patterns instead of complex alternation
   * @param {string} text - Text to extract from
   * @returns {string[]} Array of valid phone numbers
   */
  extractPhones(text) {
    if (!text || typeof text !== 'string') return [];

    // Limit input
    if (text.length > this.maxInputLength) {
      text = text.substring(0, this.maxInputLength);
    }

    const phones = new Set();

    try {
      // Pattern 1: International format +[0-9]{1,3} [0-9]{6,14}
      const internationalMatches = text.match(this.patterns.internationalPhone) || [];
      internationalMatches.forEach(p => {
        const cleaned = this.cleanPhone(p);
        if (this.isValidPhone(cleaned)) phones.add(p.trim());
      });

      // Pattern 2: US format (XXX) XXX-XXXX
      const usMatches = text.match(this.patterns.usPhone) || [];
      usMatches.forEach(p => {
        const cleaned = this.cleanPhone(p);
        if (this.isValidPhone(cleaned)) phones.add(p.trim());
      });

      // Pattern 3: Common formats XXX-XXX-XXXX
      const commonMatches = text.match(this.patterns.commonPhone) || [];
      commonMatches.forEach(p => {
        const cleaned = this.cleanPhone(p);
        if (this.isValidPhone(cleaned)) phones.add(p.trim());
      });

    } catch (error) {
      console.error(`Phone extraction error: ${error.message}`);
    }

    return Array.from(phones).sort();
  }

  /**
   * Remove formatting from phone number
   * @param {string} phone - Phone number to clean
   * @returns {string} Cleaned phone (digits only)
   */
  cleanPhone(phone) {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  /**
   * Validate phone number (structured checks, not regex)
   * @param {string} phone - Cleaned phone number
   * @returns {boolean} true if valid
   */
  isValidPhone(phone) {
    const cleaned = this.cleanPhone(phone);

    // Basic length validation
    if (cleaned.length < 10) return false;
    if (cleaned.length > 15) return false;

    // Must contain only digits
    if (!/^\d+$/.test(cleaned)) return false;

    // Not all same digit (e.g., 0000000000)
    if (/^(\d)\1{9,}$/.test(cleaned)) return false;

    // Not patterns like 000-000-0000
    if (/^(000|111|222|333|444|555|666|777|888|999)/.test(cleaned)) return false;

    return true;
  }

  /**
   * Prioritize emails by relevance
   * @param {string[]} emails - List of emails
   * @returns {Object} {primary, secondary, confidence}
   */
  prioritizeEmails(emails) {
    if (!emails || emails.length === 0) {
      return { primary: '', secondary: '', confidence: 0 };
    }

    // Priority order for email addresses
    const priorities = ['contact', 'hello', 'info', 'support', 'sales', 'help'];
    let primary = emails[0];
    let confidence = 0.5;

    for (let i = 0; i < priorities.length; i++) {
      const priority = priorities[i];
      const found = emails.find(e => e.toLowerCase().includes(priority));

      if (found) {
        primary = found;
        // Confidence increases with higher priority match
        confidence = Math.min(0.95, 0.6 + (i / priorities.length) * 0.35);
        break;
      }
    }

    return {
      primary,
      secondary: emails.find((e, idx) => idx > 0 && e !== primary) || '',
      confidence: parseFloat(confidence.toFixed(2))
    };
  }

  /**
   * Prioritize phone numbers
   * @param {string[]} phones - List of phones
   * @returns {Object} {primary, secondary}
   */
  prioritizePhones(phones) {
    if (!phones || phones.length === 0) {
      return { primary: '', secondary: '' };
    }

    return {
      primary: phones[0],
      secondary: phones[1] || ''
    };
  }

  /**
   * Calculate data quality score
   * @param {string[]} emails - Emails found
   * @param {string[]} phones - Phones found
   * @param {number} pageCount - Number of pages scraped
   * @returns {number} Quality score 0-100
   */
  calculateQualityScore(emails, phones, pageCount) {
    let score = 50; // Base score

    if (emails && emails.length > 0) score += 25;
    if (emails && emails.length > 1) score += 10;
    if (phones && phones.length > 0) score += 15;
    if (phones && phones.length > 1) score += 5;
    if (pageCount > 1) score += 10;

    return Math.min(100, score);
  }
}

module.exports = ContactExtractor;

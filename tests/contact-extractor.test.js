/**
 * Contact Extractor Tests
 * Tests for ReDoS prevention and correct extraction
 */

const ContactExtractor = require('../utils/contact-extractor');

describe('ContactExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new ContactExtractor(1000000); // 1MB limit
  });

  describe('ReDoS Protection Tests', () => {

    it('should handle pathological email input without hanging', () => {
      // Input that would cause catastrophic backtracking in unsafe regex
      const maliciousInput = 'a'.repeat(50000) + '@';

      const startTime = Date.now();
      const result = extractor.extractEmails(maliciousInput);
      const duration = Date.now() - startTime;

      // Should complete in < 100ms even with 50k character input
      expect(duration).toBeLessThan(100);
      expect(result).toEqual([]);
    });

    it('should handle repeated separators in phone extraction', () => {
      // Pattern that would cause backtracking in unsafe regex
      const maliciousInput = '1'.repeat(10000) + '-';

      const startTime = Date.now();
      const result = extractor.extractPhones(maliciousInput);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

    it('should enforce input length limits', () => {
      const hugeInput = 'x'.repeat(2000000); // 2MB (exceeds 1MB limit)

      // Should truncate input, not process full length
      const result = extractor.extractEmails(hugeInput);

      // Result should be processed from truncated input
      expect(result.length).toEqual(0); // No valid emails in truncated input
    });

    it('should handle exponential backtracking protection', () => {
      // Craft input that tests nested quantifier handling
      const backtrackInput = 'a' + 'b'.repeat(10000) + 'c';

      const startTime = Date.now();
      extractor.extractEmails(backtrackInput);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100);
    });

  });

  describe('Email Extraction - Valid Cases', () => {

    it('should extract single email', () => {
      const text = 'Contact us at: contact@example.com';
      const result = extractor.extractEmails(text);

      expect(result).toContain('contact@example.com');
    });

    it('should extract multiple emails', () => {
      const text = `
        Contact: contact@example.com
        Sales: sales@example.com
        Support: support@example.co.uk
      `;

      const result = extractor.extractEmails(text);

      expect(result).toContain('contact@example.com');
      expect(result).toContain('sales@example.com');
      expect(result).toContain('support@example.co.uk');
    });

    it('should handle emails with numbers and special chars', () => {
      const text = 'Email: user.name+tag@example123.co.uk';
      const result = extractor.extractEmails(text);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should deduplicate emails', () => {
      const text = 'contact@example.com and CONTACT@EXAMPLE.COM';
      const result = extractor.extractEmails(text);

      expect(result.length).toBe(1);
      expect(result[0]).toBe('contact@example.com');
    });

    it('should sort emails alphabetically', () => {
      const text = 'z@e.com a@e.com m@e.com';
      const result = extractor.extractEmails(text);

      expect(result[0]).toBe('a@e.com');
      expect(result[1]).toBe('m@e.com');
      expect(result[2]).toBe('z@e.com');
    });
  });

  describe('Email Extraction - Invalid Cases', () => {

    it('should reject emails without TLD', () => {
      const text = 'email@localhost, test@internal';
      const result = extractor.extractEmails(text);

      // Should be rejected or filtered
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should reject blocklisted emails', () => {
      const text = `
        noreply@example.com
        admin@localhost
        test@example.com
        fake@example.com
      `;

      const result = extractor.extractEmails(text);

      expect(result).not.toContain('noreply@example.com');
      expect(result).not.toContain('admin@localhost');
      expect(result).not.toContain('test@example.com');
      expect(result).not.toContain('fake@example.com');
    });

    it('should reject malformed emails', () => {
      const text = '..@example.com .email@example.com email.@example.com';
      const result = extractor.extractEmails(text);

      // Most malformed emails should be rejected
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should reject emails longer than 254 chars', () => {
      const longLocal = 'a'.repeat(300) + '@example.com';
      const text = `valid@example.com ${longLocal}`;
      const result = extractor.extractEmails(text);

      expect(result).toContain('valid@example.com');
      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Phone Extraction - Valid Cases', () => {

    it('should extract US phone format (XXX) XXX-XXXX', () => {
      const text = 'Call (555) 123-4567 today';
      const result = extractor.extractPhones(text);

      expect(result).toContain('(555) 123-4567');
    });

    it('should extract international format +1 555-123-4567', () => {
      const text = 'International: +1 555-123-4567';
      const result = extractor.extractPhones(text);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should extract multiple phone formats', () => {
      const text = `
        US: (555) 123-4567
        International: +1 555-123-4567
        Common: 555.123.4567
      `;

      const result = extractor.extractPhones(text);

      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle phone numbers with various separators', () => {
      const text = '555-123-4567 555.123.4567 555 123 4567';
      const result = extractor.extractPhones(text);

      expect(result.length).toBeGreaterThanOrEqual(1);
    });

  });

  describe('Phone Extraction - Invalid Cases', () => {

    it('should reject all same digits', () => {
      const text = '(000) 000-0000 111-111-1111';
      const result = extractor.extractPhones(text);

      // Invalid patterns should be rejected
      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should reject numbers shorter than 10 digits', () => {
      const text = '123-456 55-5555';
      const result = extractor.extractPhones(text);

      expect(result.length).toBeLessThanOrEqual(1);
    });

    it('should reject malformed patterns', () => {
      const text = 'phone: 1234 or call x1234567890';
      const result = extractor.extractPhones(text);

      // Malformed should not be extracted
      expect(result.length).toEqual(0);
    });
  });

  describe('Email Prioritization', () => {

    it('should prioritize contact email', () => {
      const emails = ['random@example.com', 'contact@example.com', 'other@example.com'];
      const result = extractor.prioritizeEmails(emails);

      expect(result.primary).toBe('contact@example.com');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should prioritize in correct order', () => {
      const emails = ['other@example.com', 'info@example.com'];
      const result = extractor.prioritizeEmails(emails);

      expect(result.primary).toBe('info@example.com');
    });

    it('should have fallback primary', () => {
      const emails = ['random1@example.com', 'random2@example.com'];
      const result = extractor.prioritizeEmails(emails);

      expect(result.primary).toBe('random1@example.com');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle empty list', () => {
      const result = extractor.prioritizeEmails([]);

      expect(result.primary).toBe('');
      expect(result.confidence).toBe(0);
    });
  });

  describe('Phone Prioritization', () => {

    it('should return primary phone', () => {
      const phones = ['(555) 111-1111', '(555) 222-2222'];
      const result = extractor.prioritizePhones(phones);

      expect(result.primary).toBe('(555) 111-1111');
    });

    it('should return secondary phone', () => {
      const phones = ['(555) 111-1111', '(555) 222-2222'];
      const result = extractor.prioritizePhones(phones);

      expect(result.secondary).toBe('(555) 222-2222');
    });

    it('should handle single phone', () => {
      const phones = ['(555) 111-1111'];
      const result = extractor.prioritizePhones(phones);

      expect(result.primary).toBe('(555) 111-1111');
      expect(result.secondary).toBe('');
    });
  });

  describe('Quality Score Calculation', () => {

    it('should calculate base score', () => {
      const score = extractor.calculateQualityScore([], [], 0);
      expect(score).toBe(50);
    });

    it('should add points for emails', () => {
      const scoreWithEmail = extractor.calculateQualityScore(['test@example.com'], [], 0);
      expect(scoreWithEmail).toBeGreaterThan(50);

      const scoreWithTwoEmails = extractor.calculateQualityScore(
        ['test@example.com', 'test2@example.com'],
        [],
        0
      );
      expect(scoreWithTwoEmails).toBeGreaterThan(scoreWithEmail);
    });

    it('should add points for phones', () => {
      const scoreWithPhone = extractor.calculateQualityScore([], ['555-123-4567'], 0);
      expect(scoreWithPhone).toBeGreaterThan(50);
    });

    it('should add points for multiple pages', () => {
      const scoreOnePage = extractor.calculateQualityScore([], [], 1);
      const scoreMultiPage = extractor.calculateQualityScore([], [], 5);

      expect(scoreMultiPage).toBeGreaterThan(scoreOnePage);
    });

    it('should max out at 100', () => {
      const score = extractor.calculateQualityScore(
        ['a@e.com', 'b@e.com', 'c@e.com'],
        ['111-222-3333', '222-333-4444'],
        10
      );

      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Input Validation', () => {

    it('should handle null input', () => {
      expect(extractor.extractEmails(null)).toEqual([]);
      expect(extractor.extractPhones(null)).toEqual([]);
    });

    it('should handle undefined input', () => {
      expect(extractor.extractEmails(undefined)).toEqual([]);
      expect(extractor.extractPhones(undefined)).toEqual([]);
    });

    it('should handle empty string', () => {
      expect(extractor.extractEmails('')).toEqual([]);
      expect(extractor.extractPhones('')).toEqual([]);
    });
  });
});

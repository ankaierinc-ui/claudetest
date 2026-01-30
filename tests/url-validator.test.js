/**
 * URL Validator Tests
 * Tests for security validations
 */

const URLValidator = require('../utils/url-validator');

describe('URLValidator', () => {
  describe('validateStoreUrl', () => {

    describe('Valid URLs', () => {
      const validUrls = [
        'https://shop.myshopify.com',
        'https://example-store.myshopify.com',
        'https://test-123.myshopify.com',
        'http://shop.myshopify.com',
        'https://a.myshopify.com'
      ];

      validUrls.forEach(url => {
        it(`should accept: ${url}`, () => {
          expect(() => URLValidator.validateStoreUrl(url)).not.toThrow();
        });
      });
    });

    describe('Invalid URLs - Domain', () => {
      const invalidUrls = {
        'https://example.com': 'non-Shopify domain',
        'https://shop.example.com': 'wrong domain',
        'https://evil.com': 'non-Shopify',
        'https://myshopify.com': 'missing subdomain'
      };

      Object.entries(invalidUrls).forEach(([url, reason]) => {
        it(`should reject: ${url} (${reason})`, () => {
          expect(() => URLValidator.validateStoreUrl(url))
            .toThrow(/Invalid Shopify domain/);
        });
      });
    });

    describe('Invalid URLs - IP Addresses', () => {
      const invalidIPs = [
        'https://192.168.1.1',
        'https://127.0.0.1',
        'http://10.0.0.1',
        'https://[::1]'
      ];

      invalidIPs.forEach(url => {
        it(`should reject IP address: ${url}`, () => {
          expect(() => URLValidator.validateStoreUrl(url))
            .toThrow(/IP addresses and localhost not allowed/);
        });
      });
    });

    describe('Invalid URLs - Localhost', () => {
      it('should reject localhost', () => {
        expect(() => URLValidator.validateStoreUrl('https://localhost'))
          .toThrow();
      });
    });

    describe('Invalid URLs - Protocol', () => {
      const invalidProtocols = [
        'ftp://shop.myshopify.com',
        'file:///shop.myshopify.com',
        'data:text/plain,shop.myshopify.com'
      ];

      invalidProtocols.forEach(url => {
        it(`should reject: ${url}`, () => {
          expect(() => URLValidator.validateStoreUrl(url))
            .toThrow(/Invalid protocol|Malformed URL/);
        });
      });
    });

    describe('Invalid URLs - Path', () => {
      const invalidPaths = [
        'https://shop.myshopify.com/admin',
        'https://shop.myshopify.com/pages',
        'https://shop.myshopify.com/contact'
      ];

      invalidPaths.forEach(url => {
        it(`should reject path: ${url}`, () => {
          expect(() => URLValidator.validateStoreUrl(url))
            .toThrow(/Invalid URL path/);
        });
      });
    });

    describe('Invalid URLs - Port', () => {
      it('should reject non-standard port', () => {
        expect(() => URLValidator.validateStoreUrl('https://shop.myshopify.com:8080'))
          .toThrow(/Invalid port/);
      });

      it('should accept standard ports', () => {
        expect(() => URLValidator.validateStoreUrl('https://shop.myshopify.com:443')).not.toThrow();
        expect(() => URLValidator.validateStoreUrl('http://shop.myshopify.com:80')).not.toThrow();
      });
    });

    describe('Invalid URLs - Encoding', () => {
      it('should reject URL encoded paths', () => {
        expect(() => URLValidator.validateStoreUrl('https://shop.myshopify.com/%2e%2e'))
          .toThrow(/suspicious encoding/);
      });

      it('should reject @ character', () => {
        expect(() => URLValidator.validateStoreUrl('https://shop.myshopify.com@evil.com'))
          .toThrow(/suspicious encoding|Invalid Shopify domain/);
      });

      it('should reject double dots', () => {
        expect(() => URLValidator.validateStoreUrl('https://shop.myshopify.com/..'))
          .toThrow();
      });
    });

    describe('Invalid URLs - Length', () => {
      it('should reject URL longer than 2048 chars', () => {
        const longUrl = 'https://shop.myshopify.com' + 'a'.repeat(2050);
        expect(() => URLValidator.validateStoreUrl(longUrl))
          .toThrow(/URL too long/);
      });
    });

  });

  describe('validateContactUrl', () => {

    const baseUrl = 'https://shop.myshopify.com';

    describe('Valid contact URLs', () => {
      const validPaths = [
        'https://shop.myshopify.com/contact',
        'https://shop.myshopify.com/pages/contact-us',
        'https://shop.myshopify.com/support',
        'https://shop.myshopify.com/pages/about',
        'https://shop.myshopify.com/help'
      ];

      validPaths.forEach(url => {
        it(`should accept: ${url}`, () => {
          expect(() => URLValidator.validateContactUrl(url, baseUrl)).not.toThrow();
        });
      });
    });

    describe('Invalid contact URLs - Different domain', () => {
      it('should reject URL on different domain', () => {
        const evilUrl = 'https://attacker.com/contact';
        expect(() => URLValidator.validateContactUrl(evilUrl, baseUrl))
          .toThrow(/different domain/);
      });

      it('should reject URL with subdomain change', () => {
        const evilUrl = 'https://evil.myshopify.com/contact';
        expect(() => URLValidator.validateContactUrl(evilUrl, baseUrl))
          .toThrow(/different domain/);
      });
    });

    describe('Invalid contact URLs - Different protocol', () => {
      it('should reject HTTP when base is HTTPS', () => {
        const httpUrl = 'http://shop.myshopify.com/contact';
        expect(() => URLValidator.validateContactUrl(httpUrl, baseUrl))
          .toThrow(/different protocol/);
      });
    });

    describe('Invalid contact URLs - Query parameters', () => {
      it('should reject URL with query parameters', () => {
        const urlWithParams = 'https://shop.myshopify.com/contact?redirect=//evil.com';
        expect(() => URLValidator.validateContactUrl(urlWithParams, baseUrl))
          .toThrow(/query parameters/);
      });

      it('should reject URL with tracking params', () => {
        const urlWithTracking = 'https://shop.myshopify.com/contact?utm_source=attack';
        expect(() => URLValidator.validateContactUrl(urlWithTracking, baseUrl))
          .toThrow(/query parameters/);
      });
    });

    describe('Invalid contact URLs - Disallowed paths', () => {
      const disallowedPaths = [
        'https://shop.myshopify.com/admin',
        'https://shop.myshopify.com/',
        'https://shop.myshopify.com/products',
        'https://shop.myshopify.com/unknown'
      ];

      disallowedPaths.forEach(url => {
        it(`should reject disallowed path: ${url}`, () => {
          expect(() => URLValidator.validateContactUrl(url, baseUrl))
            .toThrow(/Disallowed path/);
        });
      });
    });

    describe('Invalid contact URLs - Hash fragments', () => {
      it('should reject URL with hash fragment', () => {
        const urlWithHash = 'https://shop.myshopify.com/contact#evil';
        expect(() => URLValidator.validateContactUrl(urlWithHash, baseUrl))
          .toThrow(/hash fragments/);
      });
    });
  });

  describe('sanitizeForLogging', () => {
    it('should remove sensitive query parameters', () => {
      const url = 'https://shop.myshopify.com/contact?api_key=secret&token=sensitive';
      const result = URLValidator.sanitizeForLogging(url);
      expect(result).toBe('https://shop.myshopify.com/contact');
      expect(result).not.toContain('secret');
      expect(result).not.toContain('sensitive');
    });

    it('should remove hash fragments', () => {
      const url = 'https://shop.myshopify.com/contact#admin-panel';
      const result = URLValidator.sanitizeForLogging(url);
      expect(result).toBe('https://shop.myshopify.com/contact');
    });

    it('should preserve host and pathname', () => {
      const url = 'https://shop.myshopify.com:443/contact';
      const result = URLValidator.sanitizeForLogging(url);
      expect(result).toContain('shop.myshopify.com');
      expect(result).toContain('/contact');
    });

    it('should handle invalid URLs gracefully', () => {
      const result = URLValidator.sanitizeForLogging('not a valid url');
      expect(result).toBe('[invalid-url]');
    });
  });

});

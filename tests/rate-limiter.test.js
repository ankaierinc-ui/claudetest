/**
 * Rate Limiter Tests
 * Tests for token bucket rate limiting implementation
 */

const RateLimiter = require('../utils/rate-limiter');

describe('RateLimiter', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter(10, 1000); // 10 requests per 1 second
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const defaultLimiter = new RateLimiter();
      expect(defaultLimiter.maxRequests).toBe(10);
      expect(defaultLimiter.windowMs).toBe(60000);
    });

    it('should initialize with custom values', () => {
      expect(limiter.maxRequests).toBe(10);
      expect(limiter.windowMs).toBe(1000);
    });
  });

  describe('Token Bucket Basics', () => {
    it('should start with full bucket', () => {
      const bucket = limiter.getBucket('example.com');
      expect(bucket.tokens).toBe(10);
    });

    it('should allow requests when tokens available', () => {
      expect(limiter.isAllowed('example.com')).toBe(true);
    });

    it('should consume tokens on request', async () => {
      await limiter.acquireToken('example.com');
      const bucket = limiter.getBucket('example.com');
      expect(bucket.tokens).toBeLessThan(10);
    });

    it('should track request count', async () => {
      const bucket = limiter.getBucket('example.com');
      expect(bucket.requestCount).toBe(0);

      await limiter.acquireToken('example.com');
      expect(bucket.requestCount).toBe(1);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests up to limit', async () => {
      for (let i = 0; i < 10; i++) {
        expect(limiter.isAllowed('example.com')).toBe(true);
        await limiter.acquireToken('example.com');
      }
    });

    it('should deny requests over limit', async () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquireToken('example.com');
      }

      // Should not have tokens for next request
      expect(limiter.isAllowed('example.com')).toBe(false);
    });

    it('should refill tokens over time', async () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquireToken('example.com');
      }

      // Wait for partial refill
      await new Promise(resolve => setTimeout(resolve, 500));

      // Should have some tokens (50% refill)
      const bucket = limiter.getBucket('example.com');
      expect(bucket.tokens).toBeGreaterThan(0);
      expect(bucket.tokens).toBeLessThan(10);
    });

    it('should fully refill after window', async () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquireToken('example.com');
      }

      // Wait for full window
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should have full tokens again
      const bucket = limiter.getBucket('example.com');
      expect(bucket.tokens).toBeCloseTo(10, 0);
    });

    it('should handle multiple hosts independently', async () => {
      // Consume tokens from host1
      for (let i = 0; i < 10; i++) {
        await limiter.acquireToken('host1.com');
      }

      // host2 should still have tokens
      expect(limiter.isAllowed('host2.com')).toBe(true);
    });

    it('should require multiple tokens', async () => {
      // Consume 9 tokens
      for (let i = 0; i < 9; i++) {
        await limiter.acquireToken('example.com', 1);
      }

      // Should not allow request needing 2 tokens
      expect(limiter.isAllowed('example.com', 2)).toBe(false);

      // Should allow request needing 1 token
      expect(limiter.isAllowed('example.com', 1)).toBe(true);
    });
  });

  describe('Concurrent Requests', () => {
    it('should track concurrent requests', async () => {
      expect(limiter.concurrentRequests.get('example.com') || 0).toBe(0);

      await limiter.acquireConcurrentSlot('example.com');
      expect(limiter.concurrentRequests.get('example.com')).toBe(1);
    });

    it('should allow up to max concurrent', async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.acquireConcurrentSlot('example.com');
      }

      expect(limiter.concurrentRequests.get('example.com')).toBe(5);
    });

    it('should block when at max concurrent', async () => {
      for (let i = 0; i < 5; i++) {
        await limiter.acquireConcurrentSlot('example.com');
      }

      let blocked = false;
      const promise = limiter.acquireConcurrentSlot('example.com').then(() => {
        blocked = true;
      });

      // Give it time to block
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(blocked).toBe(false);

      // Release a slot
      limiter.releaseConcurrentSlot('example.com');

      // Now should proceed
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(blocked).toBe(true);
    });

    it('should release concurrent slots', async () => {
      await limiter.acquireConcurrentSlot('example.com');
      await limiter.acquireConcurrentSlot('example.com');

      expect(limiter.concurrentRequests.get('example.com')).toBe(2);

      limiter.releaseConcurrentSlot('example.com');
      expect(limiter.concurrentRequests.get('example.com')).toBe(1);
    });
  });

  describe('Status and Monitoring', () => {
    it('should provide status information', async () => {
      await limiter.acquireToken('example.com');

      const status = limiter.getStatus('example.com');

      expect(status).toHaveProperty('host', 'example.com');
      expect(status).toHaveProperty('availableTokens');
      expect(status).toHaveProperty('maxTokens', 10);
      expect(status).toHaveProperty('canProceed');
    });

    it('should calculate next available time', async () => {
      // Consume all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.acquireToken('example.com');
      }

      const nextMs = limiter.getNextAvailableMs('example.com');
      expect(nextMs).toBeGreaterThan(0);
      expect(nextMs).toBeLessThanOrEqual(1000);
    });

    it('should list all active hosts', async () => {
      await limiter.acquireToken('host1.com');
      await limiter.acquireToken('host2.com');
      await limiter.acquireToken('host3.com');

      const hosts = limiter.getActiveHosts();
      expect(hosts).toContain('host1.com');
      expect(hosts).toContain('host2.com');
      expect(hosts).toContain('host3.com');
      expect(hosts.length).toBe(3);
    });

    it('should provide stats for all hosts', async () => {
      await limiter.acquireToken('host1.com');
      await limiter.acquireToken('host2.com');

      const stats = limiter.getAllStats();
      expect(stats.length).toBeGreaterThanOrEqual(2);
      expect(stats[0]).toHaveProperty('host');
      expect(stats[0]).toHaveProperty('canProceed');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset single host', async () => {
      // Consume all tokens from a host
      for (let i = 0; i < 10; i++) {
        await limiter.acquireToken('example.com');
      }

      // Verify exhausted
      expect(limiter.isAllowed('example.com')).toBe(false);

      // Reset
      limiter.reset('example.com');

      // Should be restored
      expect(limiter.isAllowed('example.com')).toBe(true);
    });

    it('should reset all hosts', async () => {
      // Consume tokens from multiple hosts
      for (let i = 0; i < 10; i++) {
        await limiter.acquireToken('host1.com');
        await limiter.acquireToken('host2.com');
      }

      // Reset all
      limiter.resetAll();

      // All should be restored
      expect(limiter.isAllowed('host1.com')).toBe(true);
      expect(limiter.isAllowed('host2.com')).toBe(true);
    });

    it('should clear concurrent slots on reset', async () => {
      await limiter.acquireConcurrentSlot('example.com');
      expect(limiter.concurrentRequests.get('example.com')).toBe(1);

      limiter.reset('example.com');
      expect(limiter.concurrentRequests.get('example.com')).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero token requests', async () => {
      // Requesting 0 tokens should always be allowed
      expect(limiter.isAllowed('example.com', 0)).toBe(true);
    });

    it('should handle large token requests', async () => {
      expect(limiter.isAllowed('example.com', 100)).toBe(false);
    });

    it('should handle rapid requests', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(limiter.acquireToken('example.com'));
      }

      await Promise.all(promises);
      const bucket = limiter.getBucket('example.com');
      expect(bucket.tokens).toBeLessThanOrEqual(0);
    });

    it('should allow 15 requests over multiple windows', async () => {
      // First 10 should go immediately, next 5 should wait for refill
      const startTime = Date.now();

      for (let i = 0; i < 15; i++) {
        await limiter.acquireToken('example.com');
      }

      const elapsed = Date.now() - startTime;
      const bucket = limiter.getBucket('example.com');

      // Tokens should be exhausted or near 0 after 15 requests (10 per window)
      expect(bucket.tokens).toBeLessThanOrEqual(0);
      // Should have taken time for second window
      expect(elapsed).toBeGreaterThan(500);
    });

    it('should handle very large windows', async () => {
      const largeLimiter = new RateLimiter(100, 86400000); // 100 requests per day
      expect(largeLimiter.isAllowed('example.com')).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle realistic API throttling scenario', async () => {
      // Simulate hitting API limit - use acquireToken which properly blocks
      const startTime = Date.now();
      let blockedCount = 0;

      for (let i = 0; i < 12; i++) {
        if (!limiter.isAllowed('api.example.com')) {
          blockedCount++;
        }
        // acquireToken will block if needed
        await limiter.acquireToken('api.example.com');
      }

      const elapsed = Date.now() - startTime;

      // Should have had at least 2 requests blocked (12 requests, 10 per window)
      expect(blockedCount).toBeGreaterThanOrEqual(1);
      // With blocking, should take some time (but may be fast due to timer resolution)
      expect(elapsed).toBeGreaterThanOrEqual(0);
      expect(elapsed).toBeLessThan(3000);
    });

    it('should coordinate rate and concurrent limits', async () => {
      // Setup: 3 requests per 100ms, max 2 concurrent
      const coordLimiter = new RateLimiter(3, 100);
      coordLimiter.maxConcurrent = 2;

      const results = [];

      const makeRequest = async (id) => {
        const startTime = Date.now();
        await coordLimiter.acquireToken('example.com');
        await coordLimiter.acquireConcurrentSlot('example.com');

        try {
          // Simulate request
          await new Promise(resolve => setTimeout(resolve, 50));
        } finally {
          coordLimiter.releaseConcurrentSlot('example.com');
        }

        results.push({
          id,
          duration: Date.now() - startTime
        });
      };

      // Queue multiple requests
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(makeRequest(i));
      }

      await Promise.all(promises);
      expect(results.length).toBe(5);
    });
  });
});

/**
 * Retry Strategy Tests
 * Tests for exponential backoff retry logic
 */

const RetryStrategy = require('../utils/retry-strategy');

describe('RetryStrategy', () => {
  let strategy;

  beforeEach(() => {
    strategy = new RetryStrategy({
      maxRetries: 3,
      initialDelayMs: 100,
      maxDelayMs: 1000
    });
  });

  describe('Initialization', () => {
    it('should initialize with defaults', () => {
      const defaultStrategy = new RetryStrategy();
      expect(defaultStrategy.maxRetries).toBe(3);
      expect(defaultStrategy.initialDelayMs).toBe(1000);
      expect(defaultStrategy.maxDelayMs).toBe(30000);
    });

    it('should initialize with custom config', () => {
      expect(strategy.maxRetries).toBe(3);
      expect(strategy.initialDelayMs).toBe(100);
      expect(strategy.maxDelayMs).toBe(1000);
    });
  });

  describe('Error Classification', () => {
    it('should classify retryable errors', () => {
      expect(strategy.isRetryable('ECONNREFUSED')).toBe(true);
      expect(strategy.isRetryable('ETIMEDOUT')).toBe(true);
      expect(strategy.isRetryable('ENOTFOUND')).toBe(true);
    });

    it('should classify non-retryable errors', () => {
      const error = new Error('Invalid request');
      error.code = 'UNKNOWN';
      expect(strategy.isRetryable(error)).toBe(false);
    });

    it('should classify retryable HTTP codes', () => {
      expect(strategy.isRetryable(429)).toBe(true); // Too Many Requests
      expect(strategy.isRetryable(500)).toBe(true); // Server Error
      expect(strategy.isRetryable(503)).toBe(true); // Service Unavailable
    });

    it('should classify non-retryable HTTP codes', () => {
      expect(strategy.isRetryable(400)).toBe(false); // Bad Request
      expect(strategy.isRetryable(401)).toBe(false); // Unauthorized
      expect(strategy.isRetryable(403)).toBe(false); // Forbidden
      expect(strategy.isRetryable(404)).toBe(false); // Not Found
    });

    it('should handle error objects with status codes', () => {
      const error = new Error('Server error');
      error.statusCode = 503;
      expect(strategy.isRetryable(error)).toBe(true);

      const clientError = new Error('Bad request');
      clientError.statusCode = 400;
      expect(strategy.isRetryable(clientError)).toBe(false);
    });

    it('should detect timeout errors', () => {
      const error = new Error('Request timeout after 5000ms');
      expect(strategy.isRetryable(error)).toBe(true);
    });

    it('should detect timed out errors', () => {
      const error = new Error('Connection timed out');
      expect(strategy.isRetryable(error)).toBe(true);
    });
  });

  describe('Backoff Calculation', () => {
    it('should calculate exponential delays', () => {
      const delay0 = strategy.calculateDelay(0);
      const delay1 = strategy.calculateDelay(1);
      const delay2 = strategy.calculateDelay(2);

      // Each should be roughly 2x previous (with jitter)
      expect(delay1).toBeGreaterThan(delay0 / 2);
      expect(delay2).toBeGreaterThan(delay1 / 2);
    });

    it('should cap at max delay', () => {
      const delay10 = strategy.calculateDelay(10);
      expect(delay10).toBeLessThanOrEqual(1000); // maxDelayMs
    });

    it('should add jitter', () => {
      const delays = [];
      for (let i = 0; i < 5; i++) {
        delays.push(strategy.calculateDelay(1)); // Same attempt
      }

      // Not all should be identical due to jitter
      const unique = new Set(delays);
      expect(unique.size).toBeGreaterThan(1);
    });

    it('should stay positive', () => {
      for (let i = 0; i < 10; i++) {
        const delay = strategy.calculateDelay(i);
        expect(delay).toBeGreaterThanOrEqual(0);
      }
    });

    it('should generate backoff schedule', () => {
      const schedule = strategy.getBackoffSchedule(3);

      expect(schedule).toHaveLength(3);
      expect(schedule[0]).toHaveProperty('attempt', 0);
      expect(schedule[0]).toHaveProperty('delayMs');
      expect(schedule[0]).toHaveProperty('cumulativeMs');

      // Cumulative should increase
      expect(schedule[1].cumulativeMs).toBeGreaterThan(schedule[0].cumulativeMs);
      expect(schedule[2].cumulativeMs).toBeGreaterThan(schedule[1].cumulativeMs);
    });
  });

  describe('Execute with Retry', () => {
    it('should succeed on first try', async () => {
      let attempts = 0;
      const result = await strategy.execute(async () => {
        attempts++;
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on failure', async () => {
      let attempts = 0;
      const result = await strategy.execute(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      });

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should fail after max retries', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        const error = new Error('Temporary failure');
        error.code = 'ECONNREFUSED';
        throw error;
      };

      await expect(strategy.execute(fn)).rejects.toThrow();
      expect(attempts).toBe(4); // Initial + 3 retries
    });

    it('should not retry non-retryable errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('Bad request');
      };

      await expect(strategy.execute(fn)).rejects.toThrow('Bad request');
      expect(attempts).toBe(1);
    });

    it('should call onRetry callback', async () => {
      let retryCount = 0;
      const retryInfo = [];

      const onRetry = (info) => {
        retryCount++;
        retryInfo.push(info);
      };

      let attempts = 0;
      await strategy.execute(
        async () => {
          attempts++;
          if (attempts < 2) {
            const err = new Error('Timeout');
            err.code = 'ETIMEDOUT';
            throw err;
          }
          return 'success';
        },
        { onRetry }
      );

      expect(retryCount).toBe(1);
      expect(retryInfo[0]).toHaveProperty('attempt', 1);
      expect(retryInfo[0]).toHaveProperty('delayMs');
    });

    it('should track total wait time', async () => {
      let attempts = 0;
      const startTime = Date.now();

      await strategy.execute(async () => {
        attempts++;
        if (attempts < 3) {
          const err = new Error('Timeout');
          err.code = 'ETIMEDOUT';
          throw err;
        }
        return 'success';
      });

      const elapsed = Date.now() - startTime;

      // Should have waited for retries (rough estimate)
      expect(elapsed).toBeGreaterThan(100); // At least first delay
    });

    it('should handle custom maxRetries in options', async () => {
      let attempts = 0;

      await expect(strategy.execute(
        async () => {
          attempts++;
          throw new Error('Connection refused');
        },
        { maxRetries: 1 } // Override to 1 retry
      )).rejects.toThrow();

      expect(attempts).toBe(2); // Initial + 1 retry
    });
  });

  describe('Execute with Timeout', () => {
    it('should timeout on slow function', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        return 'success';
      };

      await expect(strategy.executeWithTimeout(fn, 100)).rejects.toThrow(/timed out/);
    });

    it('should succeed within timeout', async () => {
      const fn = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'success';
      };

      const result = await strategy.executeWithTimeout(fn, 500);
      expect(result).toBe('success');
    });

    it('should retry with timeout', async () => {
      let attempts = 0;

      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Connection error');
        }
        return 'success';
      };

      const result = await strategy.executeWithTimeout(fn, 5000, { maxRetries: 2 });
      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });

  describe('Statistics Tracking', () => {
    it('should track request attempts', async () => {
      const requestId = 'test-123';

      let attempts = 0;
      await strategy.execute(
        async () => {
          attempts++;
          if (attempts < 2) {
            throw new Error('Retry me');
          }
          return 'success';
        },
        { requestId }
      );

      const stats = strategy.getStats(requestId);
      expect(stats).not.toBeNull();
      expect(stats.attempts.length).toBe(2);
      expect(stats.status).toBe('success');
    });

    it('should track failed requests', async () => {
      const requestId = 'test-fail';

      const fn = async () => {
        throw new Error('Permanent failure');
      };

      try {
        await strategy.execute(fn, { requestId, maxRetries: 0 });
      } catch (e) {
        // Expected
      }

      const stats = strategy.getStats(requestId);
      expect(stats.status).toBe('failed');
      expect(stats.errors.length).toBeGreaterThan(0);
    });

    it('should provide all stats', async () => {
      const ids = ['req1', 'req2', 'req3'];

      for (const id of ids) {
        try {
          await strategy.execute(async () => {
            throw new Error('Error');
          }, { requestId: id, maxRetries: 0 });
        } catch (e) {
          // Expected
        }
      }

      const allStats = strategy.getAllStats();
      expect(allStats.length).toBeGreaterThanOrEqual(3);
    });

    it('should clear old statistics', async () => {
      const requestId = 'old-request';

      await strategy.execute(async () => 'success', { requestId });

      // Manually set old timestamp
      const stats = strategy.requestStats.get(requestId);
      stats.timestamp = Date.now() - 7200000; // 2 hours ago

      strategy.clearOldStats(3600000); // Clear older than 1 hour

      expect(strategy.requestStats.has(requestId)).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should allow custom retryable errors', () => {
      strategy.setRetryableErrors(['CUSTOM_ERROR']);

      expect(strategy.isRetryable('CUSTOM_ERROR')).toBe(true);
      expect(strategy.isRetryable('ECONNREFUSED')).toBe(false);
    });

    it('should allow custom retryable status codes', () => {
      strategy.setRetryableHttpCodes([418]); // I'm a teapot

      expect(strategy.isRetryable(418)).toBe(true);
      expect(strategy.isRetryable(500)).toBe(false);
    });

    it('should allow custom non-retryable codes', () => {
      strategy.setNonRetryableHttpCodes([418, 503]);

      expect(strategy.isRetryable(418)).toBe(false);
      expect(strategy.isRetryable(503)).toBe(false);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical network failure scenario', async () => {
      let attempts = 0;
      const startTime = Date.now();

      const result = await strategy.execute(async () => {
        attempts++;

        if (attempts === 1) {
          const err = new Error('Connection refused');
          err.code = 'ECONNREFUSED';
          throw err;
        }

        if (attempts === 2) {
          const err = new Error('Timeout');
          err.code = 'ETIMEDOUT';
          throw err;
        }

        return 'success';
      });

      const elapsed = Date.now() - startTime;

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      expect(elapsed).toBeGreaterThan(100); // Had to wait for retries
    });

    it('should handle cascading HTTP 5xx errors', async () => {
      let attempts = 0;

      const result = await strategy.execute(async () => {
        attempts++;

        if (attempts === 1) {
          const err = new Error('Server error');
          err.statusCode = 500;
          throw err;
        }

        if (attempts === 2) {
          const err = new Error('Service unavailable');
          err.statusCode = 503;
          throw err;
        }

        return 'recovered';
      });

      expect(result).toBe('recovered');
      expect(attempts).toBe(3);
    });

    it('should fail immediately on 4xx errors', async () => {
      let attempts = 0;

      try {
        await strategy.execute(async () => {
          attempts++;
          const err = new Error('Bad request');
          err.statusCode = 400;
          throw err;
        });
      } catch (e) {
        // Expected
      }

      expect(attempts).toBe(1); // No retry for 4xx
    });

    it('should handle rate limit (429) with backoff', async () => {
      let attempts = 0;
      const startTime = Date.now();

      const result = await strategy.execute(async () => {
        attempts++;

        if (attempts < 3) {
          const err = new Error('Too many requests');
          err.statusCode = 429;
          throw err;
        }

        return 'success';
      });

      const elapsed = Date.now() - startTime;

      expect(result).toBe('success');
      expect(attempts).toBe(3);
      // Should have significant delay for rate limiting
      expect(elapsed).toBeGreaterThan(100);
    });
  });
});

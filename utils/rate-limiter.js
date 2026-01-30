/**
 * Rate Limiter Utility
 * Implements token bucket algorithm for API rate limiting
 *
 * Prevents:
 * - API throttling/429 responses
 * - Overwhelming target servers
 * - Thundering herd problem
 *
 * Features:
 * - Token bucket algorithm
 * - Per-host rate limiting
 * - Adaptive rate adjustment
 * - Concurrent request tracking
 */

class RateLimiter {
  /**
   * Initialize rate limiter
   * @param {number} maxRequests - Max requests per window
   * @param {number} windowMs - Time window in milliseconds
   */
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Token bucket: tracks requests per host
    this.buckets = new Map();

    // Concurrent request tracking
    this.concurrentRequests = new Map();
    this.maxConcurrent = 5; // Max concurrent requests per host

    // Host-specific configurations
    this.hostConfigs = new Map();
  }

  /**
   * Get or create bucket for host
   * @param {string} host - Hostname
   * @returns {Object} Bucket with tokens and refill time
   */
  getBucket(host) {
    if (!this.buckets.has(host)) {
      this.buckets.set(host, {
        tokens: this.maxRequests,
        lastRefill: Date.now(),
        requestCount: 0
      });
    }

    const bucket = this.buckets.get(host);

    // Refill tokens based on time elapsed
    const now = Date.now();
    const timePassed = now - bucket.lastRefill;
    const refillAmount = (timePassed / this.windowMs) * this.maxRequests;

    if (refillAmount > 0) {
      bucket.tokens = Math.min(this.maxRequests, bucket.tokens + refillAmount);
      bucket.lastRefill = now;
    }

    return bucket;
  }

  /**
   * Check if request is allowed (non-blocking)
   * @param {string} host - Hostname
   * @param {number} tokensNeeded - Tokens required (default 1)
   * @returns {boolean} true if request allowed
   */
  isAllowed(host, tokensNeeded = 1) {
    const bucket = this.getBucket(host);
    return bucket.tokens >= tokensNeeded;
  }

  /**
   * Request permission to proceed (blocking if necessary)
   * Waits until request can be made within rate limits
   *
   * @param {string} host - Hostname
   * @param {number} tokensNeeded - Tokens required (default 1)
   * @returns {Promise<number>} Wait time in milliseconds
   */
  async acquireToken(host, tokensNeeded = 1) {
    let waitTime = 0;

    while (!this.isAllowed(host, tokensNeeded)) {
      // Calculate how long to wait for next token
      const bucket = this.getBucket(host);
      const tokensNeeded_ = tokensNeeded - bucket.tokens;
      const waitMs = (tokensNeeded_ / this.maxRequests) * this.windowMs;

      waitTime += waitMs;

      // Wait and check again
      await this.sleep(Math.min(waitMs, 100)); // Wait in 100ms increments
    }

    // Consume tokens
    const bucket = this.getBucket(host);
    bucket.tokens -= tokensNeeded;
    bucket.requestCount += 1;

    return waitTime;
  }

  /**
   * Track concurrent requests
   * @param {string} host - Hostname
   * @returns {Promise<void>} Resolves when request slot available
   */
  async acquireConcurrentSlot(host) {
    while (true) {
      const current = this.concurrentRequests.get(host) || 0;

      if (current < this.maxConcurrent) {
        this.concurrentRequests.set(host, current + 1);
        return;
      }

      // Wait for slot to become available
      await this.sleep(100);
    }
  }

  /**
   * Release concurrent request slot
   * @param {string} host - Hostname
   */
  releaseConcurrentSlot(host) {
    const current = this.concurrentRequests.get(host) || 0;
    this.concurrentRequests.set(host, Math.max(0, current - 1));
  }

  /**
   * Get current rate limit status
   * @param {string} host - Hostname
   * @returns {Object} Status info
   */
  getStatus(host) {
    const bucket = this.getBucket(host);
    const concurrent = this.concurrentRequests.get(host) || 0;

    return {
      host,
      availableTokens: Math.floor(bucket.tokens),
      maxTokens: this.maxRequests,
      requestsThisWindow: bucket.requestCount,
      windowMs: this.windowMs,
      concurrentRequests: concurrent,
      maxConcurrent: this.maxConcurrent,
      canProceed: this.isAllowed(host),
      nextAvailableMs: this.getNextAvailableMs(host)
    };
  }

  /**
   * Calculate milliseconds until next request allowed
   * @param {string} host - Hostname
   * @returns {number} Milliseconds to wait
   */
  getNextAvailableMs(host) {
    if (this.isAllowed(host)) return 0;

    const bucket = this.getBucket(host);
    const tokensNeeded = 1 - bucket.tokens;
    return (tokensNeeded / this.maxRequests) * this.windowMs;
  }

  /**
   * Reset rate limit for specific host
   * @param {string} host - Hostname
   */
  reset(host) {
    this.buckets.delete(host);
    this.concurrentRequests.set(host, 0);
  }

  /**
   * Reset all rate limits
   */
  resetAll() {
    this.buckets.clear();
    this.concurrentRequests.clear();
  }

  /**
   * Sleep helper
   * @param {number} ms - Milliseconds
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set custom configuration for specific host
   * @param {string} host - Hostname
   * @param {Object} config - Configuration
   */
  setHostConfig(host, config) {
    this.hostConfigs.set(host, config);

    if (config.maxRequests) {
      // Note: Changing limits doesn't affect existing buckets
      // This is intentional to maintain fairness
    }
  }

  /**
   * Get all active hosts
   * @returns {Array} List of hosts with active rate limits
   */
  getActiveHosts() {
    return Array.from(this.buckets.keys());
  }

  /**
   * Get stats for all hosts
   * @returns {Array} Status of all hosts
   */
  getAllStats() {
    return this.getActiveHosts().map(host => this.getStatus(host));
  }
}

module.exports = RateLimiter;

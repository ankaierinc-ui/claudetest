/**
 * Retry Strategy Utility
 * Implements exponential backoff with jitter for resilient API calls
 *
 * Prevents:
 * - Cascading failures
 * - Thundering herd problem
 * - Excessive request retries
 *
 * Features:
 * - Exponential backoff (2^attempt)
 * - Random jitter (±10%)
 * - Configurable max retries and delays
 * - Categorized error handling
 * - Request tracking and metrics
 */

class RetryStrategy {
  /**
   * Initialize retry strategy
   * @param {Object} config - Configuration
   */
  constructor(config = {}) {
    // Retry configuration
    this.maxRetries = config.maxRetries || 3;
    this.initialDelayMs = config.initialDelayMs || 1000; // 1 second
    this.maxDelayMs = config.maxDelayMs || 30000; // 30 seconds
    this.jitterFactor = config.jitterFactor || 0.1; // 10% jitter

    // Error categorization
    this.retryableErrors = config.retryableErrors || [
      'ECONNREFUSED',
      'ECONNRESET',
      'EHOSTUNREACH',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ERR_HTTP2_RST_STREAM'
    ];

    this.retryableHttpCodes = config.retryableHttpCodes || [
      408, // Request Timeout
      429, // Too Many Requests
      500, // Internal Server Error
      502, // Bad Gateway
      503, // Service Unavailable
      504  // Gateway Timeout
    ];

    // Non-retryable status codes (fail immediately)
    this.nonRetryableHttpCodes = new Set([
      400, // Bad Request
      401, // Unauthorized
      403, // Forbidden
      404, // Not Found
      405, // Method Not Allowed
      406  // Not Acceptable
    ]);

    // Request tracking
    this.requestStats = new Map();
  }

  /**
   * Determine if error is retryable
   * @param {Error|number|string} error - Error, HTTP status code, or error string
   * @returns {boolean} true if should retry
   */
  isRetryable(error) {
    // HTTP status codes (number)
    if (typeof error === 'number') {
      if (this.nonRetryableHttpCodes.has(error)) return false;
      return this.retryableHttpCodes.includes(error);
    }

    // String error codes (e.g., 'ECONNREFUSED')
    if (typeof error === 'string') {
      return this.retryableErrors.includes(error);
    }

    // Error objects
    if (error instanceof Error) {
      // Check error code
      if (error.code && this.retryableErrors.includes(error.code)) {
        return true;
      }

      // Check error message for known codes
      if (this.retryableErrors.some(re => error.message.includes(re))) {
        return true;
      }

      // Check HTTP status codes in error
      if (error.statusCode) {
        return this.isRetryable(error.statusCode);
      }

      // Timeout errors
      if (error.message.includes('timeout') || error.message.includes('timed out')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * Formula: min(maxDelay, initialDelay * 2^attempt + random_jitter)
   *
   * @param {number} attempt - Retry attempt number (0-based)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    // Base delay with exponential backoff
    const exponentialDelay = this.initialDelayMs * Math.pow(2, attempt);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);

    // Add random jitter (±jitterFactor %)
    const jitterAmount = cappedDelay * this.jitterFactor;
    const jitter = (Math.random() - 0.5) * 2 * jitterAmount;

    const finalDelay = Math.max(0, cappedDelay + jitter);

    return Math.ceil(finalDelay);
  }

  /**
   * Execute function with automatic retry
   * @param {Function} fn - Async function to execute
   * @param {Object} options - Execution options
   * @returns {Promise} Result of function
   */
  async execute(fn, options = {}) {
    const requestId = options.requestId || this.generateRequestId();
    const maxRetries = options.maxRetries || this.maxRetries;
    const onRetry = options.onRetry || (() => {});

    let lastError;
    let totalWaitTime = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Track attempt
        this.recordAttempt(requestId, attempt, 'executing');

        // Execute function
        const result = await fn();

        // Success
        this.recordAttempt(requestId, attempt, 'success', totalWaitTime);
        return result;

      } catch (error) {
        lastError = error;

        // Check if retryable
        if (attempt < maxRetries && this.isRetryable(error)) {
          // Calculate wait time
          const delayMs = this.calculateDelay(attempt);
          totalWaitTime += delayMs;

          // Invoke retry callback
          await onRetry({
            attempt: attempt + 1,
            maxRetries,
            delayMs,
            totalWaitTime,
            error,
            requestId
          });

          // Wait before retry
          await this.sleep(delayMs);

        } else {
          // Non-retryable error or max retries exceeded
          this.recordAttempt(requestId, attempt, 'failed', totalWaitTime, error);
          throw error;
        }
      }
    }

    // Max retries exceeded
    this.recordAttempt(requestId, maxRetries, 'failed', totalWaitTime, lastError);
    throw lastError;
  }

  /**
   * Execute with timeout
   * @param {Function} fn - Async function
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {Object} options - Execution options
   * @returns {Promise} Result with timeout
   */
  async executeWithTimeout(fn, timeoutMs, options = {}) {
    return Promise.race([
      this.execute(fn, options),
      this.sleep(timeoutMs).then(() => {
        throw new Error(`Operation timed out after ${timeoutMs}ms`);
      })
    ]);
  }

  /**
   * Get retry backoff schedule
   * Shows what delays would be for attempts 0 to N
   *
   * @param {number} attempts - Number of attempts to show
   * @returns {Array} Array of {attempt, delayMs, cumulativeMs}
   */
  getBackoffSchedule(attempts = 5) {
    const schedule = [];
    let cumulative = 0;

    for (let i = 0; i < attempts; i++) {
      const delayMs = this.calculateDelay(i);
      cumulative += delayMs;

      schedule.push({
        attempt: i,
        delayMs,
        cumulativeMs: cumulative
      });
    }

    return schedule;
  }

  /**
   * Get statistics for request
   * @param {string} requestId - Request ID
   * @returns {Object} Request statistics
   */
  getStats(requestId) {
    if (!this.requestStats.has(requestId)) {
      return null;
    }

    const stats = this.requestStats.get(requestId);
    return {
      requestId,
      attempts: stats.attempts,
      status: stats.status,
      totalWaitTimeMs: stats.totalWaitTime || 0,
      errors: stats.errors || []
    };
  }

  /**
   * Get all request statistics
   * @returns {Array} Statistics for all tracked requests
   */
  getAllStats() {
    const stats = [];
    for (const [requestId, data] of this.requestStats.entries()) {
      stats.push({
        requestId,
        attempts: data.attempts,
        status: data.status,
        totalWaitTimeMs: data.totalWaitTime || 0,
        errorCount: (data.errors || []).length
      });
    }
    return stats;
  }

  /**
   * Clear old statistics to prevent memory leaks
   * @param {number} olderThanMs - Clear requests older than this
   */
  clearOldStats(olderThanMs = 3600000) { // 1 hour default
    const now = Date.now();
    for (const [requestId, data] of this.requestStats.entries()) {
      if (now - data.timestamp > olderThanMs) {
        this.requestStats.delete(requestId);
      }
    }
  }

  /**
   * Record attempt for tracking
   * @private
   */
  recordAttempt(requestId, attempt, status, totalWaitTime = 0, error = null) {
    if (!this.requestStats.has(requestId)) {
      this.requestStats.set(requestId, {
        attempts: [],
        status: 'pending',
        timestamp: Date.now(),
        errors: []
      });
    }

    const stats = this.requestStats.get(requestId);
    stats.attempts.push({ attempt, status, timestamp: Date.now() });
    stats.status = status;
    stats.totalWaitTime = totalWaitTime;

    if (error) {
      stats.errors.push({
        attempt,
        message: error.message,
        code: error.code,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Generate unique request ID
   * @private
   */
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Sleep helper
   * @private
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Set custom retryable errors
   * @param {Array} errorCodes - Error codes to retry on
   */
  setRetryableErrors(errorCodes) {
    this.retryableErrors = errorCodes;
  }

  /**
   * Set custom retryable HTTP codes
   * @param {Array} statusCodes - Status codes to retry on
   */
  setRetryableHttpCodes(statusCodes) {
    this.retryableHttpCodes = statusCodes;
  }

  /**
   * Set non-retryable HTTP codes
   * @param {Array} statusCodes - Status codes to fail immediately on
   */
  setNonRetryableHttpCodes(statusCodes) {
    this.nonRetryableHttpCodes = new Set(statusCodes);
  }
}

module.exports = RetryStrategy;

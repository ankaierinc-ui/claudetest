/**
 * PII Encryption Utility
 * Encrypts sensitive personally identifiable information (email, phone)
 * Uses AES-256-GCM (Galois/Counter Mode) for authenticated encryption
 *
 * Security measures:
 * - AES-256-GCM encryption (256-bit key, authenticated)
 * - Built-in authentication tag (no separate HMAC needed)
 * - Random 96-bit IV for each encryption
 * - Key derivation with PBKDF2 (100,000 iterations)
 * - Masking functions for safe display
 */

const crypto = require('crypto');

class PIIEncryption {
  /**
   * Initialize encryption with master key
   * @param {string} masterKey - Encryption key (should be 32+ characters)
   * @param {string} salt - Salt for key derivation (should be 16+ characters)
   */
  constructor(masterKey, salt) {
    if (!masterKey || masterKey.length < 32) {
      throw new Error('Master key must be at least 32 characters');
    }
    if (!salt || salt.length < 16) {
      throw new Error('Salt must be at least 16 characters');
    }

    this.masterKey = masterKey;
    this.salt = salt;

    // Derive encryption key using PBKDF2
    this.encryptionKey = crypto.pbkdf2Sync(
      this.masterKey,
      this.salt,
      100000, // iterations
      32,     // 256-bit key
      'sha256'
    );
  }

  /**
   * Encrypt a value (email or phone)
   * Returns base64 encoded: IV || ciphertext || authTag
   * Uses AES-256-GCM for authenticated encryption
   *
   * @param {string} value - Value to encrypt
   * @returns {string} Encrypted value (base64)
   */
  encrypt(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('Value must be a non-empty string');
    }

    try {
      // Generate random IV (96-bit for GCM is recommended)
      const iv = crypto.randomBytes(12);

      // Create cipher (GCM mode provides authenticated encryption)
      const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

      // Encrypt
      let encrypted = cipher.update(value, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag (always available with GCM)
      const authTag = cipher.getAuthTag();

      // Combine: IV || ciphertext || authTag
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'hex'), authTag]);

      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a value
   * Expects base64 encoded: IV || ciphertext || authTag
   * Uses AES-256-GCM for authenticated decryption
   *
   * @param {string} encryptedValue - Encrypted value (base64)
   * @returns {string} Decrypted value
   */
  decrypt(encryptedValue) {
    if (!encryptedValue || typeof encryptedValue !== 'string') {
      throw new Error('Encrypted value must be a non-empty string');
    }

    try {
      // Decode from base64
      const combined = Buffer.from(encryptedValue, 'base64');

      // Extract parts: first 12 bytes = IV, last 16 bytes = authTag, middle = ciphertext
      const iv = combined.slice(0, 12);
      const authTag = combined.slice(-16);
      const encrypted = combined.slice(12, -16).toString('hex');

      // Create decipher (GCM mode)
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);

      // Set authentication tag for verification
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Create a hash of the original value (for verification without decryption)
   * Uses HMAC-SHA256
   *
   * @param {string} value - Value to hash
   * @returns {string} Hex-encoded hash
   */
  hash(value) {
    if (!value || typeof value !== 'string') {
      throw new Error('Value must be a non-empty string');
    }

    return crypto
      .createHmac('sha256', this.encryptionKey)
      .update(value.toLowerCase()) // Case-insensitive for emails
      .digest('hex');
  }

  /**
   * Verify a value against a hash (for deduplication)
   * @param {string} value - Original value
   * @param {string} hash - Hash to verify against
   * @returns {boolean} true if hash matches
   */
  verifyHash(value, hash) {
    return this.hash(value) === hash;
  }

  /**
   * Mask an email for display (show only domain)
   * Example: user@example.com -> ****@example.com
   *
   * @param {string} email - Email to mask
   * @returns {string} Masked email
   */
  maskEmail(email) {
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return '[invalid-email]';
    }

    const [local, domain] = email.split('@');
    if (!local || !domain) return '[invalid-email]';

    // Show first and last char of local part, mask the rest
    const maskedLocal = local.length > 2
      ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
      : '*'.repeat(Math.max(1, local.length));

    return `${maskedLocal}@${domain}`;
  }

  /**
   * Mask a phone number for display
   * Example: (555) 123-4567 -> (555) ***-4567
   *
   * @param {string} phone - Phone to mask
   * @returns {string} Masked phone
   */
  maskPhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return '[invalid-phone]';
    }

    // Extract only digits
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      return '[invalid-phone]';
    }

    // Show first 3 and last 4 digits, mask the middle
    const firstThree = digits.slice(0, 3);
    const lastFour = digits.slice(-4);
    const masked = `(${firstThree}) ***-${lastFour}`;

    return masked;
  }

  /**
   * Encrypt contact data object
   * Encrypts sensitive fields while preserving structure
   *
   * @param {Object} contact - Contact object with email/phone fields
   * @returns {Object} Contact with encrypted sensitive fields
   */
  encryptContact(contact) {
    if (!contact || typeof contact !== 'object') {
      throw new Error('Contact must be a valid object');
    }

    const encrypted = { ...contact };

    // Encrypt email if present
    if (contact.email) {
      encrypted.email_encrypted = this.encrypt(contact.email);
      encrypted.email_hash = this.hash(contact.email);
      encrypted.email_masked = this.maskEmail(contact.email);
      // Remove plaintext email
      delete encrypted.email;
    }

    // Encrypt phone if present
    if (contact.phone) {
      encrypted.phone_encrypted = this.encrypt(contact.phone);
      encrypted.phone_hash = this.hash(contact.phone);
      encrypted.phone_masked = this.maskPhone(contact.phone);
      // Remove plaintext phone
      delete encrypted.phone;
    }

    return encrypted;
  }

  /**
   * Decrypt contact data object
   * Decrypts encrypted fields back to plaintext
   *
   * @param {Object} contact - Encrypted contact object
   * @returns {Object} Contact with decrypted fields
   */
  decryptContact(contact) {
    if (!contact || typeof contact !== 'object') {
      throw new Error('Contact must be a valid object');
    }

    const decrypted = { ...contact };

    // Decrypt email if present
    if (contact.email_encrypted) {
      decrypted.email = this.decrypt(contact.email_encrypted);
      // Remove encrypted variants
      delete decrypted.email_encrypted;
      delete decrypted.email_hash;
      delete decrypted.email_masked;
    }

    // Decrypt phone if present
    if (contact.phone_encrypted) {
      decrypted.phone = this.decrypt(contact.phone_encrypted);
      // Remove encrypted variants
      delete decrypted.phone_encrypted;
      delete decrypted.phone_hash;
      delete decrypted.phone_masked;
    }

    return decrypted;
  }

  /**
   * Batch encrypt multiple contacts
   * @param {Array} contacts - Array of contact objects
   * @returns {Array} Array of encrypted contacts
   */
  encryptBatch(contacts) {
    if (!Array.isArray(contacts)) {
      throw new Error('Contacts must be an array');
    }

    return contacts.map(contact => {
      try {
        return this.encryptContact(contact);
      } catch (error) {
        console.error(`Failed to encrypt contact: ${error.message}`);
        return contact; // Return unencrypted on error
      }
    });
  }

  /**
   * Batch decrypt multiple contacts
   * @param {Array} contacts - Array of encrypted contact objects
   * @returns {Array} Array of decrypted contacts
   */
  decryptBatch(contacts) {
    if (!Array.isArray(contacts)) {
      throw new Error('Contacts must be an array');
    }

    return contacts.map(contact => {
      try {
        return this.decryptContact(contact);
      } catch (error) {
        console.error(`Failed to decrypt contact: ${error.message}`);
        return contact; // Return as-is on error
      }
    });
  }

  /**
   * Generate a secure encryption key and salt
   * Use this once to generate values for .env
   *
   * @returns {Object} {key: base64, salt: base64}
   */
  static generateKeyAndSalt() {
    return {
      key: crypto.randomBytes(32).toString('base64'),
      salt: crypto.randomBytes(16).toString('base64')
    };
  }
}

module.exports = PIIEncryption;

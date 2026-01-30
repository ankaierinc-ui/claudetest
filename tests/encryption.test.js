/**
 * PII Encryption Tests
 * Tests for AES-256-CBC encryption, hashing, and masking
 */

const PIIEncryption = require('../utils/encryption');

describe('PIIEncryption', () => {
  let encryption;

  const validKey = 'a'.repeat(64); // 64 char key (base64 will be 32 bytes)
  const validSalt = 'b'.repeat(32); // 32 char salt

  beforeEach(() => {
    encryption = new PIIEncryption(validKey, validSalt);
  });

  describe('Constructor Validation', () => {
    it('should initialize with valid key and salt', () => {
      expect(() => new PIIEncryption(validKey, validSalt)).not.toThrow();
    });

    it('should reject key shorter than 32 chars', () => {
      expect(() => new PIIEncryption('short_key', validSalt)).toThrow(/Master key must be at least 32 characters/);
    });

    it('should reject salt shorter than 16 chars', () => {
      expect(() => new PIIEncryption(validKey, 'short')).toThrow(/Salt must be at least 16 characters/);
    });

    it('should reject null key', () => {
      expect(() => new PIIEncryption(null, validSalt)).toThrow(/Master key must be at least 32 characters/);
    });
  });

  describe('Email Encryption/Decryption', () => {
    it('should encrypt and decrypt email', () => {
      const email = 'user@example.com';
      const encrypted = encryption.encrypt(email);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(email);
      expect(encrypted).not.toBe(email);
      expect(encrypted).toBeTruthy();
    });

    it('should produce different ciphertext for same email (random IV)', () => {
      const email = 'user@example.com';
      const encrypted1 = encryption.encrypt(email);
      const encrypted2 = encryption.encrypt(email);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
      expect(encryption.decrypt(encrypted1)).toBe(email);
      expect(encryption.decrypt(encrypted2)).toBe(email);
    });

    it('should handle email with special characters', () => {
      const email = 'user+tag@sub.example.co.uk';
      const encrypted = encryption.encrypt(email);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(email);
    });

    it('should reject empty email', () => {
      expect(() => encryption.encrypt('')).toThrow();
      expect(() => encryption.encrypt(null)).toThrow();
      expect(() => encryption.encrypt(undefined)).toThrow();
    });

    it('should reject non-string input', () => {
      expect(() => encryption.encrypt(123)).toThrow();
      expect(() => encryption.encrypt({})).toThrow();
    });
  });

  describe('Phone Encryption/Decryption', () => {
    it('should encrypt and decrypt phone number', () => {
      const phone = '(555) 123-4567';
      const encrypted = encryption.encrypt(phone);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(phone);
    });

    it('should handle various phone formats', () => {
      const phones = [
        '+1 555-123-4567',
        '555.123.4567',
        '5551234567',
        '+44 20 7946 0958'
      ];

      phones.forEach(phone => {
        const encrypted = encryption.encrypt(phone);
        const decrypted = encryption.decrypt(encrypted);
        expect(decrypted).toBe(phone);
      });
    });

    it('should reject invalid phone input', () => {
      expect(() => encryption.encrypt('')).toThrow();
      expect(() => encryption.decrypt('invalid_base64!')).toThrow();
    });
  });

  describe('Email Hashing', () => {
    it('should produce consistent hash for same email', () => {
      const email = 'user@example.com';
      const hash1 = encryption.hash(email);
      const hash2 = encryption.hash(email);

      expect(hash1).toBe(hash2);
    });

    it('should be case-insensitive for emails', () => {
      const hash1 = encryption.hash('User@Example.com');
      const hash2 = encryption.hash('user@example.com');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash for different emails', () => {
      const hash1 = encryption.hash('user1@example.com');
      const hash2 = encryption.hash('user2@example.com');

      expect(hash1).not.toBe(hash2);
    });

    it('should produce hex string hash', () => {
      const hash = encryption.hash('user@example.com');

      expect(hash).toMatch(/^[a-f0-9]{64}$/); // SHA256 = 64 hex chars
    });

    it('should reject invalid input for hash', () => {
      expect(() => encryption.hash(null)).toThrow();
      expect(() => encryption.hash('')).toThrow();
    });
  });

  describe('Hash Verification', () => {
    it('should verify correct hash', () => {
      const email = 'user@example.com';
      const hash = encryption.hash(email);

      expect(encryption.verifyHash(email, hash)).toBe(true);
    });

    it('should reject incorrect hash', () => {
      const email = 'user@example.com';
      const wrongHash = encryption.hash('different@example.com');

      expect(encryption.verifyHash(email, wrongHash)).toBe(false);
    });

    it('should verify case-insensitive', () => {
      const hash = encryption.hash('user@example.com');

      expect(encryption.verifyHash('USER@EXAMPLE.COM', hash)).toBe(true);
    });
  });

  describe('Email Masking', () => {
    it('should mask standard email', () => {
      const email = 'john.doe@example.com';
      const masked = encryption.maskEmail(email);

      expect(masked).toContain('@example.com');
      expect(masked).toContain('*');
      expect(masked).not.toContain('john.doe');
      expect(masked).toMatch(/^..*@example\.com$/);
    });

    it('should show first and last char of local part', () => {
      const email = 'abcde@example.com';
      const masked = encryption.maskEmail(email);

      expect(masked).toMatch(/^a\*+e@example\.com$/);
    });

    it('should handle short email addresses', () => {
      const email = 'ab@example.com';
      const masked = encryption.maskEmail(email);

      expect(masked).toContain('*');
      expect(masked).toContain('@example.com');
    });

    it('should handle single char local part', () => {
      const email = 'a@example.com';
      const masked = encryption.maskEmail(email);

      expect(masked).toContain('*');
      expect(masked).toContain('@example.com');
    });

    it('should handle invalid email gracefully', () => {
      expect(encryption.maskEmail('')).toBe('[invalid-email]');
      expect(encryption.maskEmail(null)).toBe('[invalid-email]');
      expect(encryption.maskEmail('notanemail')).toBe('[invalid-email]');
      expect(encryption.maskEmail(123)).toBe('[invalid-email]');
    });
  });

  describe('Phone Masking', () => {
    it('should mask phone number preserving first 3 and last 4', () => {
      const phone = '(555) 123-4567';
      const masked = encryption.maskPhone(phone);

      expect(masked).toContain('555');
      expect(masked).toContain('4567');
      expect(masked).toContain('***');
      expect(masked).toMatch(/\(\d{3}\) \*\*\*-\d{4}/);
    });

    it('should handle phone with different formats', () => {
      const phones = [
        '5551234567',
        '+1 555-123-4567',
        '555.123.4567',
        '+44-20-7946-0958'
      ];

      phones.forEach(phone => {
        const masked = encryption.maskPhone(phone);
        expect(masked).toMatch(/\(\d{3}\) \*\*\*-\d{4}/);
      });
    });

    it('should handle invalid phone gracefully', () => {
      expect(encryption.maskPhone('')).toBe('[invalid-phone]');
      expect(encryption.maskPhone(null)).toBe('[invalid-phone]');
      expect(encryption.maskPhone('123')).toBe('[invalid-phone]');
      expect(encryption.maskPhone(123)).toBe('[invalid-phone]');
    });
  });

  describe('Contact Object Encryption', () => {
    it('should encrypt contact with email and phone', () => {
      const contact = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567'
      };

      const encrypted = encryption.encryptContact(contact);

      expect(encrypted).toHaveProperty('name', 'John Doe');
      expect(encrypted).toHaveProperty('email_encrypted');
      expect(encrypted).toHaveProperty('email_hash');
      expect(encrypted).toHaveProperty('email_masked');
      expect(encrypted).toHaveProperty('phone_encrypted');
      expect(encrypted).toHaveProperty('phone_hash');
      expect(encrypted).toHaveProperty('phone_masked');
      expect(encrypted).not.toHaveProperty('email');
      expect(encrypted).not.toHaveProperty('phone');
    });

    it('should preserve non-PII fields', () => {
      const contact = {
        name: 'John Doe',
        company: 'Acme Corp',
        url: 'https://example.com',
        email: 'john@example.com'
      };

      const encrypted = encryption.encryptContact(contact);

      expect(encrypted.name).toBe('John Doe');
      expect(encrypted.company).toBe('Acme Corp');
      expect(encrypted.url).toBe('https://example.com');
    });

    it('should handle contact with only email', () => {
      const contact = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const encrypted = encryption.encryptContact(contact);

      expect(encrypted).toHaveProperty('email_encrypted');
      expect(encrypted).not.toHaveProperty('phone_encrypted');
    });

    it('should handle contact with only phone', () => {
      const contact = {
        name: 'John Doe',
        phone: '(555) 123-4567'
      };

      const encrypted = encryption.encryptContact(contact);

      expect(encrypted).toHaveProperty('phone_encrypted');
      expect(encrypted).not.toHaveProperty('email_encrypted');
    });

    it('should reject invalid contact object', () => {
      expect(() => encryption.encryptContact(null)).toThrow();
      expect(() => encryption.encryptContact('not an object')).toThrow();
    });
  });

  describe('Contact Object Decryption', () => {
    it('should decrypt encrypted contact', () => {
      const original = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567'
      };

      const encrypted = encryption.encryptContact(original);
      const decrypted = encryption.decryptContact(encrypted);

      expect(decrypted.name).toBe('John Doe');
      expect(decrypted.email).toBe('john@example.com');
      expect(decrypted.phone).toBe('(555) 123-4567');
    });

    it('should remove encrypted variants after decryption', () => {
      const contact = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567'
      };

      const encrypted = encryption.encryptContact(contact);
      const decrypted = encryption.decryptContact(encrypted);

      expect(decrypted).not.toHaveProperty('email_encrypted');
      expect(decrypted).not.toHaveProperty('email_hash');
      expect(decrypted).not.toHaveProperty('email_masked');
      expect(decrypted).not.toHaveProperty('phone_encrypted');
      expect(decrypted).not.toHaveProperty('phone_hash');
      expect(decrypted).not.toHaveProperty('phone_masked');
    });

    it('should handle partial decryption', () => {
      const encrypted = {
        name: 'John Doe',
        email_encrypted: encryption.encrypt('john@example.com'),
        phone: '(555) 123-4567' // Not encrypted
      };

      const decrypted = encryption.decryptContact(encrypted);

      expect(decrypted.email).toBe('john@example.com');
      expect(decrypted.phone).toBe('(555) 123-4567');
    });
  });

  describe('Batch Encryption', () => {
    it('should encrypt multiple contacts', () => {
      const contacts = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' },
        { name: 'Bob', phone: '(555) 123-4567' }
      ];

      const encrypted = encryption.encryptBatch(contacts);

      expect(encrypted).toHaveLength(3);
      expect(encrypted[0]).toHaveProperty('email_encrypted');
      expect(encrypted[2]).toHaveProperty('phone_encrypted');
    });

    it('should handle batch with errors gracefully', () => {
      const contacts = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' }
      ];

      const encrypted = encryption.encryptBatch(contacts);

      expect(encrypted).toHaveLength(2);
      expect(encrypted.every(c => c !== null)).toBe(true);
    });

    it('should reject non-array input', () => {
      expect(() => encryption.encryptBatch(null)).toThrow();
      expect(() => encryption.encryptBatch('not an array')).toThrow();
      expect(() => encryption.encryptBatch({})).toThrow();
    });
  });

  describe('Batch Decryption', () => {
    it('should decrypt multiple contacts', () => {
      const original = [
        { name: 'John', email: 'john@example.com' },
        { name: 'Jane', email: 'jane@example.com' }
      ];

      const encrypted = encryption.encryptBatch(original);
      const decrypted = encryption.decryptBatch(encrypted);

      expect(decrypted).toHaveLength(2);
      expect(decrypted[0].email).toBe('john@example.com');
      expect(decrypted[1].email).toBe('jane@example.com');
    });

    it('should reject non-array input', () => {
      expect(() => encryption.decryptBatch(null)).toThrow();
      expect(() => encryption.decryptBatch('not an array')).toThrow();
    });
  });

  describe('Round-trip Encryption', () => {
    it('should maintain data integrity through encrypt-decrypt cycle', () => {
      const testEmails = [
        'user@example.com',
        'john.doe+tag@sub.example.co.uk',
        'a@b.c',
        'test123@test-domain.org'
      ];

      testEmails.forEach(email => {
        const encrypted = encryption.encrypt(email);
        const decrypted = encryption.decrypt(encrypted);
        expect(decrypted).toBe(email);
      });
    });

    it('should maintain contact integrity through full cycle', () => {
      const original = {
        id: 1,
        name: 'John Doe',
        company: 'Acme Corp',
        url: 'https://example.com',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        notes: 'Important contact'
      };

      const encrypted = encryption.encryptContact(original);
      const decrypted = encryption.decryptContact(encrypted);

      expect(decrypted.id).toBe(1);
      expect(decrypted.name).toBe('John Doe');
      expect(decrypted.company).toBe('Acme Corp');
      expect(decrypted.url).toBe('https://example.com');
      expect(decrypted.email).toBe('john@example.com');
      expect(decrypted.phone).toBe('(555) 123-4567');
      expect(decrypted.notes).toBe('Important contact');
    });
  });

  describe('Key Generation', () => {
    it('should generate secure key and salt', () => {
      const { key, salt } = PIIEncryption.generateKeyAndSalt();

      expect(key).toBeTruthy();
      expect(salt).toBeTruthy();
      expect(key).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
      expect(salt).toMatch(/^[A-Za-z0-9+/]+=*$/); // Base64 format
    });

    it('should generate unique keys on each call', () => {
      const call1 = PIIEncryption.generateKeyAndSalt();
      const call2 = PIIEncryption.generateKeyAndSalt();

      expect(call1.key).not.toBe(call2.key);
      expect(call1.salt).not.toBe(call2.salt);
    });

    it('should allow using generated key and salt', () => {
      const { key, salt } = PIIEncryption.generateKeyAndSalt();

      // Convert from base64 to usable format
      const keyStr = Buffer.from(key, 'base64').toString('hex');
      const saltStr = Buffer.from(salt, 'base64').toString('hex');

      expect(() => new PIIEncryption(keyStr, saltStr)).not.toThrow();
    });
  });

  describe('Security Properties', () => {
    it('should have different ciphertext for identical plaintext', () => {
      const email = 'user@example.com';
      const encrypted1 = encryption.encrypt(email);
      const encrypted2 = encryption.encrypt(email);

      expect(encrypted1).not.toBe(encrypted2);
      expect(encryption.decrypt(encrypted1)).toBe(email);
      expect(encryption.decrypt(encrypted2)).toBe(email);
    });

    it('should fail to decrypt with wrong key', () => {
      const email = 'user@example.com';
      const encrypted = encryption.encrypt(email);

      const wrongEncryption = new PIIEncryption('x'.repeat(64), 'y'.repeat(32));

      expect(() => wrongEncryption.decrypt(encrypted)).toThrow();
    });

    it('should handle long strings', () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      const encrypted = encryption.encrypt(longEmail);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(longEmail);
    });

    it('should handle special UTF-8 characters', () => {
      const specialText = 'user+émoji@example.com 🔐';
      const encrypted = encryption.encrypt(specialText);
      const decrypted = encryption.decrypt(encrypted);

      expect(decrypted).toBe(specialText);
    });
  });
});

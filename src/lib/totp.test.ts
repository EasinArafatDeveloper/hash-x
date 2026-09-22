import { describe, it, expect, beforeAll } from 'vitest';
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTokenForCounter,
  verifyTotpCode,
  generateBackupCodes,
  verifyBackupCode,
} from './totp';

beforeAll(() => {
  process.env.AUTH_SECRET = 'test-only-secret-for-vitest';
});

describe('base32Encode / base32Decode', () => {
  it('round-trips arbitrary byte buffers', () => {
    const original = Buffer.from('a sample 2FA secret payload', 'utf8');
    const encoded = base32Encode(original);
    const decoded = base32Decode(encoded);
    expect(decoded.equals(original)).toBe(true);
  });

  it('produces only uppercase RFC 4648 base32 alphabet characters', () => {
    const secret = generateTotpSecret(20);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
  });
});

describe('TOTP token generation and verification', () => {
  it('generates a deterministic 6-digit token for a fixed secret and counter', () => {
    const secret = 'JBSWY3DPEHPK3PXP'; // well-known test vector secret
    const token = generateTokenForCounter(secret, 1);
    expect(token).toMatch(/^\d{6}$/);
    // Same secret + same counter must always produce the same token.
    expect(generateTokenForCounter(secret, 1)).toBe(token);
  });

  it('accepts the current-window token', () => {
    const secret = generateTotpSecret();
    const counter = Math.floor(Date.now() / 1000 / 30);
    const token = generateTokenForCounter(secret, counter);
    expect(verifyTotpCode(secret, token)).toBe(true);
  });

  it('accepts a token from one step in the past (clock drift tolerance)', () => {
    const secret = generateTotpSecret();
    const counter = Math.floor(Date.now() / 1000 / 30) - 1;
    const token = generateTokenForCounter(secret, counter);
    expect(verifyTotpCode(secret, token)).toBe(true);
  });

  it('rejects a token far outside the drift window', () => {
    const secret = generateTotpSecret();
    const counter = Math.floor(Date.now() / 1000 / 30) - 10;
    const token = generateTokenForCounter(secret, counter);
    expect(verifyTotpCode(secret, token)).toBe(false);
  });

  it('rejects a malformed (non-6-digit) token', () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode(secret, '123')).toBe(false);
    expect(verifyTotpCode(secret, 'abcdef')).toBe(false);
  });

  it('rejects an empty secret or token', () => {
    expect(verifyTotpCode('', '123456')).toBe(false);
    expect(verifyTotpCode('JBSWY3DPEHPK3PXP', '')).toBe(false);
  });
});

describe('backup codes', () => {
  it('generates the requested count of unique codes', () => {
    const { plainCodes, hashedCodes } = generateBackupCodes(8);
    expect(plainCodes).toHaveLength(8);
    expect(hashedCodes).toHaveLength(8);
    expect(new Set(plainCodes).size).toBe(8);
    expect(new Set(hashedCodes).size).toBe(8);
  });

  it('verifies a freshly generated code and burns it on use', () => {
    const { plainCodes, hashedCodes } = generateBackupCodes(4);
    const codeToUse = plainCodes[1];

    const result = verifyBackupCode(codeToUse, hashedCodes);
    expect(result.isValid).toBe(true);
    expect(result.updatedHashedCodes).toHaveLength(3);

    // The same code must not verify again against the updated (post-burn) list.
    const second = verifyBackupCode(codeToUse, result.updatedHashedCodes);
    expect(second.isValid).toBe(false);
  });

  it('rejects a code that was never issued', () => {
    const { hashedCodes } = generateBackupCodes(4);
    const result = verifyBackupCode('ZZZZ-ZZZZ', hashedCodes);
    expect(result.isValid).toBe(false);
    expect(result.updatedHashedCodes).toEqual(hashedCodes);
  });

  it('is tolerant of casing and surrounding whitespace', () => {
    const { plainCodes, hashedCodes } = generateBackupCodes(2);
    const messy = `  ${plainCodes[0].toLowerCase()}  `;
    const result = verifyBackupCode(messy, hashedCodes);
    expect(result.isValid).toBe(true);
  });
});

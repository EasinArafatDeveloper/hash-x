import crypto from 'crypto';
import QRCode from 'qrcode';

// Base32 RFC 4648 alphabet
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a buffer to Base32 string (without padding)
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Decodes a Base32 string into a Buffer
 */
export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue; // Skip invalid chars

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generates a random Base32 secret for TOTP (160 bits = 20 bytes)
 */
export function generateTotpSecret(byteLength: number = 20): string {
  const randomBytes = crypto.randomBytes(byteLength);
  return base32Encode(randomBytes);
}

/**
 * Generates the standard TOTP URI for QR Code scanning
 * otpauth://totp/ISSUER:Account?secret=SECRET&issuer=ISSUER&algorithm=SHA1&digits=6&period=30
 */
export function generateOtpAuthUri(
  accountName: string,
  secret: string,
  issuer: string = 'MORPHEUS'
): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedAccount = encodeURIComponent(accountName);
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generates a high-quality Data URL (Base64 PNG) for the QR Code
 */
export async function generateQRCodeDataUrl(otpAuthUri: string): Promise<string> {
  return QRCode.toDataURL(otpAuthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 7,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

/**
 * Generates a 6-digit TOTP token for a specific 30-second time counter (RFC 6238 / RFC 4226)
 */
export function generateTokenForCounter(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter), 0);

  const hmac = crypto.createHmac('sha1', key);
  hmac.update(buffer);
  const digest = hmac.digest();

  // Dynamic truncation
  const offset = digest[digest.length - 1] & 0x0f;
  const code =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const token = (code % 1000000).toString().padStart(6, '0');
  return token;
}

/**
 * Verifies a 6-digit TOTP token against the current time with clock drift tolerance
 * @param secretBase32 The base32 secret key
 * @param token The 6-digit token entered by user
 * @param window The time step tolerance window (default = 1, checks -30s, 0s, +30s)
 */
export function verifyTotpCode(
  secretBase32: string,
  token: string,
  window: number = 1
): boolean {
  if (!secretBase32 || !token) return false;
  const cleanToken = token.trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const stepSeconds = 30;
  const currentCounter = Math.floor(Date.now() / 1000 / stepSeconds);

  for (let i = -window; i <= window; i++) {
    const generated = generateTokenForCounter(secretBase32, currentCounter + i);
    if (crypto.timingSafeEqual(Buffer.from(generated), Buffer.from(cleanToken))) {
      return true;
    }
  }

  return false;
}

/**
 * Generates 8 random single-use emergency backup recovery codes
 * e.g., 'A8B2-9F41'
 */
export function generateBackupCodes(count: number = 8): {
  plainCodes: string[];
  hashedCodes: string[];
} {
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const plain = `${part1}-${part2}`;
    plainCodes.push(plain);

    // Hash the backup code using SHA-256 for secure DB storage
    const hash = crypto.createHash('sha256').update(plain).digest('hex');
    hashedCodes.push(hash);
  }

  return { plainCodes, hashedCodes };
}

/**
 * Verifies and burns an emergency backup code
 */
export function verifyBackupCode(
  inputCode: string,
  hashedBackupCodes: string[]
): { isValid: boolean; updatedHashedCodes: string[] } {
  if (!inputCode || !hashedBackupCodes || hashedBackupCodes.length === 0) {
    return { isValid: false, updatedHashedCodes: hashedBackupCodes || [] };
  }

  const normalized = inputCode.trim().toUpperCase().replace(/\s+/g, '');
  const inputHash = crypto.createHash('sha256').update(normalized).digest('hex');

  const matchIdx = hashedBackupCodes.findIndex((storedHash) => storedHash === inputHash);

  if (matchIdx !== -1) {
    // Burn this backup code so it cannot be used again
    const remaining = [...hashedBackupCodes];
    remaining.splice(matchIdx, 1);
    return { isValid: true, updatedHashedCodes: remaining };
  }

  return { isValid: false, updatedHashedCodes: hashedBackupCodes };
}

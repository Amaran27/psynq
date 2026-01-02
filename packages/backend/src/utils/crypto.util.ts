import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

export class CryptoUtil {
  private static readonly MASTER_KEY =
    process.env.SETTINGS_ENCRYPTION_KEY || 'default-secret-key-32-chars-long!!';
  private static readonly ALGORITHM = 'aes-256-cbc';

  private static getKey(): Buffer {
    // Derive a 32-byte key from MASTER_KEY
    return scryptSync(this.MASTER_KEY, 'salt', 32);
  }

  static encrypt(value: unknown): string {
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);

    const iv = randomBytes(16);
    const key = this.getKey();
    const cipher = createCipheriv(this.ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(stringValue, 'utf8'),
      cipher.final(),
    ]);

    // Return iv:encrypted format
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  static decrypt(encryptedValue: string): unknown {
    const [ivHex, encryptedHex] = encryptedValue.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const key = this.getKey();

    const decipher = createDecipheriv(this.ALGORITHM, key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    const decryptedString = decrypted.toString('utf8');

    try {
      return JSON.parse(decryptedString) as unknown;
    } catch {
      return decryptedString;
    }
  }
}

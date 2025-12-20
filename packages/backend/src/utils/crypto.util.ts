import * as CryptoJS from 'crypto-js';

export class CryptoUtil {
  private static readonly MASTER_KEY = process.env.SETTINGS_ENCRYPTION_KEY || 'default-secret-key-32-chars-long!!';

  static encrypt(value: any): string {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return CryptoJS.AES.encrypt(stringValue, this.MASTER_KEY).toString();
  }

  static decrypt(encryptedValue: string): any {
    const bytes = CryptoJS.AES.decrypt(encryptedValue, this.MASTER_KEY);
    const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  }
}

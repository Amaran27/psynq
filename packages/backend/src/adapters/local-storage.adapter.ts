import { Injectable, Logger } from '@nestjs/common';
import { StoragePort } from '../ports/storage.port';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

@Injectable()
export class LocalStorageAdapter implements StoragePort {
  private readonly logger = new Logger(LocalStorageAdapter.name);
  private readonly storageRoot: string;

  constructor() {
    this.storageRoot = process.env.STORAGE_LOCAL_ROOT || path.join(process.cwd(), 'dist', 'uploads');
    if (!fs.existsSync(this.storageRoot)) {
      fs.mkdirSync(this.storageRoot, { recursive: true });
    }
  }

  async upload(orgId: string | null, key: string, stream: Readable, contentType: string, metadata?: Record<string, string>): Promise<void> {
    const filePath = path.join(this.storageRoot, key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const writeStream = fs.createWriteStream(filePath);
    return new Promise((resolve, reject) => {
        stream.pipe(writeStream)
            .on('finish', resolve)
            .on('error', reject);
    });
  }

  async getSignedUrl(orgId: string | null, key: string, expiresInSeconds: number, operation: 'GET' | 'PUT'): Promise<string> {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3000';
    return `${backendUrl}/uploads/${key}`;
  }

  async delete(orgId: string | null, key: string): Promise<void> {
    const filePath = path.join(this.storageRoot, key);
    if (fs.existsSync(filePath)) {
        await promisify(fs.unlink)(filePath);
    }
  }

  async list(orgId: string | null, prefix: string): Promise<string[]> {
    const fullPrefixPath = path.join(this.storageRoot, prefix);
    const results: string[] = [];
    
    if (!fs.existsSync(fullPrefixPath) || !fs.statSync(fullPrefixPath).isDirectory()) {
        return [];
    }

    const walk = (dir: string, baseDir: string) => {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filepath = path.join(dir, file);
            const stat = fs.statSync(filepath);
            if (stat.isDirectory()) {
                walk(filepath, baseDir);
            } else {
                results.push(path.relative(baseDir, filepath).replace(/\\/g, '/'));
            }
        }
    };
    
    walk(fullPrefixPath, this.storageRoot);
    return results.map(r => path.join(prefix, r).replace(/\\/g, '/'));
  }

  async healthCheck(orgId: string | null): Promise<boolean> {
    try {
        fs.accessSync(this.storageRoot, fs.constants.W_OK);
        return true;
    } catch (e) {
        return false;
    }
  }

  async applyLifecyclePolicy(orgId: string | null, prefix: string, olderThanDays: number): Promise<void> {
    const files = await this.list(orgId, prefix);
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    
    for (const file of files) {
        const filePath = path.join(this.storageRoot, file);
        const stat = fs.statSync(filePath);
        const ageInDays = (now - stat.mtimeMs) / msPerDay;
        
        if (ageInDays > olderThanDays) {
            fs.unlinkSync(filePath);
            this.logger.log(`Deleted old file: ${file}`);
        }
    }
  }
}
import { Readable } from 'stream';

export interface StoragePort {
  /**
   * Uploads a file to storage.
   * @param key - Unique key for the file (e.g., 'recordings/call-123.wav')
   * @param stream - Readable stream of the file content
   * @param contentType - MIME type of the file
   * @param metadata - Optional metadata
   */
  upload(key: string, stream: Readable, contentType: string, metadata?: Record<string, string>): Promise<void>;

  /**
   * Generates a signed URL for secure access to a file.
   * @param key - File key
   * @param expiresInSeconds - URL expiration time
   * @param operation - 'GET' for download, 'PUT' for upload
   */
  getSignedUrl(key: string, expiresInSeconds: number, operation: 'GET' | 'PUT'): Promise<string>;

  /**
   * Deletes a file from storage.
   * @param key - File key
   */
  delete(key: string): Promise<void>;

  /**
   * Lists files with a prefix.
   * @param prefix - Key prefix (e.g., 'recordings/')
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Checks if storage is healthy.
   */
  healthCheck(): Promise<boolean>;

  /**
   * Applies lifecycle policies (e.g., delete old files).
   * @param prefix - Prefix for files to manage
   * @param olderThanDays - Delete files older than this many days
   */
  applyLifecyclePolicy(prefix: string, olderThanDays: number): Promise<void>;
}
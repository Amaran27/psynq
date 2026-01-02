import { Readable } from 'stream';

export interface StoragePort {
  /**
   * Uploads a file to storage.
   * @param organizationId - Tenant ID for config resolution
   * @param key - Unique key for the file
   * @param stream - Readable stream of the file content
   * @param contentType - MIME type of the file
   * @param metadata - Optional metadata
   */
  upload(
    organizationId: string | null,
    key: string,
    stream: Readable,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<void>;

  /**
   * Generates a signed URL for secure access to a file.
   * @param organizationId - Tenant ID for config resolution
   * @param key - File key
   * @param expiresInSeconds - URL expiration time
   * @param operation - 'GET' for download, 'PUT' for upload
   */
  getSignedUrl(
    organizationId: string | null,
    key: string,
    expiresInSeconds: number,
    operation: 'GET' | 'PUT',
  ): Promise<string>;

  /**
   * Deletes a file from storage.
   * @param organizationId - Tenant ID for config resolution
   * @param key - File key
   */
  delete(organizationId: string | null, key: string): Promise<void>;

  /**
   * Lists files with a prefix.
   * @param organizationId - Tenant ID for config resolution
   * @param prefix - Key prefix
   */
  list(organizationId: string | null, prefix: string): Promise<string[]>;

  /**
   * Checks if storage is healthy.
   * @param organizationId - Tenant ID for config resolution
   */
  healthCheck(organizationId: string | null): Promise<boolean>;

  /**
   * Applies lifecycle policies.
   * @param organizationId - Tenant ID for config resolution
   * @param prefix - Prefix for files to manage
   * @param olderThanDays - Delete files older than this many days
   */
  applyLifecyclePolicy(
    organizationId: string | null,
    prefix: string,
    olderThanDays: number,
  ): Promise<void>;
}

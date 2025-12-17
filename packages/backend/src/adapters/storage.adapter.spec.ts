import { MinioStorageAdapter } from './storage.adapter';
import { ConfigService } from '@nestjs/config';

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => ({
    putObject: jest.fn(),
    presignedGetObject: jest.fn(),
    presignedPutObject: jest.fn(),
    removeObject: jest.fn(),
    listObjectsV2: jest.fn(),
    removeObjects: jest.fn(),
    listBuckets: jest.fn(),
  })),
}));

describe('MinioStorageAdapter', () => {
  let adapter: MinioStorageAdapter;
  let mockClient: any;

  beforeEach(() => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'MINIO_ENDPOINT') return 'localhost:9000';
        if (key === 'MINIO_ACCESS_KEY') return 'testkey';
        if (key === 'MINIO_SECRET_KEY') return 'testsecret';
        if (key === 'MINIO_BUCKET') return 'testbucket';
        return undefined;
      }),
    } as any;

    adapter = new MinioStorageAdapter(mockConfigService);
    mockClient = (adapter as any).client;
  });

  it('should upload a file', async () => {
    const stream = {} as any;
    mockClient.putObject.mockResolvedValue(undefined);

    await adapter.upload('test.wav', stream, 'audio/wav');

    expect(mockClient.putObject).toHaveBeenCalledWith('testbucket', 'test.wav', stream, undefined, { 'Content-Type': 'audio/wav' });
  });

  it('should get signed URL for GET', async () => {
    mockClient.presignedGetObject.mockResolvedValue('http://signed-url');

    const url = await adapter.getSignedUrl('test.wav', 3600, 'GET');

    expect(url).toBe('http://signed-url');
    expect(mockClient.presignedGetObject).toHaveBeenCalledWith('testbucket', 'test.wav', 3600);
  });

  it('should delete a file', async () => {
    mockClient.removeObject.mockResolvedValue(undefined);

    await adapter.delete('test.wav');

    expect(mockClient.removeObject).toHaveBeenCalledWith('testbucket', 'test.wav');
  });

  it('should list files', async () => {
    mockClient.listObjectsV2.mockResolvedValue([{ name: 'file1.wav' }, { name: 'file2.wav' }]);

    const files = await adapter.list('recordings/');

    expect(files).toEqual(['file1.wav', 'file2.wav']);
  });

  it('should perform health check', async () => {
    mockClient.listBuckets.mockResolvedValue([]);

    const healthy = await adapter.healthCheck();

    expect(healthy).toBe(true);
  });

  it('should apply lifecycle policy', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 40);
    mockClient.listObjectsV2.mockResolvedValue([{ name: 'old.wav', lastModified: oldDate }]);
    mockClient.removeObjects.mockResolvedValue(undefined);

    await adapter.applyLifecyclePolicy('recordings/', 30);

    expect(mockClient.removeObjects).toHaveBeenCalledWith('testbucket', ['old.wav']);
  });
});
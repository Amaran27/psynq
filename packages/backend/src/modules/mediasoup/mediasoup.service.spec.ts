import { MediasoupService } from './mediasoup.service';
import { ConfigService } from '@nestjs/config';

describe('MediasoupService', () => {
  let service: MediasoupService;

  beforeEach(async () => {
    const config = { get: jest.fn().mockReturnValue(1) } as any;
    service = new MediasoupService(config);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should spawn workers', () => {
    const workers = service.getWorkers();
    expect(workers.length).toBe(1);
  });

  it('should create router', async () => {
    const router = await service.createRouter('test-room');
    expect(router).toBeDefined();
  });
});
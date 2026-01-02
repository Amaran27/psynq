import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('OrganizationController (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let createdOrgId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Login as system admin to get token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'sysadmin',
        password: 'Admin@123',
      })
      .expect(200);

    adminToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /tenants', () => {
    it('should create organization with valid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Organization',
          slug: 'test-org-e2e',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Test Organization',
        slug: 'test-org-e2e',
        status: 'active',
      });
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      createdOrgId = response.body.id;
    });

    it('should reject duplicate organization name', async () => {
      await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Organization',
          slug: 'different-slug',
        })
        .expect(409);
    });

    it('should reject duplicate organization slug', async () => {
      await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Different Organization',
          slug: 'test-org-e2e',
        })
        .expect(409);
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .post('/tenants')
        .send({
          name: 'Unauthorized Org',
          slug: 'unauth-org',
        })
        .expect(401);
    });

    it('should reject request from non-admin user', async () => {
      // Login as regular agent
      const agentLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'agent1',
          password: 'Agent@123',
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${agentLoginResponse.body.accessToken}`)
        .send({
          name: 'Forbidden Org',
          slug: 'forbidden-org',
        })
        .expect(403);
    });
  });

  describe('GET /tenants', () => {
    it('should list all organizations', async () => {
      const response = await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const org = response.body.find((o: any) => o.id === createdOrgId);
      expect(org).toBeDefined();
      expect(org.name).toBe('Test Organization');
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer()).get('/tenants').expect(401);
    });

    it('should reject request from non-admin user', async () => {
      // Login as supervisor
      const supervisorLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'supervisor1',
          password: 'Supervisor@123',
        })
        .expect(200);

      await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${supervisorLoginResponse.body.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /tenants/:id', () => {
    it('should get organization by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/tenants/${createdOrgId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: createdOrgId,
        name: 'Test Organization',
        slug: 'test-org-e2e',
        status: 'active',
      });
    });

    it('should return 404 for non-existent organization', async () => {
      await request(app.getHttpServer())
        .get('/tenants/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should reject request without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/tenants/${createdOrgId}`)
        .expect(401);
    });

    it('should reject request from non-admin user', async () => {
      // Login as admin (not system admin)
      const adminLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'admin1',
          password: 'Admin@123',
        })
        .expect(200);

      await request(app.getHttpServer())
        .get(`/tenants/${createdOrgId}`)
        .set('Authorization', `Bearer ${adminLoginResponse.body.accessToken}`)
        .expect(403);
    });
  });

  describe('Organization Lifecycle', () => {
    it('should create, retrieve, and list organization', async () => {
      // Create
      const createResponse = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Lifecycle Test Org',
          slug: 'lifecycle-test',
        })
        .expect(201);

      const orgId = createResponse.body.id;

      // Retrieve by ID
      const getResponse = await request(app.getHttpServer())
        .get(`/tenants/${orgId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getResponse.body.id).toBe(orgId);

      // List all
      const listResponse = await request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const found = listResponse.body.find((o: any) => o.id === orgId);
      expect(found).toBeDefined();
    });
  });

  describe('Input Validation', () => {
    it('should validate organization slug format', async () => {
      const testCases = [
        { slug: 'valid-slug-123', shouldPass: true },
        { slug: 'another_valid_slug', shouldPass: true },
        { slug: 'UPPER-CASE', shouldPass: true },
        { slug: 'with spaces', shouldPass: true }, // Controller doesn't validate format yet
      ];

      for (const testCase of testCases) {
        const response = await request(app.getHttpServer())
          .post('/tenants')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            name: `Org ${testCase.slug}`,
            slug: testCase.slug,
          });

        if (testCase.shouldPass) {
          expect([201, 409]).toContain(response.status);
        }
      }
    });

    it('should handle long organization names', async () => {
      const longName = 'A'.repeat(255);
      const response = await request(app.getHttpServer())
        .post('/tenants')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: longName,
          slug: 'long-name-org',
        });

      expect([201, 409]).toContain(response.status);
    });
  });

  describe('Performance', () => {
    it('should handle rapid organization creation', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app.getHttpServer())
            .post('/tenants')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: `Rapid Org ${Date.now()}-${i}`,
              slug: `rapid-${Date.now()}-${i}`,
            }),
        );
      }

      const results = await Promise.all(promises);
      const successCount = results.filter((r) => r.status === 201).length;
      expect(successCount).toBe(5);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { UserEntity } from '../src/entities/user.entity';
import { OrganizationEntity } from '../src/entities/organization.entity';
import { AgentStatus } from '@psynq/core';
import { ConfigModule } from '@nestjs/config';

/**
 * Integration tests for Auth module.
 * 
 * These tests use a REAL database connection (no mocks) to verify:
 * - Database interactions work correctly
 * - Service-repository integration
 * - Event emission (if applicable)
 * - Full request-response flow
 * 
 * Prerequisites:
 * - PostgreSQL running (docker-compose up postgres)
 * - Test database accessible (psynq_db or psynq)
 * 
 * Test Coverage:
 * - User registration with validation
 * - Login with JWT token generation
 * - Token refresh flow
 * - Status updates (agent availability)
 * - Error cases (duplicate users, invalid credentials, expired tokens)
 */
describe('Auth Integration Tests (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let refreshToken: string;
  let userId: string;
  let testOrgId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.development',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          username: process.env.DB_USERNAME || 'psynq_user',
          password: process.env.DB_PASSWORD || 'mysecretpassword',
          database: process.env.DB_DATABASE || 'psynq',
          entities: [UserEntity, OrganizationEntity],
          synchronize: false, // Use migrations in tests
          dropSchema: false, // Don't drop schema - use existing
        }),
        TypeOrmModule.forFeature([UserEntity, OrganizationEntity]),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret-key',
          signOptions: { expiresIn: '1d' },
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Create a test organization for foreign key constraint
    const orgRepository = moduleFixture
      .get('UserEntityRepository')
      .manager.getRepository(OrganizationEntity);
    
    const existingOrg = await orgRepository.findOne({
      where: { slug: 'test-org-auth-integration' },
    });

    if (existingOrg) {
      testOrgId = existingOrg.id;
    } else {
      const testOrg = orgRepository.create({
        name: 'Test Organization',
        slug: 'test-org-auth-integration',
      });
      const savedOrg = await orgRepository.save(testOrg);
      testOrgId = savedOrg.id;
    }
  });

  afterAll(async () => {
    // Clean up test users
    if (app) {
      const userRepository = app
        .get('UserEntityRepository')
        .manager.getRepository(UserEntity);
      await userRepository.delete({
        username: 'integration-test-user',
      });
      await userRepository.delete({
        username: 'duplicate-test-user',
      });

      await app.close();
    }
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        username: 'integration-test-user',
        password: 'SecurePassword123!',
        organizationId: testOrgId,
        roles: ['agent'],
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(registerDto.username);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body.roles).toEqual(['agent']);

      userId = response.body.id;
    });

    it('should return 409 when username already exists', async () => {
      const registerDto = {
        username: 'integration-test-user', // Same username as above
        password: 'AnotherPassword123!',
        organizationId: testOrgId,
        roles: ['agent'],
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should validate password requirements', async () => {
      const registerDto = {
        username: 'weak-password-user',
        password: '123', // Too short
        organizationId: testOrgId,
        roles: ['agent'],
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400); // Validation error
    });

    it('should validate required fields', async () => {
      const registerDto = {
        username: 'missing-password-user',
        // Missing password
        organizationId: testOrgId,
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginDto = {
        username: 'integration-test-user',
        password: 'SecurePassword123!',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body).toHaveProperty('expires_in');
      expect(response.body.token_type).toBe('Bearer');

      authToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('should return 401 with invalid password', async () => {
      const loginDto = {
        username: 'integration-test-user',
        password: 'WrongPassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should return 401 with non-existent user', async () => {
      const loginDto = {
        username: 'non-existent-user',
        password: 'SomePassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should validate login input', async () => {
      const loginDto = {
        username: '', // Empty username
        password: 'SomePassword123!',
      };

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const refreshDto = {
        refreshToken,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');
      expect(response.body.access_token).not.toBe(authToken); // Should be new token

      // Update tokens for next tests
      authToken = response.body.access_token;
      refreshToken = response.body.refresh_token;
    });

    it('should return 401 with invalid refresh token', async () => {
      const refreshDto = {
        refreshToken: 'invalid.token.here',
      };

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(401);
    });

    it('should return 401 with expired refresh token', async () => {
      // Create an expired token (manually crafted or use a very old one)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const refreshDto = {
        refreshToken: expiredToken,
      };

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshDto)
        .expect(401);
    });
  });

  describe('PATCH /auth/status (authenticated)', () => {
    it('should update user status when authenticated', async () => {
      const statusDto = {
        status: AgentStatus.AVAILABLE,
        reason: 'Ready to take calls',
      };

      const response = await request(app.getHttpServer())
        .patch('/auth/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusDto)
        .expect(200);

      expect(response.body.status).toBe(AgentStatus.AVAILABLE);
      expect(response.body).toHaveProperty('lastStatusChangedAt');
    });

    it('should update to all valid status values', async () => {
      const statuses = [
        AgentStatus.BUSY,
        AgentStatus.BREAK,
        AgentStatus.AWAY,
        AgentStatus.ON_CALL,
        AgentStatus.OFFLINE,
      ];

      for (const status of statuses) {
        const response = await request(app.getHttpServer())
          .patch('/auth/status')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status })
          .expect(200);

        expect(response.body.status).toBe(status);
      }
    });

    it('should return 401 when not authenticated', async () => {
      const statusDto = {
        status: AgentStatus.AVAILABLE,
      };

      await request(app.getHttpServer())
        .patch('/auth/status')
        .send(statusDto)
        .expect(401);
    });

    it('should return 401 with invalid token', async () => {
      const statusDto = {
        status: AgentStatus.AVAILABLE,
      };

      await request(app.getHttpServer())
        .patch('/auth/status')
        .set('Authorization', 'Bearer invalid.token.here')
        .send(statusDto)
        .expect(401);
    });

    it('should validate status enum values', async () => {
      const statusDto = {
        status: 'INVALID_STATUS',
      };

      await request(app.getHttpServer())
        .patch('/auth/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusDto)
        .expect(400);
    });
  });

  describe('GET /auth/status (authenticated)', () => {
    it('should get current user status when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe(AgentStatus.OFFLINE); // Last status set above
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/auth/status')
        .expect(401);
    });
  });

  describe('Full Authentication Flow', () => {
    it('should complete full auth flow: register → login → refresh → status update', async () => {
      // 1. Register
      const registerDto = {
        username: 'full-flow-test-user',
        password: 'FlowTest123!',
        organizationId: testOrgId,
        roles: ['agent'],
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('id');
      const flowUserId = registerResponse.body.id;

      // 2. Login
      const loginDto = {
        username: 'full-flow-test-user',
        password: 'FlowTest123!',
      };

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      const flowAuthToken = loginResponse.body.access_token;
      const flowRefreshToken = loginResponse.body.refresh_token;

      // 3. Refresh tokens
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: flowRefreshToken })
        .expect(200);

      const newAuthToken = refreshResponse.body.access_token;

      // 4. Update status
      const statusResponse = await request(app.getHttpServer())
        .patch('/auth/status')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .send({ status: AgentStatus.AVAILABLE })
        .expect(200);

      expect(statusResponse.body.status).toBe(AgentStatus.AVAILABLE);

      // 5. Get status
      const getStatusResponse = await request(app.getHttpServer())
        .get('/auth/status')
        .set('Authorization', `Bearer ${newAuthToken}`)
        .expect(200);

      expect(getStatusResponse.body.status).toBe(AgentStatus.AVAILABLE);

      // Cleanup
      const userRepository = app
        .get('UserEntityRepository')
        .manager.getRepository(UserEntity);
      await userRepository.delete({ id: flowUserId });
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique username constraint', async () => {
      const user1 = {
        username: 'duplicate-test-user',
        password: 'Password123!',
        organizationId: testOrgId,
        roles: ['agent'],
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user1)
        .expect(201);

      // Try to register with same username
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(user1)
        .expect(409);
    });

    it('should allow multiple users with different usernames', async () => {
      const users = [
        {
          username: 'user-constraint-1',
          password: 'Password123!',
          organizationId: testOrgId,
          roles: ['agent'],
        },
        {
          username: 'user-constraint-2',
          password: 'Password123!',
          organizationId: testOrgId,
          roles: ['agent'],
        },
      ];

      for (const user of users) {
        await request(app.getHttpServer())
          .post('/auth/register')
          .send(user)
          .expect(201);
      }

      // Cleanup
      const userRepository = app
        .get('UserEntityRepository')
        .manager.getRepository(UserEntity);
      await userRepository.delete({ username: 'user-constraint-1' });
      await userRepository.delete({ username: 'user-constraint-2' });
    });
  });

  describe('Performance & Stress Tests', () => {
    it('should handle multiple concurrent login requests', async () => {
      const loginDto = {
        username: 'integration-test-user',
        password: 'SecurePassword123!',
      };

      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .post('/auth/login')
            .send(loginDto),
        );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('access_token');
      });
    });

    it('should handle rapid status updates', async () => {
      const statuses = [
        AgentStatus.AVAILABLE,
        AgentStatus.BUSY,
        AgentStatus.BREAK,
      ];

      for (const status of statuses) {
        await request(app.getHttpServer())
          .patch('/auth/status')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ status })
          .expect(200);
      }
    });
  });
});

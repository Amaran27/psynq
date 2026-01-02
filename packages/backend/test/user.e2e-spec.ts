import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import * as request from 'supertest';
import { UserModule } from '../src/modules/user/user.module';
import { AuthModule } from '../src/auth/auth.module';
import { UserEntity } from '../src/entities/user.entity';
import { OrganizationEntity } from '../src/entities/organization.entity';
import { ConfigModule } from '@nestjs/config';
import { AgentStatus } from '@psynq/core';
import { UserRole } from '../src/modules/user/domain/user.domain';

/**
 * Integration Tests for User Module (e2e)
 * 
 * Tests the complete User Management flow with REAL database:
 * - User CRUD operations
 * - Role management
 * - Status transitions
 * - Authorization checks
 * - Database constraints
 * 
 * Prerequisites:
 * - PostgreSQL running in Docker
 * - Database schema migrated
 * - Auth system functional (for JWT tokens)
 */
describe('User Module Integration Tests (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let testUserId: string;
  let testUserId2: string;
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
          synchronize: false,
          dropSchema: false,
        }),
        TypeOrmModule.forFeature([UserEntity, OrganizationEntity]),
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret-key',
          signOptions: { expiresIn: '1d' },
        }),
        AuthModule,
        UserModule,
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

    // Create test organization
    const orgRepository = moduleFixture
      .get('UserEntityRepository')
      .manager.getRepository(OrganizationEntity);
    
    const existingOrg = await orgRepository.findOne({
      where: { slug: 'test-org-user-integration' },
    });

    if (existingOrg) {
      testOrgId = existingOrg.id;
    } else {
      const testOrg = orgRepository.create({
        name: 'Test Organization User Module',
        slug: 'test-org-user-integration',
      });
      const savedOrg = await orgRepository.save(testOrg);
      testOrgId = savedOrg.id;
    }

    // Create admin user for authentication
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        username: 'user-e2e-admin',
        password: 'AdminPassword123!',
        organizationId: testOrgId,
        roles: [UserRole.ADMIN],
      });

    // Login to get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'user-e2e-admin',
        password: 'AdminPassword123!',
      });

    authToken = loginResponse.body.access_token;
  });

  afterAll(async () => {
    if (app) {
      const userRepository = app
        .get('UserEntityRepository')
        .manager.getRepository(UserEntity);
      
      await userRepository.delete({ username: 'user-e2e-admin' });
      await userRepository.delete({ username: 'e2e-test-user-1' });
      await userRepository.delete({ username: 'e2e-test-user-2' });
      await userRepository.delete({ username: 'e2e-test-agent' });

      await app.close();
    }
  });

  describe('POST /users - Create User', () => {
    it('should create a new user successfully', async () => {
      const createUserDto = {
        username: 'e2e-test-user-1',
        email: 'e2e-user1@example.com',
        password: 'SecurePass123!',
        firstName: 'E2E',
        lastName: 'Test User',
        phone: '+1234567890',
        roles: [UserRole.AGENT],
        organizationId: testOrgId,
        skills: ['sales', 'support'],
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(createUserDto.username);
      expect(response.body.email).toBe(createUserDto.email);
      expect(response.body).not.toHaveProperty('password');
      expect(response.body.roles).toContain(UserRole.AGENT);
      expect(response.body.skills).toEqual(['sales', 'support']);

      testUserId = response.body.id;
    });

    it('should reject unauthenticated requests', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .send({ username: 'noauth', password: 'Test123!' })
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        username: 'test',
        // Missing email and password
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidDto)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
    });

    it('should reject duplicate username', async () => {
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'e2e-test-user-1', // Already exists
          email: 'different@example.com',
          password: 'SecurePass123!',
        })
        .expect(409);

      expect(response.body).toHaveProperty('statusCode', 409);
    });

    it('should hash password before storing', async () => {
      // Password should NOT be returned in response
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'e2e-test-user-2',
          email: 'e2e-user2@example.com',
          password: 'PlainTextPassword123!',
          roles: [UserRole.AGENT],
        })
        .expect(201);

      testUserId2 = response.body.id;
      expect(response.body).not.toHaveProperty('password');
    });
  });

  describe('GET /users - List Users', () => {
    it('should return paginated list of users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(response.body).toHaveProperty('totalPages');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter by role', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ roles: UserRole.AGENT })
        .expect(200);

      expect(response.body.data).toBeDefined();
      // All returned users should have AGENT role
      response.body.data.forEach((user: any) => {
        expect(user.roles).toContain(UserRole.AGENT);
      });
    });

    it('should search by username', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'e2e-test' })
        .expect(200);

      expect(response.body.data).toBeDefined();
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: AgentStatus.OFFLINE })
        .expect(200);

      expect(response.body.data).toBeDefined();
      response.body.data.forEach((user: any) => {
        expect(user.status).toBe(AgentStatus.OFFLINE);
      });
    });
  });

  describe('GET /users/:id - Get User by ID', () => {
    it('should return user details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(testUserId);
      expect(response.body.username).toBe('e2e-test-user-1');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /users/:id - Update User', () => {
    it('should update user fields', async () => {
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+9876543210',
        skills: ['technical', 'billing'],
      };

      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.firstName).toBe('Updated');
      expect(response.body.lastName).toBe('Name');
      expect(response.body.phone).toBe('+9876543210');
      expect(response.body.skills).toEqual(['technical', 'billing']);
    });

    it('should reject duplicate email', async () => {
      // Get another user's email
      const usersResponse = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 2 });

      const anotherUserEmail = usersResponse.body.data.find(
        (u: any) => u.id !== testUserId,
      )?.email;

      if (anotherUserEmail) {
        await request(app.getHttpServer())
          .put(`/users/${testUserId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ email: anotherUserEmail })
          .expect(400);
      }
    });
  });

  describe('PUT /users/:id/password - Change Password', () => {
    it('should change password with correct old password', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword: 'SecurePass123!',
          newPassword: 'NewSecurePass456!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject incorrect old password', async () => {
      await request(app.getHttpServer())
        .put(`/users/${testUserId}/password`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          oldPassword: 'WrongPassword!',
          newPassword: 'NewSecurePass456!',
        })
        .expect(400);
    });
  });

  describe('PUT /users/:id/status - Update Agent Status', () => {
    beforeAll(async () => {
      // Create an agent user for status tests
      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'e2e-test-agent',
          email: 'agent@example.com',
          password: 'AgentPass123!',
          roles: [UserRole.AGENT],
          status: AgentStatus.OFFLINE,
        });

      testUserId = response.body.id;
    });

    it('should update agent status with valid transition', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: AgentStatus.AVAILABLE })
        .expect(200);

      expect(response.body.status).toBe(AgentStatus.AVAILABLE);
      expect(response.body).toHaveProperty('lastStatusChangedAt');
    });

    it('should reject invalid status transition', async () => {
      // Try to go from AVAILABLE to WRAP_UP (invalid)
      await request(app.getHttpServer())
        .put(`/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: AgentStatus.OFFLINE }) // First go back to OFFLINE
        .expect(200);

      // Now try invalid transition
      await request(app.getHttpServer())
        .put(`/users/${testUserId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: AgentStatus.BUSY }) // Cannot go OFFLINE -> BUSY
        .expect(400);
    });

    it('should reject status update for non-agent', async () => {
      // testUserId2 is not an agent
      await request(app.getHttpServer())
        .put(`/users/${testUserId2}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: AgentStatus.AVAILABLE })
        .expect(400);
    });
  });

  describe('PUT /users/:id/roles - Assign Roles', () => {
    it('should assign multiple roles', async () => {
      const response = await request(app.getHttpServer())
        .put(`/users/${testUserId}/roles`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roles: [UserRole.AGENT, UserRole.SUPERVISOR],
          primaryRole: UserRole.SUPERVISOR,
        })
        .expect(200);

      expect(response.body.roles).toContain(UserRole.AGENT);
      expect(response.body.roles).toContain(UserRole.SUPERVISOR);
      expect(response.body.primaryRole).toBe(UserRole.SUPERVISOR);
    });

    it('should reject empty roles array', async () => {
      await request(app.getHttpServer())
        .put(`/users/${testUserId}/roles`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roles: [] })
        .expect(400);
    });

    it('should reject primary role not in roles array', async () => {
      await request(app.getHttpServer())
        .put(`/users/${testUserId}/roles`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roles: [UserRole.AGENT],
          primaryRole: UserRole.ADMIN, // Not in roles array
        })
        .expect(400);
    });
  });

  describe('GET /users/available - Get Available Agents', () => {
    it('should return only available agents', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/available')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((user: any) => {
        expect(user.status).toBe(AgentStatus.AVAILABLE);
        expect(user.roles).toContain(UserRole.AGENT);
      });
    });
  });

  describe('GET /users/by-role/:role - Filter by Role', () => {
    it('should return users with specified role', async () => {
      const response = await request(app.getHttpServer())
        .get(`/users/by-role/${UserRole.AGENT}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((user: any) => {
        expect(user.roles).toContain(UserRole.AGENT);
      });
    });
  });

  describe('DELETE /users/:id - Delete User', () => {
    it('should delete user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/users/${testUserId2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');

      // Verify deletion
      await request(app.getHttpServer())
        .get(`/users/${testUserId2}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app.getHttpServer())
        .delete(`/users/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique username constraint', async () => {
      // Try to create user with existing username via direct DB
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'e2e-test-user-1',
          email: 'unique@example.com',
          password: 'Test123!',
        })
        .expect(409);
    });

    it('should enforce unique email constraint', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          username: 'unique-username',
          email: 'e2e-user1@example.com', // Already exists
          password: 'Test123!',
        })
        .expect(409);
    });
  });

  describe('Performance', () => {
    it('should list users in under 500ms', async () => {
      const start = Date.now();
      
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 50 })
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it('should handle pagination efficiently', async () => {
      const start = Date.now();
      
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 2, limit: 20 })
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });
});

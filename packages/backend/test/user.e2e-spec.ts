import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { UserRole } from '../src/entities/user.entity';

/**
 * E2E Tests for User Management
 * 
 * These tests run against the real application with real database.
 * NO MOCKS - All services, repositories, and database are real.
 * 
 * Prerequisites:
 * - PostgreSQL running in container
 * - Database initialized with schema
 * - Test runs in transaction (rolled back after each test)
 */
describe('User Management (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply same validation as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Start transaction for test isolation
    await dataSource.query('BEGIN');
  });

  afterEach(async () => {
    // Rollback transaction to clean up test data
    await dataSource.query('ROLLBACK');
  });

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .expect(401);

      expect(response.body).toHaveProperty('statusCode', 401);
      expect(response.body).toHaveProperty('message', 'Unauthorized');
    });

    // TODO: Implement login endpoint first, then add:
    // it('should authenticate admin user and return JWT token', async () => {});
  });

  describe('POST /users - Create User', () => {
    it('should create a new user with valid data', async () => {
      const newUser = {
        username: 'testuser1',
        email: 'test1@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'User',
        roles: [UserRole.AGENT],
      };

      // TODO: Add authentication when auth endpoint is ready
      // For now, test will fail with 401 which is correct behavior

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(newUser)
        .expect(401); // Expected until auth is implemented

      // When auth is ready, update to:
      // .set('Authorization', `Bearer ${authToken}`)
      // .expect(201);
      // expect(response.body).toHaveProperty('id');
      // expect(response.body.username).toBe(newUser.username);
      // expect(response.body).not.toHaveProperty('password');
    });

    it('should validate required fields', async () => {
      const invalidUser = {
        username: 'test',
        // missing email, password, roles
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(invalidUser)
        .expect(401); // Will get 401 before validation due to auth

      // When auth is ready, will get 400 validation error
    });

    it('should reject duplicate username', async () => {
      // TODO: Implement when auth is ready
      // 1. Create user
      // 2. Attempt to create another with same username
      // 3. Expect 409 Conflict
    });

    it('should reject duplicate email', async () => {
      // TODO: Implement when auth is ready
    });

    it('should hash password before storing', async () => {
      // TODO: Verify password is hashed, not plain text
    });
  });

  describe('GET /users - List Users', () => {
    it('should return paginated list of users', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 1, limit: 10 })
        .expect(401);

      // When auth is ready:
      // expect(response.body).toHaveProperty('data');
      // expect(response.body).toHaveProperty('total');
      // expect(response.body).toHaveProperty('page');
      // expect(response.body).toHaveProperty('limit');
    });

    it('should filter users by role', async () => {
      // TODO: Create users with different roles, then filter
    });

    it('should search users by username or email', async () => {
      // TODO: Create users, then search
    });

    it('should filter by status', async () => {
      // TODO: Create users with different statuses, then filter
    });
  });

  describe('GET /users/:id - Get User', () => {
    it('should return user details by ID', async () => {
      // TODO: Create user, then retrieve by ID
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      await request(app.getHttpServer())
        .get(`/users/${fakeId}`)
        .expect(401); // Will be 404 when auth is ready
    });

    it('should not expose password in response', async () => {
      // TODO: Verify password field is excluded
    });
  });

  describe('PUT /users/:id - Update User', () => {
    it('should update user fields', async () => {
      // TODO: Create user, update fields, verify changes
    });

    it('should not allow updating username', async () => {
      // TODO: Verify username cannot be changed
    });

    it('should not allow updating email to duplicate', async () => {
      // TODO: Try to update to existing email
    });
  });

  describe('PUT /users/:id/password - Change Password', () => {
    it('should change password with valid old password', async () => {
      // TODO: Create user, change password, verify old password required
    });

    it('should reject invalid old password', async () => {
      // TODO: Attempt password change with wrong old password
    });

    it('should hash new password', async () => {
      // TODO: Verify new password is hashed
    });
  });

  describe('PUT /users/:id/status - Update Agent Status', () => {
    it('should update agent status with valid transition', async () => {
      // TODO: Test OFFLINE -> AVAILABLE
    });

    it('should reject invalid status transition', async () => {
      // TODO: Test OFFLINE -> BUSY (should fail)
    });

    it('should update lastStatusChangedAt timestamp', async () => {
      // TODO: Verify timestamp is updated
    });
  });

  describe('PUT /users/:id/roles - Assign Roles', () => {
    it('should assign multiple roles to user', async () => {
      // TODO: Assign AGENT and SUPERVISOR roles
    });

    it('should set primary role', async () => {
      // TODO: Verify primaryRole field
    });

    it('should require ADMIN role to assign roles', async () => {
      // TODO: Test with non-admin token
    });
  });

  describe('GET /users/available - Get Available Agents', () => {
    it('should return only available agents', async () => {
      // TODO: Create agents with different statuses
      // Verify only AVAILABLE status returned
    });
  });

  describe('GET /users/by-role/:role - Filter by Role', () => {
    it('should return users with specified role', async () => {
      // TODO: Create users with different roles
      // Filter by AGENT, verify results
    });
  });

  describe('DELETE /users/:id - Delete User', () => {
    it('should delete user', async () => {
      // TODO: Create user, delete, verify deletion
    });

    it('should return 404 for non-existent user', async () => {
      // TODO: Attempt to delete non-existent user
    });

    it('should require ADMIN role', async () => {
      // TODO: Test with non-admin token
    });
  });

  describe('Authorization Tests', () => {
    it('should allow ADMIN to create users', async () => {
      // TODO: Test with admin token
    });

    it('should reject non-ADMIN creating users', async () => {
      // TODO: Test with agent token
    });

    it('should allow users to update their own profile', async () => {
      // TODO: Test self-update
    });

    it('should allow ADMIN to update any user', async () => {
      // TODO: Test admin updating other users
    });
  });
});

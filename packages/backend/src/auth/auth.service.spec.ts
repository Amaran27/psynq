import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserEntity, UserRole } from '../entities/user.entity';
import { RegisterUserDto } from './dto/register-user.dto';
import { AgentStatus } from '@psynq/core';
import { CallService } from '../services/call.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<UserEntity>>;
  let jwtService: jest.Mocked<JwtService>;
  let callService: jest.Mocked<CallService>;

  const mockUser: UserEntity = {
    id: 'user-123',
    username: 'testuser',
    password: 'hashed_password',
    roles: [UserRole.AGENT],
    organizationId: 'org-456',
    status: AgentStatus.OFFLINE,
    lastStatusChangedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserEntity;

  const mockUserWithoutPassword = {
    id: mockUser.id,
    username: mockUser.username,
    roles: mockUser.roles,
    organizationId: mockUser.organizationId,
    status: mockUser.status,
    lastStatusChangedAt: mockUser.lastStatusChangedAt,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: CallService,
          useValue: {
            // Mock any CallService methods if needed
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(UserEntity));
    jwtService = module.get(JwtService);
    callService = module.get(CallService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterUserDto = {
      username: 'newuser',
      password: 'password123',
      organizationId: 'org-456',
      roles: [UserRole.AGENT],
    };

    it('should successfully register a new user', async () => {
      userRepository.findOneBy.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt123');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password123');
      userRepository.create.mockReturnValue({
        ...mockUser,
        username: registerDto.username,
        password: 'hashed_password123',
      } as UserEntity);
      userRepository.save.mockResolvedValue({
        ...mockUser,
        username: registerDto.username,
        password: 'hashed_password123',
      } as UserEntity);

      const result = await service.register(registerDto);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        username: registerDto.username,
      });
      expect(bcrypt.genSalt).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 'salt123');
      expect(userRepository.create).toHaveBeenCalledWith({
        username: registerDto.username,
        password: 'hashed_password123',
        roles: [UserRole.AGENT],
      });
      expect(userRepository.save).toHaveBeenCalled();
      expect(result).not.toHaveProperty('password');
      expect(result.username).toBe(registerDto.username);
    });

    it('should throw ConflictException if username already exists', async () => {
      userRepository.findOneBy.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Username already exists',
      );
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        username: registerDto.username,
      });
      expect(bcrypt.genSalt).not.toHaveBeenCalled();
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should handle bcrypt errors gracefully', async () => {
      userRepository.findOneBy.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockRejectedValue(
        new Error('Salt generation failed'),
      );

      await expect(service.register(registerDto)).rejects.toThrow(
        'Salt generation failed',
      );
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      userRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('testuser', 'password123');

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        username: 'testuser',
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        mockUser.password,
      );
      expect(result).not.toHaveProperty('password');
      expect(result?.username).toBe('testuser');
    });

    it('should return null when user is not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent', 'password123');

      expect(result).toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should return null when password is incorrect', async () => {
      userRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('testuser', 'wrongpassword');

      expect(result).toBeNull();
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrongpassword',
        mockUser.password,
      );
    });

    it('should handle bcrypt comparison errors', async () => {
      userRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockRejectedValue(
        new Error('Comparison failed'),
      );

      await expect(
        service.validateUser('testuser', 'password123'),
      ).rejects.toThrow('Comparison failed');
    });
  });

  describe('login', () => {
    it('should return access and refresh tokens', async () => {
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      jwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      const result = await service.login(mockUserWithoutPassword);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenNthCalledWith(1, {
        username: mockUser.username,
        sub: mockUser.id,
        roles: mockUser.roles,
        orgId: mockUser.organizationId,
      });
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        {
          username: mockUser.username,
          sub: mockUser.id,
          roles: mockUser.roles,
          orgId: mockUser.organizationId,
        },
        {
          expiresIn: '7d',
        },
      );
      expect(result).toEqual({
        access_token: mockAccessToken,
        refresh_token: mockRefreshToken,
        expires_in: 86400,
        token_type: 'Bearer',
      });
    });

    it('should use custom JWT_REFRESH_EXPIRES_IN from environment', async () => {
      process.env.JWT_REFRESH_EXPIRES_IN = '14d';
      const mockAccessToken = 'mock.access.token';
      const mockRefreshToken = 'mock.refresh.token';

      jwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      await service.login(mockUserWithoutPassword);

      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        expect.any(Object),
        {
          expiresIn: '14d',
        },
      );

      delete process.env.JWT_REFRESH_EXPIRES_IN;
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshToken = 'valid.refresh.token';
    const mockPayload = {
      username: mockUser.username,
      sub: mockUser.id,
      roles: mockUser.roles,
      orgId: mockUser.organizationId,
    };

    it('should return new access and refresh tokens when refresh token is valid', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      userRepository.findOneBy.mockResolvedValue(mockUser);
      jwtService.sign
        .mockReturnValueOnce('new.access.token')
        .mockReturnValueOnce('new.refresh.token');

      const result = await service.refreshTokens(mockRefreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(mockRefreshToken);
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        id: mockUser.id,
      });
      expect(result).toEqual({
        access_token: 'new.access.token',
        refresh_token: 'new.refresh.token',
        expires_in: 86400,
        token_type: 'Bearer',
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      jwtService.verify.mockReturnValue(mockPayload);
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException if token verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Token expired');
      });

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        'Invalid or expired refresh token',
      );
    });

    it('should throw UnauthorizedException if token is malformed', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        service.refreshTokens('malformed.token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('updateStatus', () => {
    it('should successfully update user status', async () => {
      const updatedUser = {
        ...mockUser,
        status: AgentStatus.AVAILABLE,
        lastStatusChangedAt: new Date(),
      };

      userRepository.update.mockResolvedValue(undefined as any);
      userRepository.findOneBy.mockResolvedValue(updatedUser);

      const result = await service.updateStatus(
        mockUser.id,
        AgentStatus.AVAILABLE,
      );

      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        status: AgentStatus.AVAILABLE,
        lastStatusChangedAt: expect.any(Date),
      });
      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        id: mockUser.id,
      });
      expect(result.status).toBe(AgentStatus.AVAILABLE);
    });

    it('should throw error if user not found after update', async () => {
      userRepository.update.mockResolvedValue(undefined as any);
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(
        service.updateStatus(mockUser.id, AgentStatus.AVAILABLE),
      ).rejects.toThrow('User not found after update');
    });

    it('should update to all possible agent statuses', async () => {
      const statuses = [
        AgentStatus.AVAILABLE,
        AgentStatus.OFFLINE,
        AgentStatus.ON_CALL,
        AgentStatus.BUSY,
        AgentStatus.AWAY,
        AgentStatus.BREAK,
      ];

      for (const status of statuses) {
        const updatedUser = { ...mockUser, status };
        userRepository.update.mockResolvedValue(undefined as any);
        userRepository.findOneBy.mockResolvedValue(updatedUser);

        const result = await service.updateStatus(mockUser.id, status);

        expect(result.status).toBe(status);
        jest.clearAllMocks();
      }
    });

    it('should handle database update errors', async () => {
      userRepository.update.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(
        service.updateStatus(mockUser.id, AgentStatus.AVAILABLE),
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('getUserStatus', () => {
    it('should return user status when user exists', async () => {
      userRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await service.getUserStatus(mockUser.id);

      expect(userRepository.findOneBy).toHaveBeenCalledWith({
        id: mockUser.id,
      });
      expect(result).toBe(AgentStatus.OFFLINE);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(service.getUserStatus('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.getUserStatus('nonexistent')).rejects.toThrow(
        'User not found',
      );
    });

    it('should handle database errors', async () => {
      userRepository.findOneBy.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.getUserStatus(mockUser.id)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null user in login', async () => {
      // This is an edge case - login expects a user but let's test defensive programming
      const nullUser = null as any;

      await expect(service.login(nullUser)).rejects.toThrow();
    });

    it('should handle empty string username in validateUser', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      const result = await service.validateUser('', 'password');

      expect(result).toBeNull();
    });

    it('should handle very long passwords in register', async () => {
      const longPassword = 'a'.repeat(1000);
      const registerDto: RegisterUserDto = {
        username: 'testuser',
        password: longPassword,
        organizationId: 'org-456',
        roles: [UserRole.AGENT],
      };

      userRepository.findOneBy.mockResolvedValue(null);
      (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      userRepository.create.mockReturnValue(mockUser);
      userRepository.save.mockResolvedValue(mockUser);

      await service.register(registerDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(longPassword, 'salt');
    });

    it('should handle special characters in username', async () => {
      const specialUser = { ...mockUser, username: 'user@#$%' };
      userRepository.findOneBy.mockResolvedValue(specialUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('user@#$%', 'password');

      expect(result?.username).toBe('user@#$%');
    });
  });
});

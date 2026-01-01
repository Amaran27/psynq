#!/usr/bin/env python3
"""
Part 3: Backend Core Services - NestJS modules with exact file paths and signatures
"""
import sys
sys.path.insert(0, 'd:/Project/psitrix/psynq/scripts')
from generate_detailed_workitems import create_item, write_items

def generate_backend_core():
    """Generate Backend Core Services detailed work items"""
    print("\nGenerating Backend Core Services...")
    items = []
    phase = 'Phase: Backend Core Services'
    
    # Epic: Authentication Module
    epic1 = 'Epic: Authentication & Authorization'
    items.append(create_item(epic1, 'Epic', phase, 'High',
        '''JWT-based authentication with RBAC.
        
Modules:
- packages/backend/src/modules/auth/
- packages/backend/src/guards/
- packages/backend/src/decorators/

Features:
- JWT access + refresh tokens
- Role-based access (Admin, Supervisor, Agent)
- Permission-based actions
- Multi-tenant isolation
- Session management
- Password policies''', 15, 21, labels='Backend,Auth'))

    # Feature: Auth Module
    feat1 = 'Feature: Auth Module Implementation'
    items.append(create_item(feat1, 'Feature', epic1, 'High',
        '''Complete NestJS auth module with JWT.

Directory Structure:
```
packages/backend/src/modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── roles.guard.ts
│   └── tenant.guard.ts
├── decorators/
│   ├── current-user.decorator.ts
│   ├── roles.decorator.ts
│   └── public.decorator.ts
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   ├── refresh-token.dto.ts
│   └── change-password.dto.ts
└── interfaces/
    ├── jwt-payload.interface.ts
    └── token-response.interface.ts
```''', 15, 14, labels='Backend,Auth'))

    # Task: AuthService
    items.append(create_item(
        'Task: Implement AuthService class',
        'Task', feat1, 'High',
        '''File: packages/backend/src/modules/auth/auth.service.ts

```typescript
import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenResponse } from './interfaces/token-response.interface';

@Injectable()
export class AuthService {
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly bcryptRounds = 12;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.accessTokenExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m');
    this.refreshTokenExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');
  }

  async validateUser(email: string, password: string, tenantId: string): Promise<any> {
    const user = await this.usersService.findByEmail(email, tenantId);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    
    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await this.usersService.recordFailedLogin(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
      loginDto.tenantId,
    );

    await this.usersService.recordSuccessfulLogin(user.id);

    return this.generateTokens(user);
  }

  async register(registerDto: RegisterDto): Promise<TokenResponse> {
    const existingUser = await this.usersService.findByEmail(
      registerDto.email,
      registerDto.tenantId,
    );

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(registerDto.password, this.bcryptRounds);

    const user = await this.usersService.create({
      ...registerDto,
      passwordHash,
    });

    return this.generateTokens(user);
  }

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    
    const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.bcryptRounds);
    await this.usersService.updatePassword(userId, passwordHash);
  }

  private generateTokens(user: any): TokenResponse {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    return {
      accessToken: this.jwtService.sign(payload, {
        expiresIn: this.accessTokenExpiry,
      }),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.refreshTokenExpiry,
      }),
      expiresIn: this.accessTokenExpiry,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }
}
```

Dependencies:
- @nestjs/jwt
- @nestjs/passport
- bcrypt
- passport-jwt
- passport-local

Tests Required:
- validateUser with valid credentials
- validateUser with invalid password
- validateUser with inactive account
- login success flow
- register with new email
- register with existing email (should fail)
- refreshToken with valid token
- refreshToken with expired token
- changePassword success
- changePassword with wrong current password

Acceptance Criteria:
- All methods implemented with proper error handling
- Password hashing with bcrypt (12 rounds)
- JWT tokens with configurable expiry
- Multi-tenant isolation enforced
- No hardcoded secrets - all from config
- Unit tests passing with REAL database''',
        15, 3, 8, 'Backend,Auth,Service'))

    # Task: AuthController
    items.append(create_item(
        'Task: Implement AuthController with endpoints',
        'Task', feat1, 'High',
        '''File: packages/backend/src/modules/auth/auth.controller.ts

```typescript
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TokenResponse } from './interfaces/token-response.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<TokenResponse> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<TokenResponse> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<TokenResponse> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change password' })
  @ApiResponse({ status: 200, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Current password incorrect' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async getProfile(@CurrentUser() user: any): Promise<any> {
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  async logout(@CurrentUser() user: any): Promise<{ message: string }> {
    // Invalidate refresh token in Redis/DB if implementing token blacklist
    return { message: 'Logged out successfully' };
  }
}
```

API Endpoints:
- POST /auth/login - Login with email/password
- POST /auth/register - Register new user
- POST /auth/refresh - Refresh access token
- POST /auth/change-password - Change password (authenticated)
- GET /auth/me - Get current user profile (authenticated)
- POST /auth/logout - Logout (authenticated)

Acceptance Criteria:
- All endpoints documented with Swagger
- Proper HTTP status codes
- Validation on all DTOs
- Rate limiting on login endpoint (implement later)
- CORS configured properly
- Integration tests with REAL API calls''',
        18, 2, 4, 'Backend,Auth,Controller,API'))

    # Task: DTOs
    items.append(create_item(
        'Task: Create Auth DTOs with validation',
        'Task', feat1, 'High',
        '''Files:
- packages/backend/src/modules/auth/dto/login.dto.ts
- packages/backend/src/modules/auth/dto/register.dto.ts
- packages/backend/src/modules/auth/dto/refresh-token.dto.ts
- packages/backend/src/modules/auth/dto/change-password.dto.ts

login.dto.ts:
```typescript
import { IsEmail, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecureP@ss123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;
}
```

register.dto.ts:
```typescript
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsUUID, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecureP@ss123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/,
    { message: 'Password must contain uppercase, lowercase, number and special character' }
  )
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: 'agent', enum: ['admin', 'supervisor', 'agent'] })
  @IsIn(['admin', 'supervisor', 'agent'])
  role: string;
}
```

change-password.dto.ts:
```typescript
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/,
    { message: 'Password must contain uppercase, lowercase, number and special character' }
  )
  newPassword: string;
}
```

Dependencies:
- class-validator
- class-transformer
- @nestjs/swagger

Acceptance Criteria:
- All DTOs have proper validation decorators
- Swagger documentation for all properties
- Password policy enforced (min 8 chars, complexity)
- Email format validation
- UUID format validation for tenantId''',
        17, 1, 3, 'Backend,Auth,DTO'))

    # Task: JWT Strategy
    items.append(create_item(
        'Task: Implement JWT Strategy for Passport',
        'Task', feat1, 'High',
        '''File: packages/backend/src/modules/auth/strategies/jwt.strategy.ts

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    const user = await this.usersService.findById(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    if (user.status !== 'active') {
      throw new UnauthorizedException('User account is not active');
    }

    // Attach full user context for use in controllers
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }
}
```

File: packages/backend/src/modules/auth/interfaces/jwt-payload.interface.ts

```typescript
export interface JwtPayload {
  sub: string;        // User ID
  email: string;
  tenantId: string;
  role: string;
  iat?: number;       // Issued at
  exp?: number;       // Expiration
}
```

Acceptance Criteria:
- JWT extracted from Authorization header
- Token expiration validated
- User existence verified on each request
- Inactive users rejected
- Full user context available in request''',
        16, 1, 2, 'Backend,Auth,Strategy'))

    # Task: Guards
    items.append(create_item(
        'Task: Implement Auth Guards (JWT, Roles, Tenant)',
        'Task', feat1, 'High',
        '''Files:
- packages/backend/src/modules/auth/guards/jwt-auth.guard.ts
- packages/backend/src/modules/auth/guards/roles.guard.ts
- packages/backend/src/modules/auth/guards/tenant.guard.ts

jwt-auth.guard.ts:
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      return true;
    }
    
    return super.canActivate(context);
  }
}
```

roles.guard.ts:
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    
    const hasRole = requiredRoles.includes(user.role);
    
    if (!hasRole) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
    }
    
    return true;
  }
}
```

tenant.guard.ts:
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const resourceTenantId = request.params.tenantId || request.body?.tenantId;
    
    // Skip if no tenant ID in request
    if (!resourceTenantId) {
      return true;
    }
    
    // Admin can access any tenant (if needed, or restrict this)
    // For now, enforce strict tenant isolation
    if (user.tenantId !== resourceTenantId) {
      throw new ForbiddenException('Access denied to this tenant');
    }
    
    return true;
  }
}
```

Acceptance Criteria:
- JwtAuthGuard respects @Public() decorator
- RolesGuard checks user role against required roles
- TenantGuard enforces tenant isolation
- Clear error messages for access denied
- All guards work with decorators''',
        17, 2, 4, 'Backend,Auth,Guard'))

    # Task: Decorators
    items.append(create_item(
        'Task: Create Auth Decorators (@CurrentUser, @Roles, @Public)',
        'Task', feat1, 'Medium',
        '''Files:
- packages/backend/src/modules/auth/decorators/current-user.decorator.ts
- packages/backend/src/modules/auth/decorators/roles.decorator.ts
- packages/backend/src/modules/auth/decorators/public.decorator.ts

current-user.decorator.ts:
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    return data ? user?.[data] : user;
  },
);

// Usage: @CurrentUser() user or @CurrentUser('id') userId
```

roles.decorator.ts:
```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Usage: @Roles('admin', 'supervisor')
```

public.decorator.ts:
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Usage: @Public() on public endpoints
```

Acceptance Criteria:
- @CurrentUser() injects authenticated user
- @CurrentUser('id') injects specific property
- @Roles() sets required roles metadata
- @Public() marks endpoint as public (no auth required)
- All decorators documented with JSDoc''',
        17, 1, 2, 'Backend,Auth,Decorator'))

    # Task: Auth Module Registration
    items.append(create_item(
        'Task: Create AuthModule with all providers',
        'Task', feat1, 'High',
        '''File: packages/backend/src/modules/auth/auth.module.ts

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { TenantGuard } from './guards/tenant.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRY', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LocalStrategy,
    JwtAuthGuard,
    RolesGuard,
    TenantGuard,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, TenantGuard],
})
export class AuthModule {}
```

File: packages/backend/src/app.module.ts (update)
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    // ... other modules
  ],
  providers: [
    // Apply JWT guard globally
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // Apply roles guard globally
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

Acceptance Criteria:
- AuthModule properly imports dependencies
- JWT configured from environment variables
- Guards registered globally
- Module exports guards for use in other modules
- All imports resolve correctly''',
        19, 1, 2, 'Backend,Auth,Module'))

    return items

if __name__ == '__main__':
    generate_backend_core()

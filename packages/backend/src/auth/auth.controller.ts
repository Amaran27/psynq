import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  HttpCode,
  HttpStatus,
  Get,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { LocalAuthGuard } from './local-auth.guard';
import {
  RegisterUserDto,
  RefreshTokenDto,
  UpdateStatusDto,
  LoginDto,
  AuthTokensResponseDto,
  StatusResponseDto,
  StatusUpdateResponseDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationDto,
  SessionDto,
  SessionsResponseDto,
  RevokeSessionDto,
} from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterUseCase } from './application/register.usecase';
import { LoginUseCase } from './application/login.usecase';
import { RefreshTokenUseCase } from './application/refresh-token.usecase';
import { UpdateStatusUseCase } from './application/update-status.usecase';
import { ForgotPasswordUseCase } from './application/forgot-password.usecase';
import { ResetPasswordUseCase } from './application/reset-password.usecase';
import { VerifyEmailUseCase } from './application/verify-email.usecase';
import { ResendVerificationUseCase } from './application/resend-verification.usecase';
import { GetSessionsUseCase } from './application/get-sessions.usecase';
import { RevokeSessionUseCase } from './application/revoke-session.usecase';
import { RevokeAllSessionsUseCase } from './application/revoke-all-sessions.usecase';
import { AuthUser } from './domain/authentication.entity';
import { SessionEntity } from '../entities/session.entity';

interface RequestWithUser extends ExpressRequest {
  user: AuthUser;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly updateStatusUseCase: UpdateStatusUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly verifyEmailUseCase: VerifyEmailUseCase,
    private readonly resendVerificationUseCase: ResendVerificationUseCase,
    private readonly getSessionsUseCase: GetSessionsUseCase,
    private readonly revokeSessionUseCase: RevokeSessionUseCase,
    private readonly revokeAllSessionsUseCase: RevokeAllSessionsUseCase,
  ) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Creates a new user account with username and password',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthTokensResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input or username already exists',
  })
  @ApiResponse({ status: 409, description: 'Username conflict' })
  async register(
    @Body() registerUserDto: RegisterUserDto,
  ): Promise<AuthTokensResponseDto> {
    return this.registerUseCase.execute(
      registerUserDto.username,
      registerUserDto.password,
      registerUserDto.email,
    ) as any;
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'User login',
    description: 'Authenticates user with username and password',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthTokensResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Request() req: RequestWithUser): Promise<AuthTokensResponseDto> {
    return this.loginUseCase.generateTokensForUser(req.user) as any;
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get agent status',
    description: 'Retrieves the current status of the authenticated agent',
  })
  @ApiResponse({
    status: 200,
    description: 'Agent status retrieved',
    type: StatusResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(@Request() req: RequestWithUser): Promise<StatusResponseDto> {
    const status = await this.updateStatusUseCase.getUserStatus(req.user.id);
    return { status };
  }

  @UseGuards(JwtAuthGuard)
  @Post('status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update agent status',
    description:
      'Updates the status of the authenticated agent (available, busy, offline, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: StatusUpdateResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status value' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateStatus(
    @Request() req: RequestWithUser,
    @Body() updateStatusDto: UpdateStatusDto,
  ): Promise<StatusUpdateResponseDto> {
    await this.updateStatusUseCase.execute(req.user.id, updateStatusDto.status);
    return {
      status: updateStatusDto.status,
      updatedAt: new Date().toISOString(),
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges a valid refresh token for new access and refresh tokens',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: AuthTokensResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthTokensResponseDto> {
    return this.refreshTokenUseCase.execute(
      refreshTokenDto.refresh_token,
    ) as any;
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Sends a password reset email if the user exists',
  })
  @ApiResponse({
    status: 200,
    description: 'If email exists, a reset link has been sent',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string; expiresAt: Date }> {
    return this.forgotPasswordUseCase.execute(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password',
    description: 'Resets password using a valid reset token',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.resetPasswordUseCase.execute(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email',
    description: 'Verifies user email using a verification token',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return this.verifyEmailUseCase.execute(verifyEmailDto.token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend email verification',
    description: 'Resends email verification link if email is not verified',
  })
  @ApiResponse({
    status: 200,
    description: 'If email exists and is not verified, a verification link has been sent',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ): Promise<{ message: string; expiresAt: Date }> {
    return this.resendVerificationUseCase.execute(resendVerificationDto.email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get active sessions',
    description: 'Retrieves all active sessions for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Active sessions retrieved',
    type: SessionsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSessions(
    @Request() req: RequestWithUser,
  ): Promise<{ sessions: SessionEntity[]; total: number }> {
    const sessions = await this.getSessionsUseCase.execute(req.user.id);
    return {
      sessions: sessions.map((s) => ({
        ...s,
        refreshToken: s.refreshToken.substring(0, 10) + '...', // Truncate for security
      })) as any,
      total: sessions.length,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke a session',
    description: 'Revokes a specific session (logout from that device)',
  })
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid session' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeSession(
    @Request() req: RequestWithUser,
    @Body() revokeSessionDto: RevokeSessionDto,
  ): Promise<{ message: string }> {
    return this.revokeSessionUseCase.execute(req.user.id, revokeSessionDto.sessionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke-all')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke all sessions',
    description: 'Revokes all sessions except the current one (logout from all devices)',
  })
  @ApiResponse({
    status: 200,
    description: 'All sessions revoked successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        revokedCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeAllSessions(
    @Request() req: RequestWithUser,
  ): Promise<{ message: string; revokedCount: number }> {
    // Get current session from token
    const currentToken = req.headers?.authorization?.replace('Bearer ', '') || '';
    return this.revokeAllSessionsUseCase.execute(req.user.id, currentToken);
  }
}

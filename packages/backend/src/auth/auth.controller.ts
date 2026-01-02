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
} from './dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterUseCase } from './application/register.usecase';
import { LoginUseCase } from './application/login.usecase';
import { RefreshTokenUseCase } from './application/refresh-token.usecase';
import { UpdateStatusUseCase } from './application/update-status.usecase';
import { AuthUser } from './domain/authentication.entity';

interface RequestWithUser {
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
}

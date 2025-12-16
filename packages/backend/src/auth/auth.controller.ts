import { Controller, Post, UseGuards, Request, Body, HttpCode, HttpStatus, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UserEntity } from '../entities/user.entity';
import { AgentStatus } from '@psynq/core';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@Request() req): Promise<{ status: AgentStatus }> {
    const userId = req.user.userId;
    const status = await this.authService.getUserStatus(userId);
    return { status };
  }

  @UseGuards(JwtAuthGuard)
  @Post('status')
  async updateStatus(@Request() req, @Body() updateStatusDto: UpdateStatusDto): Promise<UserEntity> {
    const userId = req.user.userId;
    return await this.authService.updateStatus(userId, updateStatusDto.status);
  }
}

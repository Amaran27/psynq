import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from './domain/user.domain';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  AssignRolesDto,
  UpdateAgentStatusDto,
  QueryUsersDto,
  UserResponseDto,
  UserListResponseDto,
  UserCreatedResponseDto,
} from './user.dto';

// Import Use Cases (Application layer)
import { CreateUserUseCase } from './application/create-user.usecase';
import { GetUserUseCase } from './application/get-user.usecase';
import { ListUsersUseCase } from './application/list-users.usecase';
import { UpdateUserUseCase } from './application/update-user.usecase';
import { UpdateUserStatusUseCase } from './application/update-user-status.usecase';
import { ChangePasswordUseCase } from './application/change-password.usecase';
import { AssignRolesUseCase } from './application/assign-roles.usecase';
import { DeleteUserUseCase } from './application/delete-user.usecase';
import { User } from './domain/user.domain';

/**
 * User Controller (Hexagonal Architecture)
 *
 * THIN CONTROLLER - only HTTP concerns (routing, validation, serialization)
 * Business logic lives in Use Cases (Application layer)
 * Domain logic lives in Domain entities
 *
 * Flow: HTTP Request → Controller → Use Case → Domain/Repository → Response
 */
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
@Roles(UserRole.ADMIN, UserRole.SYSTEM_ADMIN)
export class UserController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly updateUserStatusUseCase: UpdateUserStatusUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly assignRolesUseCase: AssignRolesUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserCreatedResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 409,
    description: 'User with email or username already exists',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<UserCreatedResponseDto> {
    const user = await this.createUserUseCase.execute(createUserDto);

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get paginated list of users with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: UserListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  async findAll(@Query() query: QueryUsersDto): Promise<UserListResponseDto> {
    const result = await this.listUsersUseCase.execute({
      search: query.search,
      roles: query.roles,
      status: query.status,
      organizationId: query.organizationId,
      page: query.page ? parseInt(query.page) : 1,
      limit: query.limit ? parseInt(query.limit) : 20,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'DESC',
    });

    return {
      data: result.data.map(this.toResponseDto),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available agents' })
  @ApiResponse({
    status: 200,
    description: 'Available agents retrieved',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAvailableAgents(): Promise<UserResponseDto[]> {
    const users = await this.listUsersUseCase.findAvailableAgents();
    return users.map(this.toResponseDto);
  }

  @Get('by-role/:role')
  @ApiOperation({ summary: 'Get users by role' })
  @ApiParam({
    name: 'role',
    enum: UserRole,
    description: 'User role to filter by',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: [UserResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByRole(@Param('role') role: UserRole): Promise<UserResponseDto[]> {
    const users = await this.listUsersUseCase.findByRole(role);
    return users.map(this.toResponseDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.getUserUseCase.execute(id);
    return this.toResponseDto(user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user details' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.updateUserUseCase.execute(id, updateUserDto);
    return this.toResponseDto(user);
  }

  @Put(':id/password')
  @ApiOperation({ summary: 'Change user password' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.changePasswordUseCase.execute(
      id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
    return { message: 'Password changed successfully' };
  }

  @Put(':id/roles')
  @ApiOperation({ summary: 'Assign roles to user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Roles assigned successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid roles' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async assignRoles(
    @Param('id') id: string,
    @Body() assignRolesDto: AssignRolesDto,
  ): Promise<UserResponseDto> {
    const user = await this.assignRolesUseCase.execute(
      id,
      assignRolesDto.roles,
      assignRolesDto.primaryRole,
    );
    return this.toResponseDto(user);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update agent status' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateAgentStatusDto,
  ): Promise<UserResponseDto> {
    const user = await this.updateUserStatusUseCase.execute(
      id,
      updateStatusDto.status,
    );
    return this.toResponseDto(user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.deleteUserUseCase.execute(id);
    return { message: 'User deleted successfully' };
  }

  /**
   * Helper to convert domain User to Response DTO
   * Maps internal domain model to external API response
   */
  private toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || undefined,
      roles: user.roles,
      primaryRole: user.primaryRole || undefined,
      status: user.status,
      skills: user.skills,
      organizationId: user.organizationId || undefined,
      lastStatusChangedAt: user.lastStatusChangedAt || user.createdAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

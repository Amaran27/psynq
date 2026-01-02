import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity';

// Controller
import { UserController } from './user.controller';

// Ports (interfaces)
import {
  IUserRepository,
  IPasswordService,
} from './ports/user-repository.port';

// Adapters (implementations)
import { TypeOrmUserRepository } from './adapters/typeorm-user-repository.adapter';
import { BcryptPasswordService } from './adapters/bcrypt-password.adapter';

// Application (use cases)
import { CreateUserUseCase } from './application/create-user.usecase';
import { GetUserUseCase } from './application/get-user.usecase';
import { ListUsersUseCase } from './application/list-users.usecase';
import { UpdateUserUseCase } from './application/update-user.usecase';
import { UpdateUserStatusUseCase } from './application/update-user-status.usecase';
import { ChangePasswordUseCase } from './application/change-password.usecase';
import { AssignRolesUseCase } from './application/assign-roles.usecase';
import { DeleteUserUseCase } from './application/delete-user.usecase';

/**
 * User Module (Hexagonal Architecture)
 *
 * Wires together:
 * - Domain (pure TypeScript entities)
 * - Ports (interfaces)
 * - Adapters (TypeORM, Bcrypt implementations)
 * - Application (use cases)
 * - Controller (HTTP layer)
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UserController],
  providers: [
    // Bind ports to adapters
    {
      provide: 'IUserRepository',
      useClass: TypeOrmUserRepository,
    },
    {
      provide: 'IPasswordService',
      useClass: BcryptPasswordService,
    },
    // Register use cases
    CreateUserUseCase,
    GetUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    UpdateUserStatusUseCase,
    ChangePasswordUseCase,
    AssignRolesUseCase,
    DeleteUserUseCase,
  ],
  exports: [
    // Export use cases for other modules
    CreateUserUseCase,
    GetUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
  ],
})
export class UserModule {}

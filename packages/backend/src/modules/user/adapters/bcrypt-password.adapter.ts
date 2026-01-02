import { Injectable } from '@nestjs/common';
import { hash, compare, genSalt } from 'bcrypt';
import { IPasswordService } from '../ports/user-repository.port';

/**
 * Bcrypt Password Service Adapter
 *
 * This is an ADAPTER in hexagonal architecture.
 * It implements the IPasswordService port using bcrypt.
 *
 * Framework/library-specific code lives HERE, not in domain.
 */
@Injectable()
export class BcryptPasswordService implements IPasswordService {
  private readonly saltRounds = 10;

  async hash(password: string): Promise<string> {
    const salt = await genSalt(this.saltRounds);
    return await hash(password, salt);
  }

  async compare(password: string, hashedPassword: string): Promise<boolean> {
    return await compare(password, hashedPassword);
  }
}

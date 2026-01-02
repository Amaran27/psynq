import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

export interface RequestContext {
  organizationId: string;
  userId: string;
  roles: string[];
}

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user) {
      request.context = {
        organizationId: user.organizationId,
        userId: user.userId,
        roles: user.roles,
      };
    }

    return next.handle();
  }
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PsynqException } from '../exceptions/psynq.exception';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorCode = 'INTERNAL_ERROR';

    if (exception instanceof PsynqException) {
      status = exception.statusCode;
      message = exception.message;
      errorCode = exception.name;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        typeof res === 'string'
          ? res
          : (res as any).message || exception.message;
      errorCode = (res as any).error || 'HTTP_ERROR';
    } else if (exception instanceof Error) {
      message = exception.message;
      errorCode = exception.name;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} failed: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} rejected: ${message}`);
    }

    response.status(status).json({
      statusCode: status,
      errorCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorMessage =
      typeof message === 'string'
        ? message
        : (message as any).message || 'Unknown error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : exception,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${errorMessage}`,
      );
    }

    response.status(status).json(errorResponse);
  }
}

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const rawResponse =
      exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const normalized = this.normalizeResponse(status, rawResponse);

    this.logger.error(
      `HTTP ${status} Error on ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(normalized.code ? { code: normalized.code } : {}),
      message: normalized.message
    });
  }

  private normalizeResponse(
    status: number,
    rawResponse: string | { message?: unknown; code?: unknown }
  ): { message: unknown; code?: string } {
    if (typeof rawResponse === 'string') {
      return {
        message: rawResponse
      };
    }

    const code = typeof rawResponse.code === 'string' ? rawResponse.code : undefined;
    const message = rawResponse.message ?? rawResponse;

    if (status === HttpStatus.BAD_REQUEST && Array.isArray(message)) {
      return {
        message,
        code: code ?? 'VALIDATION_ERROR'
      };
    }

    return {
      message,
      code
    };
  }
}

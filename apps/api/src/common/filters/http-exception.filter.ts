import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Shape of the standardized API error response.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

/**
 * Global exception filter that catches all exceptions and returns a consistent
 * error response format:
 * {
 *   success: false,
 *   error: {
 *     code: <HTTP status code>,
 *     message: <error message>,
 *     details: <validation errors or additional info>
 *   },
 *   timestamp: <ISO 8601 timestamp>
 * }
 *
 * For HttpExceptions, the original status code and message are preserved.
 * For unexpected errors, a generic 500 Internal Server Error is returned
 * (the actual error details are logged but not exposed to clients for security).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message =
          (responseObj.message as string) ||
          (Array.isArray(responseObj.message)
            ? (responseObj.message as string[]).join('; ')
            : exception.message);

        // Extract validation errors from class-validator
        if (Array.isArray(responseObj.message)) {
          details = responseObj.message;
          message = 'Validation failed';
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';

      // Log the full error for debugging, but don't expose to client
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';

      this.logger.error(
        `Unknown exception type on ${request.method} ${request.url}`,
        String(exception),
      );
    }

    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        code: status,
        message,
        ...(details !== undefined && { details }),
      },
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}

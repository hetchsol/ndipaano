import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Interceptor that logs every API call to the AuditLog table.
 * Runs AFTER the handler completes (using the tap operator) so it does not
 * add latency to the response. Audit log creation failures are caught and
 * logged to avoid disrupting the actual request flow.
 *
 * Captures:
 *  - userId: from the authenticated user (null for public endpoints)
 *  - action: HTTP method + path (e.g., "POST /auth/login")
 *  - resourceType: the controller class name (e.g., "AuthController")
 *  - resourceId: extracted from route params.id (if present)
 *  - ipAddress: client IP address
 *  - userAgent: client User-Agent header
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const controllerName = context.getClass().name;
    const handlerName = context.getHandler().name;

    const method = request.method;
    const url = request.url;
    const userId = request.user?.id || null;
    const resourceId = request.params?.id || null;
    const ipAddress =
      request.headers['x-forwarded-for'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown';
    const userAgent = request.headers['user-agent'] || 'unknown';

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = response.statusCode;

          this.prisma.auditLog
            .create({
              data: {
                userId,
                action: `${method} ${url}`,
                resourceType: controllerName,
                resourceId,
                details: {
                  handler: handlerName,
                  statusCode,
                  timestamp: new Date().toISOString(),
                },
                ipAddress:
                  typeof ipAddress === 'string'
                    ? ipAddress
                    : Array.isArray(ipAddress)
                      ? ipAddress[0]
                      : 'unknown',
                userAgent,
              },
            })
            .catch((error: Error) => {
              this.logger.error(
                `Failed to create audit log entry: ${error.message}`,
                error.stack,
              );
            });
        },
        error: (error: Error) => {
          this.prisma.auditLog
            .create({
              data: {
                userId,
                action: `${method} ${url}`,
                resourceType: controllerName,
                resourceId,
                details: {
                  handler: handlerName,
                  error: error.message,
                  timestamp: new Date().toISOString(),
                },
                ipAddress:
                  typeof ipAddress === 'string'
                    ? ipAddress
                    : Array.isArray(ipAddress)
                      ? ipAddress[0]
                      : 'unknown',
                userAgent,
              },
            })
            .catch((auditError: Error) => {
              this.logger.error(
                `Failed to create audit log entry for error: ${auditError.message}`,
                auditError.stack,
              );
            });
        },
      }),
    );
  }
}

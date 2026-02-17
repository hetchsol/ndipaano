import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Shape of the standardized API response envelope.
 */
export interface ApiResponseEnvelope<T> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * Interceptor that wraps all successful responses in a consistent envelope:
 * {
 *   success: true,
 *   data: <handler response>,
 *   timestamp: <ISO 8601 timestamp>
 * }
 *
 * This ensures a uniform response format across the entire API, making it
 * easier for frontend clients to handle responses consistently.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponseEnvelope<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponseEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}

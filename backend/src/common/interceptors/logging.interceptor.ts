import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, params, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const requestId = uuidv4();
    const userId = request.user?.id || 'anonymous';

    // 记录请求
    request.requestId = requestId;
    const startTime = Date.now();

    this.logger.log(
      `[${requestId}] ${method} ${url} - User: ${userId} - IP: ${ip}`,
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          this.logger.log(
            `[${requestId}] ${method} ${url} - ${responseTime}ms - Status: 200`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `[${requestId}] ${method} ${url} - ${responseTime}ms - Error: ${error.message}`,
          );
        },
      }),
    );
  }
}

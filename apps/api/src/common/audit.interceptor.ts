import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = req.user;
    if (!user?.tenantId) return next.handle();

    const path: string = req.route?.path || req.url;
    const entity = path.split('/').filter(Boolean)[1] || 'unknown';

    return next.handle().pipe(
      tap(() => {
        this.audit
          .log({
            tenantId: user.tenantId,
            userId: user.id,
            userEmail: user.email,
            action: `${method} ${path}`,
            entity,
            entityId: req.params?.id,
            meta: { body: sanitizeBody(req.body) },
          })
          .catch(() => {});
      }),
    );
  }
}

function sanitizeBody(body: Record<string, unknown> | undefined) {
  if (!body || typeof body !== 'object') return undefined;
  const copy = { ...body };
  for (const key of ['password', 'portalPassword', 'newPassword']) {
    if (key in copy) copy[key] = '***';
  }
  return copy;
}

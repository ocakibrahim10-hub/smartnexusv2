import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, TENANT_TYPES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredTypes = this.reflector.getAllAndOverride<string[]>(TENANT_TYPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length && !requiredTypes?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return true;

    if (requiredTypes?.length && !requiredTypes.includes(user.tenantType)) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmuyor');
    }

    if (requiredRoles?.length && !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Bu işlem için yetkiniz bulunmuyor');
    }

    return true;
  }
}

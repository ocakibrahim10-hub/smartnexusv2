import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULES_KEY } from '../decorators/require-module.decorator';
import { hasModuleAccess } from '../module-catalog';

@Injectable()
export class ModuleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredModules = this.reflector.getAllAndOverride<string[]>(MODULES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModules?.length) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) return true; // Let AuthGuard handle unauthenticated users

    // SuperAdmin can access everything
    if (user.tenantType === 'SUPERADMIN') return true;

    // Check if user's effective modules array contains any of the required modules
    // Required modules are usually treated as "OR" (if any is required, user must have at least one)
    // Or we can treat them as "AND" depending on use case. Let's do AND for safety.
    const userModules = user.modules || [];
    
    const hasAccess = requiredModules.every(reqMod => hasModuleAccess(userModules, reqMod));

    if (!hasAccess) {
      throw new ForbiddenException('ADDON_REQUIRED: Bu işlem için ilgili eklentiyi satın almalısınız.');
    }

    return true;
  }
}

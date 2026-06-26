import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class DemoGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Only block DELETE requests
    if (request.method !== 'DELETE') {
      return true;
    }

    // Check if the user's tenant is a demo tenant
    const user = request.user;
    if (user && user.tenantId) {
      const demoTenants = ['ten-root', 'ten-b1', 'ten-d1', 'demo-tenant-1', 'demo-tenant-2'];
      
      if (demoTenants.includes(user.tenantId) || process.env.IS_DEMO === 'true') {
        throw new ForbiddenException('Demo ortamında kayıt silinemez. (Demo Koruması)');
      }
    }

    return true;
  }
}

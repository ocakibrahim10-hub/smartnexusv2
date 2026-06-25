import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const TENANT_TYPES_KEY = 'tenantTypes';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
export const TenantTypes = (...types: string[]) => SetMetadata(TENANT_TYPES_KEY, types);

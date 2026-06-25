import { getEffectiveModules, type TenantLike } from './effective-modules';
import { canManageUsers, resolveUserModulePermissions } from './role-permissions';

type UserLike = {
  role: string;
  permissions?: string[] | null;
};

export function getEffectiveUserModules(tenant: TenantLike, user: UserLike): string[] {
  const tenantModules = getEffectiveModules(tenant);
  let modules = resolveUserModulePermissions(user.role, user.permissions, tenantModules);
  if (canManageUsers(user.role) && ['BUSINESS', 'BRANCH', 'DEALER'].includes(tenant.type)) {
    modules = [...new Set([...modules, 'DEALER.USERS'])];
  }
  return modules;
}

export function buildAuthUserPayload(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[] | null;
  tenantId: string;
  avatarUrl?: string | null;
  tenant: TenantLike & { 
    name: string; 
    type: string; 
    plan: string;
    subscription?: { endDate: Date } | null;
    parent?: { subscription?: { endDate: Date } | null } | null;
  };
}) {
  const modules = getEffectiveUserModules(user.tenant, user);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    permissions: user.permissions ?? [],
    tenantId: user.tenantId,
    tenantType: user.tenant.type,
    tenantName: user.tenant.name,
    tenantPlan: user.tenant.plan,
    modules,
    avatarUrl: user.avatarUrl,
    subscriptionEndDate: user.tenant.subscription?.endDate,
    parentSubscriptionEndDate: user.tenant.parent?.subscription?.endDate,
  };
}

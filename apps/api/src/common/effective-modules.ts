import { ALL_SUBMODULE_IDS, DEALER_DEFAULT_MODULES, expandLegacyModules } from './module-catalog';
import { mergeAddonModules } from './addon-module-map';
import { AddonModuleCode } from '@prisma/client';

type SubscriptionLike = {
  modules?: string[] | null;
  purchasedAddons?: AddonModuleCode[] | null;
} | null | undefined;
export type TenantLike = {
  type: string;
  subscription?: SubscriptionLike;
  parent?: { subscription?: SubscriptionLike } | null;
};

export function getEffectiveModules(tenant: TenantLike): string[] {
  if (tenant.type === 'SUPERADMIN') {
    return ALL_SUBMODULE_IDS;
  }

  if (tenant.type === 'DEALER') {
    return expandLegacyModules(tenant.subscription?.modules ?? DEALER_DEFAULT_MODULES);
  }

  if (tenant.type === 'BRANCH') {
    const merged = mergeAddonModules(
      [
        ...(tenant.parent?.subscription?.modules ?? []),
        ...(tenant.subscription?.modules ?? []),
      ],
      [
        ...(tenant.parent?.subscription?.purchasedAddons ?? []),
        ...(tenant.subscription?.purchasedAddons ?? []),
      ],
    );
    return expandLegacyModules(merged);
  }

  const withAddons = mergeAddonModules(
    tenant.subscription?.modules ?? [],
    tenant.subscription?.purchasedAddons ?? [],
  );
  return expandLegacyModules(withAddons);
}

import { PLAN_ORDER } from './plans';

export type BillingMode = 'new' | 'upgrade' | 'renewal';

export type ExtensionOption = {
  months: number;
  label: string;
  includeAnnualRenewal: boolean;
};

export function detectBillingMode(
  status: { plan?: string; isActive?: boolean; remainingDays?: number } | null | undefined,
  selectedPlan: string,
): BillingMode {
  if (!status?.isActive || (status.remainingDays ?? 0) <= 0) return 'new';
  const cur = PLAN_ORDER.indexOf(status.plan as (typeof PLAN_ORDER)[number]);
  const next = PLAN_ORDER.indexOf(selectedPlan as (typeof PLAN_ORDER)[number]);
  if (next > cur) return 'upgrade';
  return 'renewal';
}

export function extensionOptionsForMode(mode: BillingMode): ExtensionOption[] {
  if (mode === 'upgrade') {
    return [
      { months: 0, label: 'Sadece yükseltme', includeAnnualRenewal: false },
      { months: 1, label: '1 ay ek', includeAnnualRenewal: false },
      { months: 3, label: '3 ay ek', includeAnnualRenewal: false },
      { months: 6, label: '6 ay ek', includeAnnualRenewal: false },
      { months: 12, label: '12 ay ek', includeAnnualRenewal: false },
    ];
  }
  return [
    { months: 0, label: '1 yıllık lisans', includeAnnualRenewal: true },
    { months: 1, label: '1 ay ek', includeAnnualRenewal: true },
    { months: 3, label: '3 ay ek', includeAnnualRenewal: true },
    { months: 6, label: '6 ay ek', includeAnnualRenewal: true },
    { months: 12, label: '12 ay ek', includeAnnualRenewal: true },
  ];
}

export function formatShortDate(iso: string | Date | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

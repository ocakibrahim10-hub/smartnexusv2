import type { ReactNode } from 'react';

export type Platform =
  | 'TRENDYOL'
  | 'HEPSIBURADA'
  | 'AMAZON_TR'
  | 'N11'
  | 'PTTAVM'
  | 'CICEKSEPETI'
  | 'PAZARAMA';

export const PLATFORM_LOGO: Record<Platform, string> = {
  TRENDYOL: 'TY',
  HEPSIBURADA: 'HB',
  AMAZON_TR: 'AZ',
  N11: 'N11',
  PTTAVM: 'PTT',
  CICEKSEPETI: 'ÇS',
  PAZARAMA: 'PZ',
};

export const PLATFORM_NAME: Record<Platform, string> = {
  TRENDYOL: 'Trendyol',
  HEPSIBURADA: 'Hepsiburada',
  AMAZON_TR: 'Amazon TR',
  N11: 'n11',
  PTTAVM: 'PttAVM',
  CICEKSEPETI: 'ÇiçekSepeti',
  PAZARAMA: 'Pazarama',
};

const LOGO_SIZE_CLASS = {
  sm: 'platform-logo platform-logo--sm',
  md: 'platform-logo platform-logo--md',
  lg: 'platform-logo platform-logo--lg',
  xl: 'platform-logo platform-logo--xl',
} as const;

export function PlatformLogo({
  platform,
  size = 'lg',
}: {
  platform: Platform;
  size?: keyof typeof LOGO_SIZE_CLASS;
}) {
  return (
    <div className={LOGO_SIZE_CLASS[size]} data-platform={platform}>
      {PLATFORM_LOGO[platform]}
    </div>
  );
}

export const platformCardBorderClass: Record<Platform, string> = {
  TRENDYOL: 'border-orange-300',
  HEPSIBURADA: 'border-orange-400',
  AMAZON_TR: 'border-amber-400',
  N11: 'border-purple-400',
  PTTAVM: 'border-red-300',
  CICEKSEPETI: 'border-pink-400',
  PAZARAMA: 'border-blue-400',
};

export const platformFilterActiveClass: Record<Platform | 'ALL', string> = {
  ALL: 'bg-indigo-100 text-indigo-700',
  TRENDYOL: 'bg-orange-100 text-orange-700',
  HEPSIBURADA: 'bg-orange-100 text-orange-600',
  AMAZON_TR: 'bg-amber-100 text-amber-700',
  N11: 'bg-purple-100 text-purple-700',
  PTTAVM: 'bg-red-100 text-red-700',
  CICEKSEPETI: 'bg-pink-100 text-pink-700',
  PAZARAMA: 'bg-blue-100 text-blue-700',
};

export const orderStatusBadgeClass: Record<string, string> = {
  Yeni: 'badge-info',
  Hazırlanıyor: 'badge-warning',
  Kargoda: 'badge-info',
  'Teslim Edildi': 'badge-success',
  İptal: 'badge-error',
};

export function OrderStatusBadge({ status }: { status: string }) {
  const cls = orderStatusBadgeClass[status] ?? 'badge';
  return <span className={cls}>{status}</span>;
}

export const KPI_ICON_STYLES: Record<string, { bg: string; text: string }> = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-500' },
  green: { bg: 'bg-emerald-50', text: 'text-emerald-500' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-500' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-500' },
};

export function KpiIconBox({
  children,
  tone,
}: {
  children: ReactNode;
  tone: keyof typeof KPI_ICON_STYLES;
}) {
  const s = KPI_ICON_STYLES[tone];
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.bg}`}>
      <span className={s.text}>{children}</span>
    </div>
  );
}

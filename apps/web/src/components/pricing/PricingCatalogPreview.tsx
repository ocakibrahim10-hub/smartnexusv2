import PricingPlanCards, { type PricingAddon, type PricingPlan } from '@/components/PricingPlanCards';
import KontorPackagesSection from '@/components/pricing/KontorPackagesSection';

type KontorModule = {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  kontorPackages?: Array<{ id: string; name: string; totalPrice: number }>;
};

type Props = {
  plans: PricingPlan[];
  addons?: PricingAddon[];
  kontorModules?: KontorModule[];
  showCta?: boolean;
  ctaHref?: string;
  compact?: boolean;
  kontorLoginHref?: string;
};

/** Fiyatlandırma sayfası ve admin önizlemesi için ortak görünüm */
export default function PricingCatalogPreview({
  plans,
  addons = [],
  kontorModules = [],
  showCta = false,
  ctaHref = '/kayit',
  compact = false,
  kontorLoginHref = '/',
}: Props) {
  return (
    <>
      <PricingPlanCards
        plans={plans}
        addons={addons}
        showCta={showCta}
        ctaHref={ctaHref}
        compact={compact}
      />
      <KontorPackagesSection
        modules={kontorModules}
        showLoginCta={showCta}
        loginHref={kontorLoginHref}
      />
    </>
  );
}

import PricingPlanCards, { type PricingPlan } from '@/components/PricingPlanCards';
import KontorPackagesSection from '@/components/pricing/KontorPackagesSection';
import ExtraModulesCatalogSection from '@/components/pricing/ExtraModulesCatalogSection';

type KontorModule = {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  kontorPackages?: Array<{ id: string; name: string; totalPrice: number }>;
};

type Props = {
  pricing: {
    plans?: PricingPlan[];
    kontorModules?: KontorModule[];
    submodulePricing?: Array<{
      moduleId: string;
      yearlyPrice: number;
      label?: string;
      sellableExtra?: boolean;
      isActive?: boolean;
    }>;
  } | null;
  selectedPlan?: string;
  onPlanChange?: (plan: string) => void;
  extraCart?: string[];
  onToggleExtraCart?: (moduleId: string) => void;
  showCta?: boolean;
  ctaHref?: string;
  compact?: boolean;
  kontorLoginHref?: string;
  extraCheckoutHref?: string;
  extraCheckoutLabel?: string;
  showProrataHint?: boolean;
  remainingDays?: number;
  prorataPrices?: Record<string, number>;
};

/** Fiyatlandırma sayfası ve admin önizlemesi için ortak görünüm */
export default function PricingCatalogPreview({
  pricing,
  selectedPlan = 'BASIC',
  onPlanChange,
  extraCart = [],
  onToggleExtraCart,
  showCta = false,
  ctaHref = '/kayit',
  compact = false,
  kontorLoginHref = '/',
  extraCheckoutHref,
  extraCheckoutLabel,
  showProrataHint,
  remainingDays,
  prorataPrices,
}: Props) {
  const plans = pricing?.plans ?? [];
  const kontorModules = pricing?.kontorModules ?? [];

  return (
    <>
      <PricingPlanCards
        plans={plans}
        showCta={showCta}
        ctaHref={ctaHref}
        compact={compact}
      />

      {onToggleExtraCart && (
        <ExtraModulesCatalogSection
          pricing={pricing}
          selectedPlan={selectedPlan}
          onPlanChange={onPlanChange}
          cart={extraCart}
          onToggleCart={onToggleExtraCart}
          showProrataHint={showProrataHint}
          remainingDays={remainingDays}
          prorataPrices={prorataPrices}
          checkoutHref={extraCheckoutHref}
          checkoutLabel={extraCheckoutLabel}
          loginHref={showCta ? kontorLoginHref : undefined}
        />
      )}

      <KontorPackagesSection
        modules={kontorModules}
        showLoginCta={showCta}
        loginHref={kontorLoginHref}
      />
    </>
  );
}

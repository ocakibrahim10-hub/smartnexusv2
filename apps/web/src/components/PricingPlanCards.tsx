'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { fmtMoney } from '@/lib/format';
import { PLAN_META, PLAN_ORDER, planLabel } from '@/lib/plans';
import { applyDiscount } from '@/lib/pricing';
import { resolvePricingModuleLabels } from '@/lib/pricing-module-labels';

export type PricingPlan = {
  plan: string;
  price: number;
  listPrice?: number;
  finalPrice?: number;
  discountPercent?: number;
  description?: string;
  modules?: string[];
  moduleLabels?: string[];
  maxBranches?: number;
  displayMode?: 'grouped' | 'listed';
};

export type PricingAddon = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  basePrice?: number | null;
  listPrice?: number;
  finalPrice?: number;
  discountPercent?: number;
};

type Props = {
  plans: PricingPlan[];
  showCta?: boolean;
  ctaHref?: string;
  compact?: boolean;
};

const INITIAL_FEATURES = 5;

function PlanFeatureList({ labels }: { labels: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = labels.length > INITIAL_FEATURES;
  const visible = expanded ? labels : labels.slice(0, INITIAL_FEATURES);
  const hiddenCount = labels.length - INITIAL_FEATURES;

  return (
    <div
      className={`pricing-features-box ${hasMore && !expanded ? 'pricing-features-box--collapsed' : ''}`}
    >
      <p className="text-[11px] font-semibold text-[#777680] uppercase tracking-wide mb-2">
        Dahil özellikler
      </p>
      <ul className="space-y-1">
        {visible.map((label, i) => (
          <li key={`${label}-${i}`} className="flex items-start gap-2 text-sm text-[#1B1B1F] leading-snug">
            <Check className="w-3.5 h-3.5 text-[#606BDF] shrink-0 mt-0.5" />
            <span>{label}</span>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#606BDF] hover:text-[#4f59c4] transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Daha az göster
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              {hiddenCount} özellik daha göster
            </>
          )}
        </button>
      ) : (
        labels.length > 0 && (
          <p className="mt-2 text-[11px] text-[#777680]">{labels.length} özellik dahil</p>
        )
      )}
    </div>
  );
}

export default function PricingPlanCards({
  plans,
  showCta = false,
  ctaHref = '/',
  compact = false,
}: Props) {
  const ordered = PLAN_ORDER.map((key) => plans.find((p) => p.plan === key)).filter(Boolean) as PricingPlan[];

  return (
    <div className="space-y-10">
      <div className={`grid gap-4 items-start ${compact ? 'md:grid-cols-3' : 'lg:grid-cols-3'}`}>
        {ordered.map((p) => {
          const meta = PLAN_META[p.plan] || { label: planLabel(p.plan), tagline: '', color: 'border-gray-200' };
          const labels = resolvePricingModuleLabels(p);
          const pricing = applyDiscount(p.listPrice ?? p.price, p.discountPercent ?? 0);
          const hasDiscount = pricing.discountPercent > 0;

          return (
            <div key={p.plan} className={`card pricing-plan-card ${meta.color}`}>
              {meta.badge && (
                <span className="absolute -top-3 right-4 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#606BDF] text-white flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {meta.badge}
                </span>
              )}
              <h3 className="text-base font-bold text-[#1B1B1F]">{meta.label}</h3>
              <p className="text-xs text-[#777680] mt-0.5 mb-2 line-clamp-2">
                {p.description || meta.tagline}
              </p>
              <div className="mb-1">
                {hasDiscount && (
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-gray-400 line-through">{fmtMoney(pricing.listPrice)}</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      %{pricing.discountPercent} indirim
                    </span>
                  </div>
                )}
                <div className="text-xl font-bold text-[#1B1B1F]">
                  {fmtMoney(pricing.finalPrice)}
                  <span className="text-xs font-normal text-[#777680]"> / yıl</span>
                </div>
              </div>

              <PlanFeatureList labels={labels} />

              {showCta && (
                <Link
                  href={ctaHref.includes('?') ? ctaHref : `${ctaHref}?plan=${p.plan}`}
                  className="mt-3 block text-center py-2 rounded-xl text-white text-sm font-medium bg-[#606BDF] hover:opacity-90 transition-opacity"
                >
                  Planı Seç
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

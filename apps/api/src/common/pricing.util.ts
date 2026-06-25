export type PriceBreakdown = {
  listPrice: number;
  discountPercent: number;
  finalPrice: number;
  discountAmount: number;
};

export function applyDiscount(listPrice: number, discountPercent = 0): PriceBreakdown {
  const price = Math.max(0, listPrice || 0);
  const pct = Math.min(100, Math.max(0, discountPercent || 0));
  const discountAmount = Math.round(price * (pct / 100) * 100) / 100;
  const finalPrice = Math.round((price - discountAmount) * 100) / 100;
  return { listPrice: price, discountPercent: pct, finalPrice, discountAmount };
}

export function subscriptionRemainingDays(endDate: Date | string): number {
  const end = new Date(endDate);
  const diff = end.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export function annualDailyRate(annualTotal: number): number {
  return annualTotal / 365;
}

/** Ek süre: günlük prorata (30 gün / ay) */
export function calculateProratedExtension(annualTotal: number, extensionMonths: number): number {
  if (extensionMonths <= 0 || annualTotal <= 0) return 0;
  const extensionDays = extensionMonths * 30;
  return Math.round(annualDailyRate(annualTotal) * extensionDays * 100) / 100;
}

export function calculateProratedUpgrade(
  currentAnnualTotal: number,
  newAnnualTotal: number,
  remainingDays: number,
): number {
  if (remainingDays <= 0 || newAnnualTotal <= currentAnnualTotal) {
    return 0;
  }
  const diff = newAnnualTotal - currentAnnualTotal;
  return Math.round(annualDailyRate(diff) * remainingDays * 100) / 100;
}

export type SubscriptionQuoteInput = {
  billingMode: 'new' | 'upgrade' | 'renewal';
  includeAnnualRenewal: boolean;
  extensionMonths: number;
  newAnnualTotal: number;
  currentAnnualTotal: number;
  remainingDays: number;
};

export type SubscriptionQuoteBreakdown = {
  annualRenewalAmount: number;
  proratedAmount: number;
  extensionAmount: number;
  planCharge: number;
  totalAmount: number;
};

export function buildSubscriptionQuoteBreakdown(
  input: SubscriptionQuoteInput,
): SubscriptionQuoteBreakdown {
  const {
    billingMode,
    includeAnnualRenewal,
    extensionMonths,
    newAnnualTotal,
    currentAnnualTotal,
    remainingDays,
  } = input;

  const hasActive = remainingDays > 0;

  const proratedAmount =
    hasActive && newAnnualTotal > currentAnnualTotal
      ? calculateProratedUpgrade(currentAnnualTotal, newAnnualTotal, remainingDays)
      : 0;

  const extensionAmount = calculateProratedExtension(newAnnualTotal, extensionMonths);

  const annualRenewalAmount =
    includeAnnualRenewal && billingMode !== 'upgrade' ? newAnnualTotal : 0;

  let planCharge = 0;
  if (billingMode === 'upgrade') {
    planCharge = proratedAmount;
  } else if (billingMode === 'renewal') {
    planCharge = annualRenewalAmount + proratedAmount;
  } else {
    planCharge = annualRenewalAmount;
  }

  const totalAmount = Math.round((planCharge + extensionAmount) * 100) / 100;

  return {
    annualRenewalAmount,
    proratedAmount,
    extensionAmount,
    planCharge,
    totalAmount,
  };
}

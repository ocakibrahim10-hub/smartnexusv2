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

export function calculateProratedUpgrade(
  currentPlanPrice: number,
  newPlanPrice: number,
  remainingDays: number,
): number {
  if (remainingDays <= 0 || newPlanPrice <= currentPlanPrice) {
    return 0;
  }
  const diff = newPlanPrice - currentPlanPrice;
  return Math.round((diff / 365) * remainingDays * 100) / 100;
}

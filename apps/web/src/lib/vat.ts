export const VAT_RATE = 20;

export function vatBreakdown(exVat: number) {
  const subtotalExVat = Math.round(exVat * 100) / 100;
  const vatAmount = Math.round((subtotalExVat * VAT_RATE) / 100 * 100) / 100;
  const totalInclVat = Math.round((subtotalExVat + vatAmount) * 100) / 100;
  return { subtotalExVat, vatAmount, totalInclVat };
}

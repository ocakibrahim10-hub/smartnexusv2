export type ProductUnitLike = {
  unit: string;
  factorToBase: number;
  isPurchaseUnit?: boolean;
  isSaleUnit?: boolean;
};

export const UNIT_LABELS: Record<string, string> = {
  ADET: 'Adet',
  KOLI: 'Koli',
  KUTU: 'Kutu',
  KG: 'kg',
  GR: 'gr',
  TON: 'Ton',
  PIECE: 'Adet',
  PACKAGE: 'Paket',
};

/** Kütle birimleri arası global dönüşüm (hedef: temel birim) */
const WEIGHT_TO_KG: Record<string, number> = {
  KG: 1,
  GR: 0.001,
  TON: 1000,
};

const WEIGHT_TO_GR: Record<string, number> = {
  GR: 1,
  KG: 1000,
  TON: 1_000_000,
};

export function normalizeUnit(unit: string): string {
  const u = unit.toUpperCase().trim();
  if (u === 'PIECE') return 'ADET';
  if (u === 'PACKAGE') return 'ADET';
  return u;
}

export function isWeightBase(baseUnit: string): boolean {
  const b = normalizeUnit(baseUnit);
  return b === 'KG' || b === 'GR';
}

/** Satış/giriş birimini temel birime çevir */
export function convertToBaseUnit(
  quantity: number,
  fromUnit: string,
  baseUnit: string,
  productUnits: ProductUnitLike[] = [],
): number {
  const from = normalizeUnit(fromUnit);
  const base = normalizeUnit(baseUnit);
  if (from === base) return quantity;

  const custom = productUnits.find((u) => normalizeUnit(u.unit) === from);
  if (custom) return quantity * custom.factorToBase;

  if (isWeightBase(base)) {
    const table = base === 'GR' ? WEIGHT_TO_GR : WEIGHT_TO_KG;
    const fromFactor = table[from];
    const baseFactor = table[base];
    if (fromFactor != null && baseFactor != null) {
      return (quantity * fromFactor) / baseFactor;
    }
  }

  throw new Error(`"${from}" biriminden "${base}" birimine dönüşüm tanımlı değil`);
}

/** Temel birimden başka birime çevir */
export function convertFromBaseUnit(
  baseQuantity: number,
  toUnit: string,
  baseUnit: string,
  productUnits: ProductUnitLike[] = [],
): number {
  const to = normalizeUnit(toUnit);
  const base = normalizeUnit(baseUnit);
  if (to === base) return baseQuantity;

  const custom = productUnits.find((u) => normalizeUnit(u.unit) === to);
  if (custom && custom.factorToBase > 0) return baseQuantity / custom.factorToBase;

  if (isWeightBase(base)) {
    const table = base === 'GR' ? WEIGHT_TO_GR : WEIGHT_TO_KG;
    const toFactor = table[to];
    const baseFactor = table[base];
    if (toFactor != null && baseFactor != null) {
      return (baseQuantity * baseFactor) / toFactor;
    }
  }

  throw new Error(`"${base}" biriminden "${to}" birimine dönüşüm tanımlı değil`);
}

export function getAvailableUnits(
  baseUnit: string,
  productUnits: ProductUnitLike[] = [],
): string[] {
  const base = normalizeUnit(baseUnit);
  const units = new Set<string>([base]);
  for (const u of productUnits) units.add(normalizeUnit(u.unit));
  if (isWeightBase(base)) {
    if (base === 'KG') ['GR', 'TON'].forEach((u) => units.add(u));
    if (base === 'GR') ['KG', 'TON'].forEach((u) => units.add(u));
  }
  return [...units];
}

export function formatQuantityWithUnit(qty: number, unit: string): string {
  const label = UNIT_LABELS[normalizeUnit(unit)] || unit;
  const rounded =
    Math.abs(qty - Math.round(qty)) < 0.001 ? Math.round(qty) : Math.round(qty * 1000) / 1000;
  return `${rounded} ${label}`;
}

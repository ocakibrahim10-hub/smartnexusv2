/** Türkiye Cumhuriyeti Kimlik No doğrulama (11 hane) */
export function isValidNationalId(value: string | null | undefined): boolean {
  if (!value) return false;
  const id = value.replace(/\D/g, '');
  if (id.length !== 11 || id[0] === '0') return false;
  const digits = id.split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const d10 = (oddSum * 7 - evenSum) % 10;
  if (d10 !== digits[9]) return false;
  const d11 = digits.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return d11 === digits[10];
}

export function maskNationalId(value: string | null | undefined): string | null {
  if (!value || value.length < 4) return null;
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

export function assertValidNationalId(value: string | undefined, required = false) {
  if (!value) {
    if (required) throw new Error('TC Kimlik No zorunludur');
    return;
  }
  if (!isValidNationalId(value)) throw new Error('Geçersiz TC Kimlik No');
}

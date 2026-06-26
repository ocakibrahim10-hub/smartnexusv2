import { AddonModuleCode } from '@prisma/client';

type KontorModuleRow = {
  id: string;
  code: AddonModuleCode;
  name: string;
  description?: string | null;
  kontorPackages?: Array<{ id: string; name: string; quantity: number; totalPrice: number }>;
};

/** E-Fatura ve E-Arşiv kontörünü tek paket olarak göster */
export function mergeKontorModulesForDisplay(modules: KontorModuleRow[]) {
  const einvoice = modules.find((m) => m.code === 'EINVOICE');
  const earchive = modules.find((m) => m.code === 'EARCHIVE');
  const sms = modules.filter((m) => m.code === 'SMS');

  const packages = einvoice?.kontorPackages?.length
    ? einvoice.kontorPackages
    : earchive?.kontorPackages ?? [];

  const merged: KontorModuleRow[] = [];
  if (packages.length > 0 || einvoice || earchive) {
    merged.push({
      id: einvoice?.id ?? earchive?.id ?? 'edocument-kontor',
      code: 'EINVOICE',
      name: 'E-Fatura / E-Arşiv',
      description:
        'GİB uyumlu e-Fatura ve e-Arşiv gönderimi — ortak kontör bakiyesi',
      kontorPackages: packages,
    });
  }

  return [...merged, ...sms];
}

export function edocumentKontorCodes(): AddonModuleCode[] {
  return ['EINVOICE', 'EARCHIVE'];
}

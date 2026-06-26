type KontorPackage = { id: string; name: string; quantity?: number; totalPrice: number };

export type KontorModuleRow = {
  id: string;
  code?: string;
  name: string;
  description?: string | null;
  kontorPackages?: KontorPackage[];
};

/** E-Fatura ve E-Arşiv kontörünü tek kartta birleştir; SMS ayrı kalır */
export function mergeKontorModulesForDisplay(modules: KontorModuleRow[]): KontorModuleRow[] {
  if (!modules.length) return [];

  const einvoice = modules.find((m) => m.code === 'EINVOICE');
  const earchive = modules.find((m) => m.code === 'EARCHIVE');
  const sms = modules.filter((m) => m.code === 'SMS');
  const alreadyMerged = modules.some(
    (m) => m.code === 'EINVOICE' && m.name?.includes('E-Arşiv'),
  );

  if (alreadyMerged) {
    const edoc = modules.find((m) => m.code === 'EINVOICE' || m.name?.includes('E-Arşiv'));
    const rest = modules.filter(
      (m) => m.code !== 'EINVOICE' && m.code !== 'EARCHIVE' && m !== edoc,
    );
    return edoc ? [edoc, ...rest.filter((m) => m.code === 'SMS')] : sms;
  }

  const packages = einvoice?.kontorPackages?.length
    ? einvoice.kontorPackages
    : earchive?.kontorPackages ?? [];

  const merged: KontorModuleRow[] = [];
  if (packages.length > 0 || einvoice || earchive) {
    merged.push({
      id: einvoice?.id ?? earchive?.id ?? 'edocument-kontor',
      code: 'EINVOICE',
      name: 'E-Fatura / E-Arşiv',
      description: 'GİB uyumlu e-Fatura ve e-Arşiv — ortak kontör paketi',
      kontorPackages: packages,
    });
  }

  return [...merged, ...sms];
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import PricingCatalogPreview from '@/components/pricing/PricingCatalogPreview';
import { platformApi } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import { planLabel, PLAN_ORDER, addonLabel, addonDescription, kontorLabel, kontorDescription } from '@/lib/plans';
import { buildPlansFromTemplates, mapAddonsForPricing } from '@/lib/pricing-catalog';
import ModulePicker from '@/components/ModulePicker';
import { applyDiscount } from '@/lib/pricing';
import { Coins, Package, Plus, Save, Layers, Calculator } from 'lucide-react';
import { FormField, FormSelect } from '@/components/FormField';
import {
  businessSubmoduleIds,
  sumSubmodulePrices,
  submodulePriceMap,
} from '@/lib/submodule-pricing';
import { MODULE_CATALOG } from '@/lib/modules';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function PackagesPage() {
  const [addons, setAddons] = useState<any[]>([]);
  const [kontorModules, setKontorModules] = useState<any[]>([]);
  const [planTemplates, setPlanTemplates] = useState<any[]>([]);
  const [submodulePricing, setSubmodulePricing] = useState<any[]>([]);
  const [publicPricing, setPublicPricing] = useState<any>(null);
  const [subPriceDraft, setSubPriceDraft] = useState<Record<string, string>>({});
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editModules, setEditModules] = useState<string[]>([]);
  const [editPrice, setEditPrice] = useState('');
  const [editDiscount, setEditDiscount] = useState('0');
  const [editMaxBranches, setEditMaxBranches] = useState('0');
  const [editExtraBranchPrice, setEditExtraBranchPrice] = useState('0');
  const [pkgForm, setPkgForm] = useState({ addonModuleId: '', name: '', quantity: 500, unitPrice: 0.5 });
  const [saving, setSaving] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const load = () => {
    platformApi.getModules().then((all) => {
      const yearly = all.filter(
        (m: any) => !m.isKontorBased && m.code !== 'EINVOICE' && m.code !== 'EARCHIVE' && m.code !== 'SMS',
      );
      setAddons(yearly.filter((m: any) => m.code !== 'EXTRA_BRANCH'));
      setKontorModules(all.filter((m: any) => ['EINVOICE', 'EARCHIVE', 'SMS'].includes(m.code)));
    }).catch(() => {});
    platformApi.getPublicPricing().then(setPublicPricing).catch(() => {});
    platformApi.getSubmodulePricing().then((rows) => {
      setSubmodulePricing(Array.isArray(rows) ? rows : []);
      const draft: Record<string, string> = {};
      for (const r of rows || []) draft[r.moduleId] = String(r.yearlyPrice ?? 0);
      setSubPriceDraft(draft);
    }).catch(() => {});
    fetch(`${API}/tenants/plan-templates`, { headers })
      .then((r) => r.json())
      .then((data) => setPlanTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const kontorAdminDisplay = useMemo(() => {
    const einvoice = kontorModules.find((m) => m.code === 'EINVOICE');
    const earchive = kontorModules.find((m) => m.code === 'EARCHIVE');
    const sms = kontorModules.filter((m) => m.code === 'SMS');
    const merged = [];
    const edoc = einvoice ?? earchive;
    if (edoc) {
      merged.push({
        ...edoc,
        name: 'E-Fatura / E-Arşiv',
        kontorPackages: edoc.kontorPackages?.length
          ? edoc.kontorPackages
          : earchive?.kontorPackages ?? [],
      });
    }
    return [...merged, ...sms];
  }, [kontorModules]);

  const pricingPlans = useMemo(
    () => buildPlansFromTemplates(planTemplates),
    [planTemplates],
  );

  const pricingAddons = useMemo(() => mapAddonsForPricing(addons), [addons]);

  const subPriceById = useMemo(() => submodulePriceMap(submodulePricing), [submodulePricing]);

  const planModuleTotal = useMemo(
    () => sumSubmodulePrices(editModules, subPriceById),
    [editModules, subPriceById],
  );

  const saveSubmodulePricing = async () => {
    setSaving(true);
    try {
      const items = businessSubmoduleIds().map((moduleId) => {
        const existing = subPriceById[moduleId];
        return {
          moduleId,
          yearlyPrice: parseFloat(subPriceDraft[moduleId] ?? '0') || 0,
          sellableExtra: existing?.sellableExtra ?? true,
          isActive: existing?.isActive ?? true,
        };
      });
      await platformApi.upsertSubmodulePricing(items);
      load();
    } finally {
      setSaving(false);
    }
  };

  const applyModuleTotalToPlanPrice = () => {
    setEditPrice(String(planModuleTotal));
  };

  const startEditPlan = (plan: string) => {
    const tpl = planTemplates.find((p) => p.plan === plan);
    setEditingPlan(plan);
    setEditModules([...(tpl?.modules ?? [])]);
    setEditPrice(String(tpl?.price ?? ''));
    setEditDiscount(String(tpl?.discountPercent ?? 0));
    setEditMaxBranches(String(tpl?.maxBranches ?? 0));
    setEditExtraBranchPrice(String(tpl?.extraBranchPrice ?? 0));
  };

  const savePlan = async () => {
    if (!editingPlan) return;
    setSaving(true);
    try {
      await fetch(`${API}/tenants/plan-templates/${editingPlan}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          modules: editModules,
          price: parseFloat(editPrice) || 0,
          discountPercent: parseFloat(editDiscount) || 0,
          maxBranches: parseInt(editMaxBranches, 10) || 0,
          extraBranchPrice: parseFloat(editExtraBranchPrice) || 0,
        }),
      });
      setEditingPlan(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const addPackage = async () => {
    await platformApi.createKontorPackage(pkgForm);
    setPkgForm({ addonModuleId: '', name: '', quantity: 500, unitPrice: 0.5 });
    load();
  };

  const updateAddonPrice = async (code: string, basePrice: number, discountPercent: number, isActive?: boolean) => {
    const mod = addons.find((a) => a.code === code) || kontorModules.find((a) => a.code === code);
    if (!mod) return;
    await platformApi.upsertModule({
      ...mod,
      basePrice,
      discountPercent,
      isKontorBased: mod.isKontorBased ?? false,
      isActive: isActive ?? mod.isActive,
    });
    load();
  };

  return (
    <>
      <TopBar
        title="Paket & Modül Yönetimi"
        subtitle="Yıllık abonelik planları, modül seçimi, indirim oranları ve kontör paketleri"
      />
      <div className="p-6 space-y-10 max-w-6xl">
        <section>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Müşteri önizlemesi</h2>
            <p className="text-sm text-gray-500 mt-1">
              /fiyatlandirma sayfasında ziyaretçilerin gördüğü görünüm
            </p>
          </div>
          <PricingCatalogPreview
            pricing={
              publicPricing ?? {
                plans: pricingPlans,
                kontorModules: kontorAdminDisplay,
                submodulePricing,
              }
            }
            selectedPlan={PLAN_ORDER[0]}
            compact
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {PLAN_ORDER.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => startEditPlan(p)}
                className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
              >
                {planLabel(p)} düzenle
              </button>
            ))}
          </div>
        </section>

        {editingPlan && (
          <div className="modal-card p-5 space-y-4">
            <h3 className="font-semibold">{planLabel(editingPlan)} — modül, fiyat ve indirim</h3>
            <div className="grid md:grid-cols-4 gap-3">
              <FormField
                label="Yıllık liste fiyatı (₺)"
                type="number"
                className="px-3 py-2 border rounded-xl w-full"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
              <div className="md:col-span-3 flex flex-wrap items-end gap-3">
                <div className="rounded-xl border border-[#EFEDF4] bg-[#FBF8FF] px-4 py-2 text-sm">
                  <span className="text-gray-500">Seçili modül toplamı: </span>
                  <strong className="text-[#606BDF]">{fmtMoney(planModuleTotal)}</strong>
                  <span className="text-gray-400 text-xs"> / yıl (KDV hariç)</span>
                </div>
                <button
                  type="button"
                  onClick={applyModuleTotalToPlanPrice}
                  className="px-3 py-2 rounded-xl border border-[#606BDF] text-[#606BDF] text-sm font-medium flex items-center gap-1.5 hover:bg-[#F0EFFF]"
                >
                  <Calculator className="w-4 h-4" /> Toplamı paket fiyatına yaz
                </button>
              </div>
              <FormField
                label="İndirim (%)"
                type="number"
                min="0"
                max="100"
                className="px-3 py-2 border rounded-xl w-full"
                value={editDiscount}
                onChange={(e) => setEditDiscount(e.target.value)}
              />
              <FormField
                label="Maks Şube Sayısı"
                type="number"
                min="0"
                className="px-3 py-2 border rounded-xl w-full"
                value={editMaxBranches}
                onChange={(e) => setEditMaxBranches(e.target.value)}
              />
              <FormField
                label="Ekstra Şube Fiyatı (₺)"
                type="number"
                min="0"
                className="px-3 py-2 border rounded-xl w-full"
                value={editExtraBranchPrice}
                onChange={(e) => setEditExtraBranchPrice(e.target.value)}
              />
              <div className="flex items-center gap-2 md:col-span-4 mt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={savePlan}
                  className="px-4 py-2 rounded-xl text-white font-medium bg-[#606BDF] flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Kaydet
                </button>
                <button type="button" onClick={() => setEditingPlan(null)} className="px-4 py-2 rounded-xl border">
                  İptal
                </button>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Dahil modüller</div>
              <ModulePicker
                modules={editModules}
                onChange={setEditModules}
                tenantType="BUSINESS"
                showAll
                variant="light"
                renderExtraNode={(childId) => {
                  const p = subPriceById[childId]?.yearlyPrice ?? 0;
                  return (
                    <span className="text-xs text-[#606BDF] font-medium shrink-0">
                      {fmtMoney(p)}
                    </span>
                  );
                }}
              />
            </div>
          </div>
        )}

        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#606BDF]" /> Alt Modül Fiyatları
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Her alt modül için yıllık ek satış fiyatı. Pakete dahil olmayan modüller işletmeye satın
            alma ekranında bu fiyatlarla gösterilir. Paket düzenlerken modül toplamı otomatik hesaplanır.
          </p>
          <div className="space-y-6">
            {MODULE_CATALOG.filter((g) => g.id !== 'DEALER').map((group) => (
              <div key={group.id} className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{group.label}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.children.map((child) => (
                    <div key={child.id} className="flex items-center gap-2 text-sm">
                      <label
                        htmlFor={`sub-price-${child.id}`}
                        className="flex-1 text-gray-700 truncate"
                        title={child.label}
                      >
                        {child.label}
                      </label>
                      <input
                        id={`sub-price-${child.id}`}
                        type="number"
                        min="0"
                        className="w-24 px-2 py-1.5 border rounded-lg text-right"
                        value={subPriceDraft[child.id] ?? subPriceById[child.id]?.yearlyPrice ?? '0'}
                        onChange={(e) =>
                          setSubPriceDraft((d) => ({ ...d, [child.id]: e.target.value }))
                        }
                      />
                      <span className="text-xs text-gray-400">₺/yıl</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={saveSubmodulePricing}
            className="mt-4 px-4 py-2 rounded-xl text-white font-medium bg-[#606BDF] flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Alt modül fiyatlarını kaydet
          </button>
        </section>

        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#606BDF]" /> Ek Paket Fiyatları (eski paket kodları)
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Yıllık abonelik — admin panelden aktif edilen modüller satışa sunulur. İşletme seçtiği ana
            pakette olmayan modülleri ek paket olarak görür.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {addons.map((m) => {
              const pricing = applyDiscount(m.basePrice ?? 0, m.discountPercent ?? 0);
              const name = addonLabel(m.code, m.name);
              const desc = addonDescription(m.code, m.description);
              return (
                <div key={m.id} className={`card p-5 ${!m.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-gray-900">{name}</div>
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 shrink-0">
                      <input
                        type="checkbox"
                        checked={m.isActive !== false}
                        onChange={(e) =>
                          updateAddonPrice(m.code, m.basePrice ?? 0, m.discountPercent ?? 0, e.target.checked)
                        }
                      />
                      Satışta
                    </label>
                  </div>
                  {desc && <p className="text-sm text-gray-600 mt-1 mb-4">{desc}</p>}
                  <FormField
                    label={`${name} yıllık fiyat (₺)`}
                    type="number"
                    className="mt-1 w-full px-3 py-2 border rounded-xl"
                    defaultValue={m.basePrice ?? ''}
                    onBlur={(e) =>
                      updateAddonPrice(
                        m.code,
                        parseFloat(e.target.value) || 0,
                        m.discountPercent ?? 0,
                      )
                    }
                  />
                  <FormField
                    label="İndirim (%)"
                    type="number"
                    min="0"
                    max="100"
                    className="mt-2 w-full px-3 py-2 border rounded-xl"
                    defaultValue={m.discountPercent ?? 0}
                    onBlur={(e) =>
                      updateAddonPrice(m.code, m.basePrice ?? 0, parseFloat(e.target.value) || 0)
                    }
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Satış fiyatı: {fmtMoney(pricing.finalPrice)} / yıl
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-500" /> Kontör Paket Yönetimi
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            E-Fatura / E-Arşiv ortak kontör paketi ve SMS — adet bazlı satış
          </p>
          <div className="grid lg:grid-cols-2 gap-4">
            {kontorAdminDisplay.map((m) => (
              <div key={m.id} className="card p-5">
                <div className="font-bold text-gray-900">{kontorLabel(m.code, m.name)}</div>
                <p className="text-sm text-gray-600 mb-3">{kontorDescription(m.code, m.description)}</p>
                <div className="space-y-2">
                  {(m.kontorPackages || []).map((p: any) => (
                    <div key={p.id} className="flex justify-between text-sm bg-gray-50 px-3 py-2 rounded-lg">
                      <span>{p.name}</span>
                      <span className="font-medium">{fmtMoney(p.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Yeni Kontör Paketi
          </h3>
          <div className="grid md:grid-cols-5 gap-3">
            <FormSelect
              label="Kontör modülü"
              hideLabel
              className="px-3 py-2 border rounded-xl"
              value={pkgForm.addonModuleId}
              onChange={(e) => setPkgForm({ ...pkgForm, addonModuleId: e.target.value })}
            >
              <option value="">Modül seç</option>
              {kontorAdminDisplay.map((m) => (
                <option key={m.id} value={m.id}>{kontorLabel(m.code, m.name)}</option>
              ))}
            </FormSelect>
            <FormField
              label="Paket adı"
              hideLabel
              placeholder="Paket adı"
              className="px-3 py-2 border rounded-xl"
              value={pkgForm.name}
              onChange={(e) => setPkgForm({ ...pkgForm, name: e.target.value })}
            />
            <FormField
              label="Kontör adedi"
              hideLabel
              type="number"
              placeholder="Adet"
              className="px-3 py-2 border rounded-xl"
              value={pkgForm.quantity}
              onChange={(e) => setPkgForm({ ...pkgForm, quantity: +e.target.value })}
            />
            <FormField
              label="Birim fiyat"
              hideLabel
              type="number"
              step="0.01"
              placeholder="Birim fiyat ₺"
              className="px-3 py-2 border rounded-xl"
              value={pkgForm.unitPrice}
              onChange={(e) => setPkgForm({ ...pkgForm, unitPrice: +e.target.value })}
            />
            <button
              type="button"
              onClick={addPackage}
              className="px-4 py-2 rounded-xl text-white font-medium bg-[#606BDF]"
            >
              Ekle
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

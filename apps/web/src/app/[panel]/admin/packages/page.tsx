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
import { Coins, Package, Plus, Save } from 'lucide-react';
import { FormField, FormSelect } from '@/components/FormField';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function PackagesPage() {
  const [addons, setAddons] = useState<any[]>([]);
  const [kontorModules, setKontorModules] = useState<any[]>([]);
  const [planTemplates, setPlanTemplates] = useState<any[]>([]);
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
    fetch(`${API}/tenants/plan-templates`, { headers })
      .then((r) => r.json())
      .then((data) => setPlanTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const pricingPlans = useMemo(
    () => buildPlansFromTemplates(planTemplates),
    [planTemplates],
  );

  const pricingAddons = useMemo(() => mapAddonsForPricing(addons), [addons]);

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
            plans={pricingPlans}
            addons={pricingAddons}
            kontorModules={kontorModules}
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
              />
            </div>
          </div>
        )}

        <section className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#606BDF]" /> Ek Paket Fiyatları
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
          <p className="text-sm text-gray-500 mb-4">E-Fatura, E-Arşiv ve SMS — adet bazlı kontör satışı</p>
          <div className="grid lg:grid-cols-3 gap-4">
            {kontorModules.map((m) => (
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
              {kontorModules.map((m) => (
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

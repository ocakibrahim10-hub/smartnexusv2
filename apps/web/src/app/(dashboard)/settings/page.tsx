'use client';

import { toast } from '@/lib/toast';
import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Building2,
  FileText,
  CreditCard,
  Bell,
  Shield,
  RefreshCw,
  Power,
  Palette,
  Plug,
} from 'lucide-react';
import { getUser, setSession } from '@/lib/auth';
import { expandLegacyModules, getCatalogForTenantType, getModuleLabel } from '@/lib/modules';
import { authApi } from '@/lib/api';
import { api } from '@/lib/api';
import { THEME_PRESETS, applyTheme, getStoredTheme, type ThemeId } from '@/lib/theme';
import { FormField, FormSelect, FormTextarea } from '@/components/FormField';

type TenantInfo = {
  id: string;
  name: string;
  code: string | null;
  type: string;
  plan: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  taxNo: string | null;
  taxOffice: string | null;
};

const PLAN_LABELS: Record<string, string> = {
  BASIC: 'Basic',
  PROFESSIONAL: 'Profesyonel',
  PLATINUM: 'Platinyum',
};
const TYPE_LABELS: Record<string, string> = {
  SUPERADMIN: 'SuperAdmin',
  DEALER: 'Bayi',
  BUSINESS: 'İşletme',
  BRANCH: 'Şube',
};

export default function SettingsPage() {
  const currentUser = getUser();
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [modules, setModules] = useState<string[]>(currentUser?.modules ?? []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [integrationStatus, setIntegrationStatus] = useState<any>(null);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [obBank, setObBank] = useState('ZIRAAT');
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>('hosting');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    region: '',
    taxNo: '',
    taxOffice: '',
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    setThemeId(getStoredTheme());
  }, []);

  useEffect(() => {
    if (activeTab === 'integrations') {
      api.get('/integrations/status').then((r) => setIntegrationStatus(r.data)).catch(() => {});
      api.get('/integrations/api-keys').then((r) => setApiKeys(r.data || [])).catch(() => {});
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab')) setActiveTab(params.get('tab') || 'profile');
    const code = params.get('code');
    const state = params.get('state');
    if (params.get('ob') === 'callback' && code && state) {
      api
        .post('/integrations/open-banking/callback', { code, state })
        .then(() => toast.success('Banka bağlantısı tamamlandı'))
        .catch((e) => toast.error(e?.response?.data?.message || 'Bağlantı hatası'));
      window.history.replaceState({}, '', '/settings?tab=integrations');
      setActiveTab('integrations');
    }
  }, []);

  useEffect(() => {
    const fetchTenant = async () => {
      try {
        // get current user's tenant from auth
        const authRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/me`,
          { headers },
        );
        const user = await authRes.json();
        const tenantRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants/${user.tenantId}`,
          { headers },
        );
        const data = await tenantRes.json();
        setTenant(data);
        if (data.subscription?.modules) setModules(data.subscription.modules);
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          region: data.region || '',
          taxNo: data.taxNo || '',
          taxOffice: data.taxOffice || '',
        });
      } catch {}
      setLoading(false);
    };
    fetchTenant();
  }, []);

  const refreshModules = async () => {
    try {
      const profile = await authApi.me();
      if (profile?.modules && currentUser) {
        setModules(profile.modules);
        setSession({
          user: { ...currentUser, modules: profile.modules },
          accessToken: localStorage.getItem('accessToken') || '',
          refreshToken: localStorage.getItem('refreshToken') || '',
        });
      }
    } catch {}
  };

  const toggleTenantActive = async () => {
    if (!tenant) return;
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants/${tenant.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ isActive: !(tenant as any).isActive }),
      },
    );
    const tenantRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants/${tenant.id}`,
      { headers },
    );
    setTenant(await tenantRes.json());
  };
  const saveTenant = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/tenants/${tenant.id}`,
        { method: 'PATCH', headers, body: JSON.stringify(form) },
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
    setSaving(false);
  };

  const connectOpenBanking = async () => {
    try {
      const r = await api.post('/integrations/open-banking/authorize', { bankCode: obBank });
      window.location.href = r.data.authorizationUrl;
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Yetkilendirme başlatılamadı');
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const r = await api.post('/integrations/api-keys', { name: newKeyName });
      setCreatedKey(r.data.key);
      setNewKeyName('');
      const list = await api.get('/integrations/api-keys');
      setApiKeys(list.data || []);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'API anahtarı oluşturulamadı');
    }
  };

  const selectTheme = (id: ThemeId) => {
    setThemeId(id);
    applyTheme(id);
  };

  const TABS = [
    { key: 'profile', label: 'Firma Profili', icon: Building2 },
    { key: 'appearance', label: 'Görünüm & Tema', icon: Palette },
    { key: 'invoice', label: 'Fatura Ayarları', icon: FileText },
    { key: 'integrations', label: 'Entegrasyonlar', icon: Plug },
    { key: 'subscription', label: 'Abonelik', icon: CreditCard },
    { key: 'notifications', label: 'Bildirimler', icon: Bell },
    { key: 'security', label: 'Güvenlik', icon: Shield },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Settings className="text-indigo-400" />
          Sistem Ayarları
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Firma bilgileri ve sistem tercihlerinizi yönetin
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t.key ? 'bg-brand-50 text-brand-700 border border-brand-200 font-semibold' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="card space-y-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-900 font-semibold">Firma Profili</h3>
                {tenant && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded bg-brand-50 text-brand-600">
                      {TYPE_LABELS[tenant.type]}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700">
                      {PLAN_LABELS[tenant.plan]}
                    </span>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="text-gray-400 py-4">Yükleniyor…</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <FormField
                        label="Firma Adı *"
                        className="input w-full"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <FormField
                        label="E-posta"
                        className="input w-full"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <FormField
                        label="Telefon"
                        className="input w-full"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormTextarea
                        label="Adres"
                        className="input w-full"
                        rows={2}
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      />
                    </div>
                    <div>
                      <FormField
                        label="Şehir"
                        className="input w-full"
                        value={form.city}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <FormField
                        label="Bölge / İlçe"
                        className="input w-full"
                        value={form.region}
                        onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                      />
                    </div>
                    <div>
                      <FormField
                        label="Vergi No (VKN)"
                        className="input w-full"
                        value={form.taxNo}
                        onChange={(e) => setForm((f) => ({ ...f, taxNo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <FormField
                        label="Vergi Dairesi"
                        className="input w-full"
                        value={form.taxOffice}
                        onChange={(e) => setForm((f) => ({ ...f, taxOffice: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={saveTenant}
                      disabled={saving}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Save size={14} />
                      {saving ? 'Kaydediliyor…' : 'Değişiklikleri Kaydet'}
                    </button>
                    {saved && <span className="text-emerald-600 text-sm">✓ Kaydedildi</span>}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="card space-y-5">
              <h3 className="text-gray-900 font-semibold">Tema & Renk Paleti</h3>
              <p className="text-gray-400 text-sm">
                Panel renklerini kişiselleştirin. Seçim anında uygulanır ve tarayıcıda saklanır.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {THEME_PRESETS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTheme(t.id)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      themeId === t.id
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`w-8 h-8 rounded-lg flex-shrink-0 theme-swatch theme-swatch-${t.id}`}
                      />
                      <span className="text-gray-900 font-medium text-sm">{t.label}</span>
                    </div>
                    <p className="text-gray-500 text-xs">{t.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'invoice' && (
            <div className="card space-y-4">
              <h3 className="text-gray-900 font-semibold">Fatura Ayarları</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <FormField label="Fatura Serisi" className="input w-full" defaultValue="INV" />
                </div>
                <div>
                  <FormField
                    label="Varsayılan KDV (%)"
                    className="input w-full"
                    type="number"
                    defaultValue="18"
                  />
                </div>
                <div>
                  <FormField
                    label="Ödeme Vadesi (gün)"
                    className="input w-full"
                    type="number"
                    defaultValue="30"
                  />
                </div>
                <div>
                  <FormSelect label="Para Birimi" className="input w-full" defaultValue="TRY">
                    <option value="TRY">TRY — Türk Lirası</option>
                    <option value="USD">USD — Dolar</option>
                    <option value="EUR">EUR — Euro</option>
                  </FormSelect>
                </div>
              </div>
              <FormTextarea
                label="Fatura Notu (varsayılan)"
                className="input w-full"
                rows={3}
                defaultValue="Ödeme süresi içinde yapılmaması durumunda yasal yollara başvurulacaktır."
              />
              <button className="btn-primary flex items-center gap-2">
                <Save size={14} />
                Kaydet
              </button>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-900 font-semibold">Abonelik & Modüller</h3>
                <button
                  onClick={refreshModules}
                  className="btn-secondary text-xs flex items-center gap-1"
                >
                  <RefreshCw size={12} /> Menüyü Yenile
                </button>
              </div>
              {tenant ? (
                <div className="space-y-3">
                  <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                    <div className="text-indigo-400 text-xs uppercase tracking-wider mb-1">
                      Mevcut Plan
                    </div>
                    <div className="text-gray-900 font-bold text-2xl">
                      {PLAN_LABELS[tenant.plan]}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm mb-2">
                      Aktif Modüller ({expandLegacyModules(modules).length})
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {getCatalogForTenantType(tenant.type)
                        .flatMap((g) => g.children)
                        .map((m) => {
                          const active = expandLegacyModules(modules).includes(m.id);
                          return (
                            <div
                              key={m.id}
                              className={`p-3 rounded-lg border text-sm ${active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}
                            >
                              {getModuleLabel(m.id)} {active ? '✓' : '✗'}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                  {(currentUser?.tenantType === 'SUPERADMIN' ||
                    currentUser?.tenantType === 'DEALER') && (
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-gray-900 text-sm font-medium">Firma Durumu</div>
                        <div className="text-gray-400 text-xs">
                          Pasif yapıldığında kullanıcılar giriş yapamaz
                        </div>
                      </div>
                      <button
                        onClick={toggleTenantActive}
                        className="btn-secondary flex items-center gap-2 text-sm"
                      >
                        <Power size={14} />{' '}
                        {(tenant as any).isActive === false ? 'Aktifleştir' : 'Pasifleştir'}
                      </button>
                    </div>
                  )}
                  <p className="text-gray-400 text-sm">
                    Modül değişiklikleri Abonelikler sayfasından yapılır. Değişiklik sonrası
                    &quot;Menüyü Yenile&quot; butonuna tıklayın.
                  </p>
                </div>
              ) : (
                <div className="text-gray-400">Yükleniyor…</div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="card space-y-4">
              <h3 className="text-gray-900 font-semibold">Bildirim Ayarları</h3>
              {[
                {
                  label: 'E-posta ile fatura bildirimi',
                  desc: 'Yeni fatura oluşturulduğunda e-posta gönder',
                  default: true,
                },
                {
                  label: 'Stok uyarıları',
                  desc: 'Minimum stok seviyesi aşıldığında bildirim',
                  default: true,
                },
                {
                  label: 'Abonelik yenileme hatırlatması',
                  desc: 'Abonelik bitiş tarihinden 7 gün önce',
                  default: true,
                },
                {
                  label: 'Destek talep güncellemeleri',
                  desc: 'Ticket yanıtlandığında bildirim',
                  default: true,
                },
                {
                  label: 'Sistem duyuruları',
                  desc: 'SmartNexus sistem bildirimleri',
                  default: false,
                },
              ].map((n, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between py-3 border-b border-gray-100"
                >
                  <div>
                    <div className="text-gray-900 text-sm font-medium">{n.label}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{n.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                    <input type="checkbox" defaultChecked={n.default} className="sr-only peer" aria-label={n.label} />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>
              ))}
              <button className="btn-primary flex items-center gap-2 mt-2">
                <Save size={14} />
                Kaydet
              </button>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-4">
              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">E-Fatura (Uyumsoft / GİB)</h3>
                {integrationStatus ? (
                  <div className="space-y-2 text-sm">
                    <p>
                      Sağlayıcı: <strong>{integrationStatus.einvoice?.provider}</strong>
                    </p>
                    <p
                      className={
                        integrationStatus.einvoice?.configured ? 'text-emerald-600' : 'text-amber-600'
                      }
                    >
                      {integrationStatus.einvoice?.configured
                        ? 'Yapılandırılmış'
                        : 'Eksik — .env dosyasına UYUMSOFT_* değişkenlerini ekleyin'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Yükleniyor...</p>
                )}
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Open Banking (BKM)</h3>
                {integrationStatus && (
                  <p
                    className={`text-sm mb-3 ${integrationStatus.openBanking?.configured ? 'text-emerald-600' : 'text-amber-600'}`}
                  >
                    {integrationStatus.openBanking?.configured
                      ? 'OAuth yapılandırması hazır'
                      : 'OPEN_BANKING_CLIENT_ID / SECRET gerekli'}
                  </p>
                )}
                <p className="text-xs text-gray-500 mb-3">
                  Kasa & Banka sayfasından &quot;Open Banking Sync&quot; ile hareket çekin.
                </p>
                <div className="flex gap-2 items-center">
                  <FormSelect
                    label="Banka"
                    hideLabel
                    value={obBank}
                    onChange={(e) => setObBank(e.target.value)}
                    className="input text-sm"
                  >
                    {(integrationStatus?.openBanking?.banks || []).map((b: string) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </FormSelect>
                  <button type="button" onClick={connectOpenBanking} className="btn-primary text-sm">
                    Banka Bağla
                  </button>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Ödeme Gateway</h3>
                <div className="grid grid-cols-2 gap-3">
                  {(integrationStatus?.payments || []).map((p: any) => (
                    <div key={p.id} className="border border-gray-100 rounded-lg p-3">
                      <p className="font-medium">{p.name}</p>
                      <p
                        className={`text-xs mt-1 ${p.configured ? 'text-emerald-600' : 'text-gray-400'}`}
                      >
                        {p.configured ? 'Aktif' : 'Yapılandırılmamış'}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Aktif: {integrationStatus?.activeProvider || 'iyzico'} — POS kart ödemelerinde kullanılır.
                </p>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">E-posta (Resend)</h3>
                <p
                  className={`text-sm ${integrationStatus?.email?.configured ? 'text-emerald-600' : 'text-amber-600'}`}
                >
                  {integrationStatus?.email?.configured
                    ? 'Resend API bağlı'
                    : 'RESEND_API_KEY gerekli'}
                </p>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold text-gray-900 mb-4">SMS (Netgsm)</h3>
                <p
                  className={`text-sm ${integrationStatus?.sms?.configured ? 'text-emerald-600' : 'text-amber-600'}`}
                >
                  {integrationStatus?.sms?.configured
                    ? 'Netgsm API bağlı'
                    : 'NETGSM_* değişkenleri gerekli'}
                </p>
              </div>

              {tenant?.plan === 'PLATINUM' && (
                <div className="card p-5">
                  <h3 className="font-semibold text-gray-900 mb-4">API Anahtarları (Platinyum)</h3>
                  {createdKey && (
                    <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-mono break-all">
                      Yeni anahtar (bir kez gösterilir): {createdKey}
                    </div>
                  )}
                  <div className="flex gap-2 mb-4">
                    <FormField
                      label="Anahtar adı"
                      hideLabel
                      type="text"
                      placeholder="Anahtar adı"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      className="input text-sm flex-1"
                    />
                    <button type="button" onClick={createApiKey} className="btn-primary text-sm">
                      Oluştur
                    </button>
                  </div>
                  <ul className="text-sm space-y-2">
                    {apiKeys.map((k) => (
                      <li key={k.id} className="flex justify-between border-b border-gray-50 py-2">
                        <span>
                          {k.name} <span className="text-gray-400 font-mono">{k.keyPrefix}…</span>
                        </span>
                        <span className="text-xs text-gray-400">
                          {k.lastUsedAt
                            ? new Date(k.lastUsedAt).toLocaleDateString('tr-TR')
                            : 'Kullanılmadı'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="card space-y-4">
              <h3 className="text-gray-900 font-semibold">Güvenlik</h3>
              <div className="space-y-3">
                {[
                  {
                    label: 'İki Faktörlü Doğrulama (2FA)',
                    desc: 'Yakında kullanıma girecek',
                    available: false,
                  },
                  {
                    label: 'Oturum Zaman Aşımı',
                    desc: 'Aktif değilken otomatik çıkış (30 dakika)',
                    available: true,
                  },
                  {
                    label: 'IP Kısıtlaması',
                    desc: 'Sadece belirli IP adreslerinden erişim (Platinyum)',
                    available: false,
                  },
                  {
                    label: 'Denetim Kayıtları (Audit Log)',
                    desc: 'Tüm kullanıcı işlemlerini kayıt altına al',
                    available: true,
                    href: '/accounting/audit',
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-start justify-between p-4 rounded-lg ${s.available ? 'bg-gray-50' : 'bg-gray-50 opacity-50'}`}
                  >
                    <div>
                      <div className="text-gray-900 text-sm font-medium">{s.label}</div>
                      <div className="text-gray-400 text-xs mt-0.5">{s.desc}</div>
                    </div>
                    {s.available ? (
                      <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
                        <input type="checkbox" defaultChecked className="sr-only peer" aria-label={s.label} />
                        <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                      </label>
                    ) : (
                      <span className="text-gray-600 text-xs flex-shrink-0 ml-4">Yakında</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
    
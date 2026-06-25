'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import TopBar from '@/components/layout/TopBar';
import { platformApi } from '@/lib/api';
import {
  Package, Warehouse, BookOpen, Monitor, Truck, ShoppingCart, Globe,
  Factory, UserCog, Users, Bot, CheckCircle, XCircle, Building2
} from 'lucide-react';

const MODULE_META: Record<string, { label: string; icon: any; description: string }> = {
  inventory: { label: 'Stok & Depo', icon: Warehouse, description: 'Ürün, depo, stok hareketi ve transfer yönetimi' },
  accounting: { label: 'Muhasebe', icon: BookOpen, description: 'Fatura, cari, kasa/banka, gider ve e-dönüşüm' },
  pos: { label: 'Hızlı Satış (POS)', icon: Monitor, description: 'Yazar kasa entegrasyonlu POS satış ekranı' },
  tms: { label: 'TMS & Lojistik', icon: Truck, description: 'Araç, sevkiyat ve teslimat takip sistemi' },
  b2b: { label: 'B2B Portal', icon: ShoppingCart, description: 'Toptan sipariş, müşteri portalı ve fiyat listeleri' },
  b2c: { label: 'E-Ticaret (B2C)', icon: Globe, description: 'Trendyol, Shopify ve pazaryeri entegrasyonları' },
  mrp: { label: 'Üretim (MRP)', icon: Factory, description: 'Ürün ağacı, reçete ve iş emri yönetimi' },
  hr: { label: 'İK & Bordro', icon: UserCog, description: 'Personel izin takibi ve bordro yönetimi' },
  crm: { label: 'Müşteri İlişkileri (CRM)', icon: Users, description: 'Satış hunisi, lead takibi ve aktivite yönetimi' },
  ai: { label: 'AI Asistan', icon: Bot, description: 'Yapay zeka destekli sohbet ve analiz asistanı' },
};

export default function AdminModuleDetailPage() {
  const params = useParams();
  const moduleSlug = params?.module as string || 'inventory';
  const meta = MODULE_META[moduleSlug] || { label: moduleSlug, icon: Package, description: '' };
  const Icon = meta.icon;

  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    platformApi.getModules()
      .then((data) => setModules(Array.isArray(data) ? data : []))
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, []);

  // Find related addon module
  const SLUG_TO_CODE: Record<string, string> = {
    inventory: '', // base module
    accounting: '', // base module
    pos: 'POS_YAZARKASA',
    tms: '',
    b2b: '',
    b2c: 'B2C_ECOMMERCE',
    mrp: 'MANUFACTURING',
    hr: 'HR_PAYROLL',
    crm: 'ADVANCED_CRM',
    ai: 'AI_FEATURES',
  };
  const addonCode = SLUG_TO_CODE[moduleSlug] || '';
  const addon = modules.find((m: any) => m.code === addonCode);

  return (
    <>
      <TopBar title={meta.label} subtitle="Modül durumu ve kullanım bilgileri" />
      <div className="p-6 space-y-6">
        {/* Hero Card */}
        <div className="card p-6 flex items-start gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#606BDF]/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-7 h-7 text-[#606BDF]" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{meta.label}</h2>
            <p className="text-sm text-gray-500 mt-1">{meta.description}</p>
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-1.5 text-sm">
                {addon ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-700 font-medium">Aktif Ek Paket</span>
                  </>
                ) : addonCode ? (
                  <>
                    <XCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-500">Ek paket tanımlı değil</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-700 font-medium">Temel Modül</span>
                  </>
                )}
              </div>
              {addon && (
                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                  {addon.name} — Fiyat: {addon.basePrice ? `₺${addon.basePrice}` : 'Dahil'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Module features */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Özellikler</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {getFeatures(moduleSlug).map((f, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Kullanım Durumu</h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Durum</span>
                <span className="text-sm font-medium text-emerald-600">Aktif</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm text-gray-500">Modül Kodu</span>
                <span className="text-sm font-mono text-gray-700">{addonCode || moduleSlug.toUpperCase()}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-500">Kategori</span>
                <span className="text-sm text-gray-700">{addonCode ? 'Ek Paket' : 'Temel Modül'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function getFeatures(slug: string): string[] {
  const features: Record<string, string[]> = {
    inventory: ['Ürün kartları ve barkod yönetimi', 'Çoklu depo desteği', 'Stok giriş/çıkış hareketleri', 'Depolar arası transfer', 'AI destekli talep tahmini', 'Minimum stok uyarıları'],
    accounting: ['Alış/satış faturaları', 'Cari hesap takibi', 'Kasa ve banka yönetimi', 'Genel muhasebe (kebir)', 'Gider yönetimi', 'E-Fatura / E-Arşiv entegrasyonu', 'Denetim kaydı (audit log)'],
    pos: ['Hızlı satış ekranı', 'Barkod ile ürün ekleme', 'Nakit / kart ödeme', 'Z-raporu ve gün sonu', 'Yazar kasa entegrasyonu'],
    tms: ['Araç filosu yönetimi', 'Sevkiyat planlama', 'Teslimat takibi', 'E-İrsaliye entegrasyonu', 'Sürücü atama'],
    b2b: ['Toptan sipariş yönetimi', 'Müşteri portalı', 'Özel fiyat listeleri', 'Sipariş onay akışı'],
    b2c: ['Trendyol entegrasyonu', 'Shopify entegrasyonu', 'Sipariş senkronizasyonu', 'Stok otomatik güncelleme'],
    mrp: ['Ürün ağacı (BOM) tanımı', 'İş emri oluşturma', 'Üretim durumu takibi', 'Otomatik stok tüketimi'],
    hr: ['Personel izin yönetimi', 'Bordro oluşturma', 'İzin talep onay akışı', 'Maaş hesaplama'],
    crm: ['Potansiyel müşteri (lead) takibi', 'Satış hunisi (pipeline)', 'Aktivite kaydı', 'Fırsat yönetimi'],
    ai: ['Sohbet asistanı', 'Satış analizi', 'Stok optimizasyonu', 'Doğal dil sorguları'],
  };
  return features[slug] || ['Modül bilgisi yükleniyor...'];
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Store,
  Building2,
  Package,
  Warehouse,
  FileText,
  BookOpen,
  Truck,
  ShoppingCart,
  BarChart3,
  Headphones,
  MessageSquare,
  Settings,
  Zap,
  ChevronDown,
  ChevronRight,
  CreditCard,
  GitBranch,
  LogOut,
  Monitor,
  Brain,
  ShoppingBag,
  Receipt,
  Wallet,
  Activity,
  Coins,
  Bell,
  Shield,
  Bot,
  Factory,
  UserCog,
  Globe,
  ClipboardList,
  PieChart,
  Database,
  ScanLine,
  MapPin,
} from 'lucide-react';
import { clearSession, getUser } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { hasModuleAccess } from '@/lib/modules';
import { ROLE_CFG, canManageUsers } from '@/lib/role-permissions';
import { PanelType, withPanel, panelLoginPath, panelLabel } from '@/lib/panel';

type NavItem = {
  label: string;
  icon: any;
  href?: string;
  children?: NavItem[];
  roles?: string[];
  tenantTypes?: string[];
  module?: string;
  managerOnly?: boolean;
  badge?: string;
};

function prefixNav(items: NavItem[], panel: PanelType): NavItem[] {
  return items.map((item) => ({
    ...item,
    href: item.href ? withPanel(panel, item.href) : undefined,
    children: item.children ? prefixNav(item.children, panel) : undefined,
  }));
}

const adminNav: NavItem[] = [
  { label: 'Boss Screen', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Platform Boss', icon: Activity, href: '/admin/boss' },
  { label: 'Sistem Sağlığı', icon: Shield, href: '/admin/system-health' },
  { label: 'Nexus Asistan', icon: Bot, href: '/admin/chatbot' },
  {
    label: 'Platform Yönetimi',
    icon: Settings,
    children: [
      { label: 'Bayiler', icon: Store, href: '/dealers' },
      { label: 'İşletmeler', icon: Building2, href: '/businesses' },
      { label: 'Tüm Tenant\'lar', icon: Database, href: '/admin/tenants' },
      { label: 'Abonelikler', icon: CreditCard, href: '/subscriptions' },
      { label: 'Paket & Modüller', icon: Package, href: '/admin/packages' },
    ],
  },
  {
    label: 'Finans & Hakediş',
    icon: Wallet,
    children: [
      { label: 'Hakediş Özeti', icon: Wallet, href: '/admin/commission' },
      { label: 'Hakediş Faturaları', icon: Receipt, href: '/admin/commission-invoices' },
      { label: 'Kontör Yönetimi', icon: Coins, href: '/admin/kontor' },
    ],
  },
  {
    label: 'Raporlar & Bildirim',
    icon: BarChart3,
    children: [
      { label: 'Platform Raporları', icon: PieChart, href: '/admin/reports' },
      { label: 'Bildirimler', icon: Bell, href: '/admin/notifications' },
      { label: 'Denetim Kaydı', icon: ClipboardList, href: '/admin/audit' },
    ],
  },
  {
    label: 'İşletme Modülleri',
    icon: Package,
    children: [
      { label: 'Stok & Depo', icon: Warehouse, href: '/admin/modules/inventory' },
      { label: 'Muhasebe', icon: BookOpen, href: '/admin/modules/accounting' },
      { label: 'POS', icon: Monitor, href: '/admin/modules/pos' },
      { label: 'TMS & Lojistik', icon: Truck, href: '/admin/modules/tms' },
      { label: 'B2B Portal', icon: ShoppingCart, href: '/admin/modules/b2b' },
      { label: 'E-Ticaret (B2C)', icon: Globe, href: '/admin/modules/b2c' },
      { label: 'Üretim (MRP)', icon: Factory, href: '/admin/modules/mrp' },
      { label: 'İK & Bordro', icon: UserCog, href: '/admin/modules/hr' },
      { label: 'CRM', icon: Users, href: '/admin/modules/crm' },
      { label: 'AI Asistan', icon: Bot, href: '/admin/modules/ai' },
    ],
  },
  { label: 'Mesajlar', icon: MessageSquare, href: '/messages' },
  { label: 'Destek', icon: Headphones, href: '/support' },
  { label: 'Kullanıcılar', icon: Users, href: '/hr/personnel' },
  { label: 'Ayarlar', icon: Settings, href: '/settings' },
];

const bayiNav: NavItem[] = [
  { label: 'Boss Screen', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: 'Bayi Merkezi',
    icon: Store,
    children: [
      { label: 'İşletmelerim', icon: Building2, href: '/dealer/businesses', module: 'DEALER.BUSINESSES' },
      { label: 'Şube Takibi', icon: GitBranch, href: '/dealer/branches', module: 'DEALER.BRANCHES' },
      { label: 'Abonelikler', icon: CreditCard, href: '/subscriptions', module: 'DEALER.SUBSCRIPTIONS' },
      { label: 'Kullanıcılar', icon: Users, href: '/hr/personnel', module: 'DEALER.USERS' },
    ],
  },
  {
    label: 'Finans & Hakediş',
    icon: Wallet,
    children: [
      { label: 'Hakediş Raporu', icon: Wallet, href: '/dealer/commission', module: 'DEALER.COMMISSION' },
      { label: 'Hakediş Faturası', icon: Receipt, href: '/dealer/billing', module: 'DEALER.BILLING' },
      { label: 'Kontör Satın Al', icon: Coins, href: '/kontor' },
      { label: 'Gelişmiş Raporlar', icon: PieChart, href: '/dealer/reports', module: 'DEALER.REPORTS' },
    ],
  },
  {
    label: 'İletişim',
    icon: MessageSquare,
    children: [
      { label: 'Mesajlar', icon: MessageSquare, href: '/messages', module: 'DEALER.MESSAGES' },
      { label: 'Destek', icon: Headphones, href: '/support' },
    ],
  },
  {
    label: 'Kendi İşletmem',
    icon: Building2,
    children: [
      { label: 'Üretim (MRP)', icon: Factory, href: '/mrp/boms', module: 'MRP.MAIN' },
      { label: 'İnsan Kaynakları', icon: UserCog, href: '/hr/leaves', module: 'HR.LEAVES' },
      { label: 'Müşteri İlişkileri', icon: Users, href: '/crm/pipeline', module: 'CRM.PIPELINE' },
      { label: 'Muhasebe', icon: BookOpen, href: '/accounting/invoices', module: 'ACCOUNTING.INVOICES' },
      { label: 'Stok & Depo', icon: Package, href: '/inventory/products', module: 'INVENTORY.PRODUCTS' },
      { label: 'AI Asistan', icon: Bot, href: '/ai-assistant', module: 'AI.ASSISTANT' },
      { label: 'B2C E-Ticaret', icon: Globe, href: '/b2c', module: 'B2C.MAIN' },
    ],
  },
  { label: 'Ayarlar', icon: Settings, href: '/settings' },
];

const isletmeNav: NavItem[] = [
  { label: 'Boss Screen', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Hızlı Satış (POS)', icon: Monitor, href: '/pos', module: 'POS.MAIN' },
  {
    label: 'Stok & Depo',
    icon: Package,
    children: [
      { label: 'Ürünler', icon: Package, href: '/inventory/products', module: 'INVENTORY.PRODUCTS' },
      { label: 'Depolar', icon: Warehouse, href: '/inventory/warehouses', module: 'INVENTORY.WAREHOUSES' },
      { label: 'Stok Hareketleri', icon: BarChart3, href: '/inventory/movements', module: 'INVENTORY.MOVEMENTS' },
      { label: 'Transferler', icon: GitBranch, href: '/inventory/transfers', module: 'INVENTORY.TRANSFERS' },
      { label: 'AI Tahmin', icon: Brain, href: '/inventory/forecasting', module: 'INVENTORY.FORECASTING' },
    ],
  },
  {
    label: 'Muhasebe',
    icon: BookOpen,
    children: [
      { label: 'Faturalar', icon: FileText, href: '/accounting/invoices', module: 'ACCOUNTING.INVOICES' },
      { label: 'Malzeme Alış', icon: Package, href: '/accounting/purchases', module: 'ACCOUNTING.INVOICES' },
      { label: 'Çek Defteri', icon: Receipt, href: '/accounting/checks', module: 'ACCOUNTING.CASH' },
      { label: 'Cari Hesaplar', icon: Users, href: '/accounting/contacts', module: 'ACCOUNTING.CONTACTS' },
      { label: 'Kasa & Banka', icon: Wallet, href: '/accounting/cash', module: 'ACCOUNTING.CASH' },
      { label: 'Genel Muhasebe', icon: BookOpen, href: '/accounting/ledger', module: 'ACCOUNTING.LEDGER' },
      { label: 'Giderler', icon: Receipt, href: '/accounting/expenses', module: 'ACCOUNTING.EXPENSES' },
      { label: 'Denetim Kaydı', icon: Shield, href: '/accounting/audit', module: 'ACCOUNTING.AUDIT' },
      { label: 'E-Dönüşüm', icon: FileText, href: '/accounting/einvoice', module: 'ACCOUNTING.EDOCUMENT' },
    ],
  },
  {
    label: 'Üretim (MRP)',
    icon: Package,
    children: [
      { label: 'Reçeteler (BOM)', icon: FileText, href: '/mrp/boms', module: 'MRP.MAIN' },
      { label: 'İş Emirleri', icon: Activity, href: '/mrp/work-orders', module: 'MRP.MAIN' },
    ],
  },
  {
    label: 'TMS & Lojistik',
    icon: Truck,
    children: [
      { label: 'Sevkiyatlar', icon: Truck, href: '/tms/shipments', module: 'TMS.SHIPMENTS' },
      { label: 'Araçlar', icon: Truck, href: '/tms/vehicles', module: 'TMS.VEHICLES' },
    ],
  },
  {
    label: 'B2B',
    icon: ShoppingCart,
    children: [
      { label: 'Siparişler', icon: ShoppingCart, href: '/b2b/orders', module: 'B2B.ORDERS' },
      { label: 'Müşteriler', icon: Users, href: '/b2b/customers', module: 'B2B.CUSTOMERS' },
      { label: 'Fiyat Listeleri', icon: FileText, href: '/b2b/price-lists', module: 'B2B.PRICE_LISTS' },
    ],
  },
  { label: 'Pazaryeri', icon: ShoppingBag, href: '/marketplace', module: 'MARKETPLACE.MAIN' },
  { label: 'E-Ticaret (B2C)', icon: ShoppingCart, href: '/b2c', module: 'B2C.MAIN' },
  {
    label: 'İnsan Kaynakları',
    icon: Users,
    children: [
      { label: 'Personel Listesi', icon: Users, href: '/hr/personnel', module: 'HR.PERSONNEL' },
      { label: 'İzin Yönetimi', icon: FileText, href: '/hr/leaves', module: 'HR.LEAVES' },
      { label: 'Bordrolar', icon: Receipt, href: '/hr/payroll', module: 'HR.PAYROLL' },
    ],
  },
  {
    label: 'Depo Yönetimi (WMS)',
    icon: Warehouse,
    children: [
      { label: 'Barkod Tarayıcı', icon: ScanLine, href: '/wms/scanner', module: 'WMS.SCANNER' },
      { label: 'Lokasyonlar', icon: MapPin, href: '/wms/locations', module: 'WMS.LOCATIONS' },
      { label: 'Sipariş Toplama', icon: ClipboardList, href: '/wms/picking', module: 'WMS.PICKING' },
    ],
  },
  {
    label: 'Müşteri İlişkileri',
    icon: Users,
    children: [
      { label: 'Satış Hunisi', icon: Activity, href: '/crm/pipeline', module: 'CRM.PIPELINE' },
      { label: 'Aday Müşteriler', icon: Users, href: '/crm/leads', module: 'CRM.LEADS' },
    ],
  },
  { label: 'AI Asistan', icon: Bot, href: '/ai-assistant', module: 'AI.ASSISTANT' },
  { label: 'Kontör', icon: Coins, href: '/kontor', managerOnly: true },
  { label: 'Raporlar', icon: BarChart3, href: '/reports', module: 'ACCOUNTING.REPORTS' },
  {
    label: 'Şubeler',
    icon: GitBranch,
    href: '/branches',
    managerOnly: true,
    tenantTypes: ['BUSINESS'],
  },
  { label: 'Destek', icon: Headphones, href: '/support' },
  { label: 'Ayarlar', icon: Settings, href: '/settings', managerOnly: true },
];

function getNavForPanel(panel: PanelType): NavItem[] {
  if (panel === 'nexusadmin') return prefixNav(adminNav, panel);
  if (panel === 'bayi') return prefixNav(bayiNav, panel);
  return prefixNav(isletmeNav, panel);
}

export default function PanelSidebar({ panel }: { panel: PanelType }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const userModules: string[] = user?.modules ?? [];
  const tenantType = user?.tenantType ?? '';
  const navConfig = getNavForPanel(panel);

  const hasModule = (mod?: string) => hasModuleAccess(userModules, mod, tenantType);
  const hasRole = (roles?: string[]) => !roles || roles.includes(tenantType);
  const hasTenantType = (types?: string[]) => !types || types.includes(tenantType);
  const isManager = canManageUsers(user?.role || '');
  const canShow = (item: NavItem) =>
    hasRole(item.roles) &&
    hasTenantType(item.tenantTypes) &&
    (!item.managerOnly || isManager) &&
    hasModule(item.module);

  const visibleNav = navConfig.filter((item) => {
    if (!canShow(item)) return false;
    if (item.children) return item.children.some((c) => canShow(c));
    return true;
  });

  // Aktif sayfaya göre hangi grup açık olacağını hesapla
  const findActiveGroup = () => {
    for (const item of visibleNav) {
      if (item.children) {
        const match = item.children.some((c) => c.href && pathname.startsWith(c.href));
        if (match) return item.label;
      }
    }
    return null;
  };

  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const active = findActiveGroup();
    return active ? [active] : [];
  });
  const [collapsed, setCollapsed] = useState(false);

  // Accordion: sadece tek grup açık
  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? [] : [label],
    );
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearSession();
    router.push(panelLoginPath(panel));
  };

  const isActive = (href?: string) => href && pathname === href;
  const isGroupActive = (item: NavItem) =>
    item.children?.some((c) => c.href && pathname.startsWith(c.href));

  return (
    <aside
      className={`dashboard-sidebar flex flex-col h-screen transition-all duration-300 z-30 flex-shrink-0 ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-200">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white bg-[var(--theme-primary)]"
        >
          <Zap className="w-4 h-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-gray-900 font-bold text-base leading-none">SmartNexus</div>
            <div className="text-gray-500 text-xs mt-0.5 truncate">{panelLabel(panel)}</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {visibleNav.map((item) => {
          if (!item.children) {
            return (
              <button
                key={item.label}
                onClick={() => item.href && router.push(item.href)}
                className={`sidebar-item w-full ${isActive(item.href) ? 'active' : ''}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              </button>
            );
          }

          const visibleChildren = item.children.filter(canShow);
          if (visibleChildren.length === 0) return null;
          const isOpen = openGroups.includes(item.label);

          return (
            <div key={item.label}>
              <button
                onClick={() => toggleGroup(item.label)}
                className={`sidebar-item w-full ${isGroupActive(item) ? 'font-semibold' : ''}`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {isOpen ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </>
                )}
              </button>
              {isOpen && !collapsed && (
                <div className="ml-2 pl-4 border-l border-gray-200 mt-0.5 space-y-0.5">
                  {visibleChildren.map((child) => (
                    <button
                      key={child.label}
                      onClick={() => child.href && router.push(child.href)}
                      className={`sidebar-item w-full text-xs py-2 ${isActive(child.href) ? 'active' : ''}`}
                    >
                      <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="flex-1 text-left">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200">
        {!collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-[var(--theme-primary)]"
            >
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 text-xs font-semibold truncate">{user?.name}</div>
              <div className="text-gray-500 text-xs truncate">
                {ROLE_CFG[user?.role || '']?.label || user?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              title="Çıkış yap"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} className="sidebar-item w-full justify-center" title="Çıkış yap">
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}
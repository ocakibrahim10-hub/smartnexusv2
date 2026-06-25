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
} from 'lucide-react';
import { clearSession, getUser } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { hasModuleAccess } from '@/lib/modules';
import { ROLE_CFG } from '@/lib/role-permissions';

type NavItem = {
  label: string;
  icon: any;
  href?: string;
  children?: NavItem[];
  roles?: string[];
  module?: string;
  badge?: string;
};

const navConfig: NavItem[] = [
  { label: 'Boss Screen', icon: LayoutDashboard, href: '/dashboard' },
  {
    label: 'Bayi Merkezi',
    icon: Store,
    roles: ['DEALER', 'SUPERADMIN'],
    children: [
      {
        label: 'İşletmeler',
        icon: Building2,
        href: '/businesses',
        module: 'DEALER.BUSINESSES',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        label: 'Şube Takibi',
        icon: GitBranch,
        href: '/branches',
        module: 'DEALER.BRANCHES',
        roles: ['DEALER', 'SUPERADMIN', 'BUSINESS'],
      },
      {
        label: 'Hakediş',
        icon: Wallet,
        href: '/dealer/commission',
        module: 'DEALER.COMMISSION',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        label: 'Platform Faturaları',
        icon: Receipt,
        href: '/dealer/billing',
        module: 'DEALER.BILLING',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        label: 'Gelişmiş Raporlar',
        icon: BarChart3,
        href: '/dealer/reports',
        module: 'DEALER.REPORTS',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        label: 'Mesajlar',
        icon: MessageSquare,
        href: '/messages',
        module: 'DEALER.MESSAGES',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        label: 'Abonelikler',
        icon: CreditCard,
        href: '/subscriptions',
        module: 'DEALER.SUBSCRIPTIONS',
        roles: ['DEALER', 'SUPERADMIN'],
      },
      {
        label: 'Kullanıcılar',
        icon: Users,
        href: '/users',
        module: 'DEALER.USERS',
        roles: ['DEALER', 'SUPERADMIN', 'BUSINESS', 'BRANCH'],
      },
    ],
  },
  {
    label: 'Platform Yönetimi',
    icon: Settings,
    roles: ['SUPERADMIN'],
    children: [
      { label: 'Bayiler', icon: Store, href: '/dealers', roles: ['SUPERADMIN'] },
      { label: 'Hakediş Özeti', icon: Wallet, href: '/admin/commission', roles: ['SUPERADMIN'] },
      { label: 'Tüm İşletmeler', icon: Building2, href: '/businesses', roles: ['SUPERADMIN'] },
      { label: 'Abonelikler', icon: CreditCard, href: '/subscriptions', roles: ['SUPERADMIN'] },
    ],
  },
  {
    label: 'Hızlı Satış (POS)',
    icon: Monitor,
    href: '/pos',
    roles: ['BUSINESS', 'BRANCH'],
    module: 'POS.MAIN',
  },
  {
    label: 'Stok & Depo',
    icon: Package,
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN', 'DEALER'],
    children: [
      {
        label: 'Ürünler',
        icon: Package,
        href: '/inventory/products',
        module: 'INVENTORY.PRODUCTS',
      },
      {
        label: 'Depolar',
        icon: Warehouse,
        href: '/inventory/warehouses',
        module: 'INVENTORY.WAREHOUSES',
      },
      {
        label: 'Stok Hareketleri',
        icon: BarChart3,
        href: '/inventory/movements',
        module: 'INVENTORY.MOVEMENTS',
      },
      {
        label: 'Transfer Emirleri',
        icon: GitBranch,
        href: '/inventory/transfers',
        module: 'INVENTORY.TRANSFERS',
      },
      {
        label: 'AI Talep Tahmini',
        icon: Brain,
        href: '/inventory/forecasting',
        module: 'INVENTORY.AI_FORECAST',
      },
    ],
  },
  {
    label: 'Muhasebe',
    icon: BookOpen,
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN', 'DEALER'],
    children: [
      {
        label: 'Faturalar',
        icon: FileText,
        href: '/accounting/invoices',
        module: 'ACCOUNTING.INVOICES',
      },
      {
        label: 'Cari Hesaplar',
        icon: Users,
        href: '/accounting/contacts',
        module: 'ACCOUNTING.CONTACTS',
      },
      {
        label: 'Kasa & Banka',
        icon: CreditCard,
        href: '/accounting/cash',
        module: 'ACCOUNTING.CASH',
      },
      {
        label: 'E-Dönüşüm',
        icon: FileText,
        href: '/accounting/einvoice',
        module: 'ACCOUNTING.EDOCUMENT',
      },
      { label: 'Raporlar', icon: BarChart3, href: '/reports', module: 'ACCOUNTING.REPORTS' },
    ],
  },
  {
    label: 'Lojistik (TMS)',
    icon: Truck,
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN', 'DEALER'],
    children: [
      { label: 'Sevkiyatlar', icon: Truck, href: '/tms/shipments', module: 'TMS.SHIPMENTS' },
      { label: 'Araçlar', icon: Truck, href: '/tms/vehicles', module: 'TMS.VEHICLES' },
    ],
  },
  {
    label: 'B2B Portal',
    icon: ShoppingCart,
    roles: ['BUSINESS', 'BRANCH', 'SUPERADMIN', 'DEALER'],
    children: [
      { label: 'Siparişler', icon: ShoppingCart, href: '/b2b/orders', module: 'B2B.ORDERS' },
      { label: 'Müşteriler', icon: Users, href: '/b2b/customers', module: 'B2B.CUSTOMERS' },
      {
        label: 'Fiyat Listeleri',
        icon: FileText,
        href: '/b2b/price-lists',
        module: 'B2B.PRICE_LISTS',
      },
    ],
  },
  {
    label: 'Pazaryeri',
    icon: ShoppingBag,
    href: '/marketplace',
    roles: ['BUSINESS', 'BRANCH'],
    module: 'MARKETPLACE.MAIN',
  },
  {
    label: 'Personel & Roller',
    icon: Users,
    href: '/users',
    roles: ['BUSINESS', 'BRANCH', 'DEALER'],
    module: 'DEALER.USERS',
  },
  {
    label: 'Şubeler',
    icon: GitBranch,
    href: '/branches',
    roles: ['BUSINESS'],
    module: 'MULTI_BRANCH.MAIN',
  },
  { label: 'Destek', icon: Headphones, href: '/support', badge: '3' },
  { label: 'Ayarlar', icon: Settings, href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const userModules: string[] = user?.modules ?? [];
  const tenantType = user?.tenantType ?? '';

  const hasModule = (mod?: string) => hasModuleAccess(userModules, mod, tenantType);
  const hasRole = (roles?: string[]) => !roles || roles.includes(tenantType);
  const canShow = (item: NavItem) => hasRole(item.roles) && hasModule(item.module);

  const visibleNav = navConfig.filter((item) => {
    if (!canShow(item)) return false;
    if (item.children) return item.children.some((c) => canShow(c));
    return true;
  });

  const defaultOpen =
    tenantType === 'DEALER'
      ? ['Bayi Merkezi']
      : tenantType === 'BUSINESS' || tenantType === 'BRANCH'
        ? ['Stok & Depo', 'Muhasebe']
        : ['Platform Yönetimi', 'Stok & Depo', 'Muhasebe'];
  const [openGroups, setOpenGroups] = useState<string[]>(defaultOpen);
  const [collapsed, setCollapsed] = useState(false);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label],
    );
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearSession();
    router.push('/login');
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
            <div className="text-gray-500 text-xs mt-0.5 truncate">
              {tenantType === 'SUPERADMIN' ? 'SuperAdmin' : user?.tenantName}
            </div>
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
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-[var(--theme-primary)]">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 text-xs font-semibold truncate">{user?.name}</div>
              <div className="text-gray-500 text-xs truncate">
                {tenantType === 'SUPERADMIN' ? 'SuperAdmin' : user?.tenantName}
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
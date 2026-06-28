'use client';

import { usePathname, useRouter } from 'next/navigation';
import { normalizePanelHref, panelNavigate } from '@/lib/panel-navigate';
import { useState, useMemo, useEffect } from 'react';
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
  Search,
  PlusSquare,
  CheckSquare
} from 'lucide-react';
import { clearSession, getUser } from '@/lib/auth';
import { authApi } from '@/lib/api';
import { hasModuleAccess } from '@/lib/modules';
import { ROLE_CFG, canManageUsers } from '@/lib/role-permissions';
import { PanelType, withPanel, panelLoginPath } from '@/lib/panel';
import { useShortcuts } from '@/hooks/useShortcuts';

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
  { label: 'Masaüstü', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'POS Satış', icon: Monitor, href: '/pos', module: 'POS.MAIN' },
  { label: 'Cari Listesi', icon: Users, href: '/accounting/contacts', module: 'ACCOUNTING.CONTACTS' },
  {
    label: 'Malzeme Yönetimi',
    icon: Package,
    children: [
      {
        label: 'Ana Kayıtlar',
        icon: FileText,
        children: [
          { label: 'Ürünler', icon: Package, href: '/inventory/products', module: 'INVENTORY.PRODUCTS' },
          { label: 'Depolar', icon: Warehouse, href: '/inventory/warehouses', module: 'INVENTORY.WAREHOUSES' },
        ]
      },
      {
        label: 'Hareketler',
        icon: Activity,
        children: [
          { label: 'Stok Hareketleri', icon: BarChart3, href: '/inventory/movements', module: 'INVENTORY.MOVEMENTS' },
          { label: 'Transferler', icon: GitBranch, href: '/inventory/transfers', module: 'INVENTORY.TRANSFERS' },
        ]
      },
      {
        label: 'Raporlar',
        icon: PieChart,
        children: [
          { label: 'Yapay Zeka (AI) Tahmin', icon: Brain, href: '/inventory/forecasting', module: 'INVENTORY.AI_FORECAST' }
        ]
      }
    ],
  },
  {
    label: 'Satış ve Dağıtım',
    icon: ShoppingCart,
    children: [
      {
        label: 'İşlemler',
        icon: Activity,
        children: [
          { label: 'Satış Faturaları', icon: FileText, href: '/accounting/invoices', module: 'ACCOUNTING.INVOICES' },
        ]
      },
      {
        label: 'B2B & Pazaryeri',
        icon: ShoppingBag,
        children: [
          { label: 'B2B Siparişler', icon: ShoppingCart, href: '/b2b/orders', module: 'B2B.ORDERS' },
          { label: 'B2B Müşteriler', icon: Users, href: '/b2b/customers', module: 'B2B.CUSTOMERS' },
          { label: 'Fiyat Listeleri', icon: FileText, href: '/b2b/price-lists', module: 'B2B.PRICE_LISTS' },
          { label: 'Pazaryeri', icon: ShoppingBag, href: '/marketplace', module: 'MARKETPLACE.MAIN' },
          { label: 'E-Ticaret (B2C)', icon: Globe, href: '/b2c', module: 'B2C.MAIN' },
        ]
      },
      {
        label: 'TMS (Lojistik)',
        icon: Truck,
        children: [
          { label: 'Sevkiyatlar', icon: Truck, href: '/tms/shipments', module: 'TMS.SHIPMENTS' },
          { label: 'Araçlar', icon: Truck, href: '/tms/vehicles', module: 'TMS.VEHICLES' },
        ]
      }
    ]
  },
  {
    label: 'Satınalma',
    icon: ShoppingBag,
    children: [
      {
        label: 'İşlemler',
        icon: Activity,
        children: [
          { label: 'Alım Faturaları', icon: Package, href: '/accounting/purchases', module: 'ACCOUNTING.INVOICES' },
        ]
      }
    ]
  },
  {
    label: 'Finans',
    icon: Wallet,
    children: [
      {
        label: 'Ana Kayıtlar',
        icon: FileText,
        children: [
          { label: 'Cari Hesaplar', icon: Users, href: '/accounting/contacts', module: 'ACCOUNTING.CONTACTS' },
          { label: 'Kasa & Banka', icon: Wallet, href: '/accounting/cash', module: 'ACCOUNTING.CASH' },
        ]
      },
      {
        label: 'Hareketler',
        icon: Activity,
        children: [
          { label: 'Çek / Senet', icon: Receipt, href: '/accounting/checks', module: 'ACCOUNTING.CASH' },
          { label: 'Giderler', icon: Receipt, href: '/accounting/expenses', module: 'ACCOUNTING.EXPENSES' },
        ]
      },
      {
        label: 'Raporlar',
        icon: PieChart,
        children: [
          { label: 'Raporlar Merkezi', icon: BarChart3, href: '/reports', module: 'ACCOUNTING.REPORTS' },
          { label: 'Denetim Kaydı', icon: Shield, href: '/accounting/audit', module: 'ACCOUNTING.AUDIT' },
        ]
      }
    ]
  },
  {
    label: 'Genel Muhasebe',
    icon: BookOpen,
    children: [
      { label: 'Yevmiye / Mizan', icon: BookOpen, href: '/accounting/ledger', module: 'ACCOUNTING.LEDGER' },
    ]
  },
  {
    label: 'Üretim (MRP)',
    icon: Factory,
    children: [
      { label: 'Reçeteler (BOM)', icon: FileText, href: '/mrp/boms', module: 'MRP.MAIN' },
      { label: 'İş Emirleri', icon: Activity, href: '/mrp/work-orders', module: 'MRP.MAIN' },
    ],
  },
  {
    label: 'İnsan Kaynakları',
    icon: UserCog,
    children: [
      { label: 'Personel Listesi', icon: Users, href: '/hr/personnel', module: 'HR.PERSONNEL' },
      { label: 'İzin Yönetimi', icon: FileText, href: '/hr/leaves', module: 'HR.LEAVES' },
      { label: 'Bordrolar', icon: Receipt, href: '/hr/payroll', module: 'HR.PAYROLL' },
    ],
  },
  {
    label: 'Müşteri İlişkileri (CRM)',
    icon: Users,
    children: [
      { label: 'Aday Müşteriler', icon: Users, href: '/crm/leads', module: 'CRM.LEADS' },
      { label: 'Satış Hunisi', icon: Activity, href: '/crm/pipeline', module: 'CRM.PIPELINE' },
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
    label: 'e-Devlet (e-Dönüşüm)',
    icon: Globe,
    children: [
      { label: 'e-Fatura / e-Arşiv', icon: FileText, href: '/accounting/einvoice', module: 'ACCOUNTING.EDOCUMENT' },
    ]
  },
  { label: 'AI Asistan', icon: Bot, href: '/ai-assistant', module: 'AI.ASSISTANT' },
  { label: 'Kontör', icon: Coins, href: '/kontor', managerOnly: true },
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

// Rekürsif arama fonksiyonu
function searchNavItems(items: NavItem[], query: string): NavItem[] {
  if (!query) return items;
  const lowerQuery = query.toLowerCase();

  return items.map(item => {
    const matchSelf = item.label.toLowerCase().includes(lowerQuery);
    let filteredChildren: NavItem[] = [];
    
    if (item.children) {
      filteredChildren = searchNavItems(item.children, query);
    }

    if (matchSelf || filteredChildren.length > 0) {
      return {
        ...item,
        children: item.children ? (matchSelf && !filteredChildren.length ? item.children : filteredChildren) : undefined
      };
    }
    return null;
  }).filter(Boolean) as NavItem[];
}

// Yol bulucuya artık gerek yok, yolları (path) renderItem içinde birleştirerek çözüyoruz

function sidebarPanelLabel(panel: PanelType): string {
  if (panel === 'nexusadmin') return 'Nexus Admin';
  if (panel === 'bayi') return 'Bayi Paneli';
  return 'İşletme Paneli';
}

function collectNavLeaves(items: NavItem[], prefix = ''): { label: string; href: string; icon: NavItem['icon'] }[] {
  const out: { label: string; href: string; icon: NavItem['icon'] }[] = [];
  for (const item of items) {
    const trail = prefix ? `${prefix} › ${item.label}` : item.label;
    if (item.href) out.push({ label: trail, href: item.href, icon: item.icon });
    if (item.children) out.push(...collectNavLeaves(item.children, trail));
  }
  return out;
}

export default function PanelSidebar({
  panel,
  collapsed = false,
  onRequestExpand,
}: {
  panel: PanelType;
  collapsed?: boolean;
  onRequestExpand?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const userModules: string[] = user?.modules ?? [];
  const tenantType = user?.tenantType ?? '';
  const navConfig = getNavForPanel(panel);
  
  const { shortcuts, addShortcut, removeShortcut, hasShortcut } = useShortcuts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [collapsedFlyout, setCollapsedFlyout] = useState<{
    title: string;
    items: { label: string; href: string; icon: NavItem['icon'] }[];
    top: number;
  } | null>(null);

  // Sayfa yüklendiğinde veya değiştiğinde aktif olan grubu bul
  useEffect(() => {
    const findActiveGroups = (items: NavItem[], path: string[] = [], pathStr: string = ''): string[] => {
      for (const item of items) {
        const currentPathStr = pathStr ? `${pathStr}/${item.label}` : item.label;
        if (item.href && (pathname === item.href || pathname.startsWith(item.href + '/'))) return [...path, currentPathStr];
        if (item.children) {
          const found = findActiveGroups(item.children, [...path, currentPathStr], currentPathStr);
          if (found.length) return found;
        }
      }
      return [];
    };
    
    const activeGroups = findActiveGroups(navConfig);
    setOpenGroups(activeGroups);
  }, [pathname, navConfig]);

  const hasModule = (mod?: string) => hasModuleAccess(userModules, mod, tenantType);
  const hasRole = (roles?: string[]) => !roles || roles.includes(tenantType);
  const hasTenantType = (types?: string[]) => !types || types.includes(tenantType);
  const isManager = canManageUsers(user?.role || '');
  
  const canShow = (item: NavItem) =>
    hasRole(item.roles) &&
    hasTenantType(item.tenantTypes) &&
    (!item.managerOnly || isManager) &&
    hasModule(item.module);

  // Rol ve yetkilere göre filtrele
  const filterByPermissions = (items: NavItem[]): NavItem[] => {
    return items.map(item => {
      if (!canShow(item)) return null;
      let children: NavItem[] | undefined = undefined;
      if (item.children) {
        children = filterByPermissions(item.children);
        if (children.length === 0) return null;
      }
      return { ...item, children };
    }).filter(Boolean) as NavItem[];
  };

  const permittedNav = useMemo(() => filterByPermissions(navConfig), [navConfig]);
  const visibleNav = useMemo(() => searchNavItems(permittedNav, searchQuery), [permittedNav, searchQuery]);

  // Arama yapıldığında tüm grupları aç
  useEffect(() => {
    if (searchQuery.length > 1) {
      const allGroupPaths: string[] = [];
      const extractPaths = (items: NavItem[], pathStr: string = '') => {
        items.forEach(it => {
          if (it.children) {
            const currentPathStr = pathStr ? `${pathStr}/${it.label}` : it.label;
            allGroupPaths.push(currentPathStr);
            extractPaths(it.children, currentPathStr);
          }
        });
      };
      extractPaths(visibleNav);
      setOpenGroups(allGroupPaths);
    }
  }, [searchQuery, visibleNav]);

  const toggleGroup = (currentPathStr: string, parentPathStr: string | null) => {
    setOpenGroups((prev) => {
      if (prev.includes(currentPathStr)) {
        return parentPathStr ? parentPathStr.split('/').map((_, i, arr) => arr.slice(0, i+1).join('/')) : [];
      } else {
        return currentPathStr.split('/').map((_, i, arr) => arr.slice(0, i+1).join('/'));
      }
    });
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    clearSession();
    router.push(panelLoginPath(panel));
  };

  const handleGroupClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    currentPathStr: string,
    parentPathStr: string | null,
    item: NavItem,
  ) => {
    if (collapsed && item.children) {
      const rect = e.currentTarget.getBoundingClientRect();
      setCollapsedFlyout({
        title: item.label,
        items: collectNavLeaves(item.children),
        top: rect.top,
      });
      return;
    }
    if (collapsed) {
      onRequestExpand?.();
    }
    toggleGroup(currentPathStr, parentPathStr);
  };

  const handleLeafNavigate = (href: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    setCollapsedFlyout(null);
    panelNavigate(href, panel);
  };

  const isActive = (href?: string) =>
    Boolean(href && (pathname === href || pathname.startsWith(`${href}/`)));
  
  // Render Item (Recursive)
  const renderItem = (item: NavItem, depth: number = 0, pathStr: string = '') => {
    const currentPathStr = pathStr ? `${pathStr}/${item.label}` : item.label;
    const parentPathStr = pathStr || null;

    if (!item.children) {
      const active = isActive(item.href);
      const isShortcut = item.href ? hasShortcut(item.href) : false;
      return (
        <div key={currentPathStr} className="group flex items-center gap-0.5 pr-1">
          <a
            href={normalizePanelHref(item.href!, panel)}
            onClick={(e) => handleLeafNavigate(item.href!, e)}
            title={collapsed ? item.label : undefined}
            className={`sidebar-item flex-1 min-w-0 flex items-center py-2 transition-colors hover:bg-gray-100 ${active ? 'active bg-[#E0E0FF] text-[#3944B8] rounded-md font-medium' : 'text-gray-600'} ${collapsed ? 'justify-center px-2' : ''}`}
            style={collapsed ? undefined : { paddingLeft: `${depth * 1 + 1}rem` }}
          >
            <item.icon className={`w-4 h-4 flex-shrink-0 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && <span className="flex-1 text-left truncate text-[13px]">{item.label}</span>}
          </a>
          
          {!collapsed && item.href && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isShortcut) {
                   removeShortcut(item.href as string);
                } else {
                   addShortcut({ label: item.label, href: item.href as string, iconName: item.icon.displayName || 'FileText' });
                }
              }}
              className={`flex-shrink-0 p-1.5 rounded-md hover:bg-gray-200 transition-opacity ${isShortcut ? 'text-green-600' : 'text-gray-400 opacity-0 group-hover:opacity-100 focus:opacity-100'}`}
              title={isShortcut ? "Masaüstünden Kaldır" : "Masaüstüne Kısayol Ekle"}
            >
              {isShortcut ? <CheckSquare className="w-3.5 h-3.5" /> : <PlusSquare className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      );
    }

    const isOpen = openGroups.includes(currentPathStr);

    return (
      <div key={currentPathStr} className="w-full">
        <button
          type="button"
          title={collapsed ? item.label : undefined}
          onClick={(e) => handleGroupClick(e, currentPathStr, parentPathStr, item)}
          className={`sidebar-item w-full flex items-center py-2.5 transition-colors hover:bg-gray-50 ${isOpen && depth === 0 ? 'text-gray-900 font-semibold' : 'text-gray-700'} ${collapsed ? 'justify-center px-2' : ''}`}
          style={collapsed ? undefined : { paddingLeft: `${depth * 1 + 1}rem` }}
        >
          <item.icon className={`w-4 h-4 flex-shrink-0 ${collapsed ? '' : 'mr-3'} ${depth > 0 ? 'text-gray-500' : 'text-gray-600'}`} />
          {!collapsed && (
            <>
              <span className={`flex-1 text-left truncate ${depth > 0 ? 'text-[13px]' : 'text-sm'}`}>{item.label}</span>
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-2 mr-2" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 ml-2 mr-2" />
              )}
            </>
          )}
        </button>
        {isOpen && !collapsed && (
          <div className="flex flex-col">
            {item.children.map(child => renderItem(child, depth + 1, currentPathStr))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside
      className={`dashboard-sidebar flex flex-col h-screen transition-all duration-300 z-[200] flex-shrink-0 border-r border-gray-200 bg-[#f8f9fa] ${collapsed ? 'w-[72px]' : 'w-[280px]'}`}
    >
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white bg-[var(--theme-primary)]">
            <Zap className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-gray-900 font-bold text-base leading-none">SmartNexus</div>
              <div className="text-gray-500 text-xs mt-0.5 truncate">{sidebarPanelLabel(panel)}</div>
            </div>
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 border-b border-gray-200 bg-[#f8f9fa]">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" />
            <input
              type="text"
              placeholder="Menüde Arama Yapın..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 custom-scrollbar bg-white">
        {visibleNav.length === 0 ? (
          <div className="text-center p-4 text-sm text-gray-500">Sonuç bulunamadı</div>
        ) : (
          visibleNav.map(item => renderItem(item, 0))
        )}
      </nav>

      <div className="p-3 border-t border-gray-200 bg-[#f8f9fa]">
        {!collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-[var(--theme-primary)]">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 text-xs font-semibold truncate">{user?.name}</div>
              <div className="text-gray-500 text-[11px] truncate">
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

      {collapsedFlyout && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/10"
            aria-label="Menüyü kapat"
            onClick={() => setCollapsedFlyout(null)}
          />
          <div
            className="fixed z-50 w-72 max-h-[70vh] overflow-y-auto bg-white border border-[#EFEDF4] rounded-xl shadow-xl py-2"
            style={{ left: 76, top: Math.min(collapsedFlyout.top, 400) }}
          >
            <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100 mb-1">
              {collapsedFlyout.title}
            </div>
            {collapsedFlyout.items.map((leaf) => (
              <a
                key={leaf.href}
                href={normalizePanelHref(leaf.href, panel)}
                onClick={(e) => handleLeafNavigate(leaf.href, e)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-[#FBF8FF] transition-colors ${
                  pathname === leaf.href || pathname.startsWith(`${leaf.href}/`)
                    ? 'bg-[#E0E0FF] text-[#3944B8] font-medium'
                    : 'text-gray-700'
                }`}
              >
                <leaf.icon className="w-4 h-4 flex-shrink-0 text-gray-500" />
                <span className="truncate">{leaf.label}</span>
              </a>
            ))}
          </div>
        </>
      )}
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .custom-scrollbar:hover::-webkit-scrollbar-thumb {
          background: #9ca3af;
        }
      `}} />
    </aside>
  );
}

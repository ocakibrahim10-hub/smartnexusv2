'use client';

import { Bell, Search, HelpCircle, Monitor, Menu } from 'lucide-react';
import { getUser } from '@/lib/auth';
import { KontorStatsStrip, SubscriptionDaysStrip } from '@/components/KontorAlertBanner';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  collapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function TopBar({ title, subtitle, collapsed, onToggleSidebar }: TopBarProps) {
  const user = getUser();

  return (
    <header className="topbar">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
            title="Menüyü Aç/Kapat"
            aria-label="Menüyü Aç/Kapat"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0">
          {title && <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>}
          {subtitle && <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>

      <div className="topbar-search">
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          placeholder="Hızlı arama... (Ctrl+K)"
          aria-label="Hızlı arama"
          className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
        />
      </div>

      <div className="flex items-center gap-1">
        <SubscriptionDaysStrip />
        <KontorStatsStrip />
        <button
          type="button"
          onClick={() => {
            const code = user?.tenantCode;
            const q = code ? `?tenant=${encodeURIComponent(code)}` : '';
            window.open(`/pos-terminal${q}`, 'posWindow', 'width=1280,height=800');
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-semibold transition-colors mr-2 shadow-sm"
        >
          <Monitor className="w-4 h-4" />
          <span className="hidden sm:inline">POS'u Aç</span>
        </button>
        <button
          type="button"
          aria-label="Bildirimler"
          className="relative p-2.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>
        <button
          type="button"
          aria-label="Yardım"
          className="p-2.5 text-gray-500 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <HelpCircle className="w-[18px] h-[18px]" />
        </button>

        <div className="flex items-center gap-2.5 ml-1 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold bg-[var(--theme-primary)]">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="hidden md:block min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">
              {user?.name || 'Kullanıcı'}
            </div>
            <div className="text-xs text-gray-500 truncate">{user?.tenantName || ''}</div>
          </div>
        </div>
      </div>
    </header>
  );
}

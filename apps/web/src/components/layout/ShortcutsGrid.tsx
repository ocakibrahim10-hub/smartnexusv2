'use client';

import { useShortcuts } from '@/hooks/useShortcuts';
import { useRouter } from 'next/navigation';
import { PlusSquare, LayoutDashboard, FileText, Settings, Users, Store, Building2, Package, Warehouse, BookOpen, Truck, ShoppingCart, BarChart3, Headphones, MessageSquare, Shield, Coins, Bell, ClipboardList, Zap, Database, CreditCard, GitBranch, Monitor, Brain, ShoppingBag, Receipt, Wallet, Activity, Bot, Factory, UserCog, Globe, ScanLine, MapPin } from 'lucide-react';
import Link from 'next/link';

// Helper to map string icon name to actual lucide-react component
const iconMap: Record<string, any> = {
  LayoutDashboard, Users, Store, Building2, Package, Warehouse, FileText, BookOpen, Truck, ShoppingCart, BarChart3, Headphones, MessageSquare, Settings, Zap, Database, CreditCard, GitBranch, Monitor, Brain, ShoppingBag, Receipt, Wallet, Activity, Bot, Factory, UserCog, Globe, ScanLine, MapPin, Shield, Coins, Bell, ClipboardList
};

export default function ShortcutsGrid() {
  const { shortcuts, removeShortcut } = useShortcuts();
  const router = useRouter();

  if (shortcuts.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-500" />
        Kısayollarım
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
        {shortcuts.map((shortcut) => {
          const Icon = iconMap[shortcut.iconName] || FileText;
          return (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-md transition-all group relative"
            >
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Icon className="w-6 h-6" />
              </div>
              <span className="text-[13px] font-medium text-gray-700 text-center line-clamp-2 leading-tight">
                {shortcut.label}
              </span>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  removeShortcut(shortcut.href);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow flex"
                title="Kaldır"
              >
                &times;
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

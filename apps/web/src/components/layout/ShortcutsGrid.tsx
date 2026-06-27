'use client';

import { useState } from 'react';
import { useShortcuts, Shortcut, ShortcutGroup } from '@/hooks/useShortcuts';
import { useRouter } from 'next/navigation';
import { PlusSquare, LayoutDashboard, FileText, Settings, Users, Store, Building2, Package, Warehouse, BookOpen, Truck, ShoppingCart, BarChart3, Headphones, MessageSquare, Shield, Coins, Bell, ClipboardList, Zap, Database, CreditCard, GitBranch, Monitor, Brain, ShoppingBag, Receipt, Wallet, Activity, Bot, Factory, UserCog, Globe, ScanLine, MapPin, Edit2, Check, GripVertical, Trash2 } from 'lucide-react';

// Helper to map string icon name to actual lucide-react component
const iconMap: Record<string, any> = {
  LayoutDashboard, Users, Store, Building2, Package, Warehouse, FileText, BookOpen, Truck, ShoppingCart, BarChart3, Headphones, MessageSquare, Settings, Zap, Database, CreditCard, GitBranch, Monitor, Brain, ShoppingBag, Receipt, Wallet, Activity, Bot, Factory, UserCog, Globe, ScanLine, MapPin, Shield, Coins, Bell, ClipboardList
};

export default function ShortcutsGrid() {
  const { groups, saveGroups, removeShortcut } = useShortcuts();
  const router = useRouter();

  const [draggedItem, setDraggedItem] = useState<{ type: 'shortcut' | 'group', id: string, sourceGroupId?: string } | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleDragStart = (e: React.DragEvent, type: 'shortcut' | 'group', id: string, sourceGroupId?: string) => {
    setDraggedItem({ type, id, sourceGroupId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnGroup = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    if (!draggedItem) return;

    const newGroups = [...groups];
    
    if (draggedItem.type === 'shortcut' && draggedItem.sourceGroupId) {
      const sourceGroupIdx = newGroups.findIndex(g => g.id === draggedItem.sourceGroupId);
      const targetGroupIdx = newGroups.findIndex(g => g.id === targetGroupId);
      if (sourceGroupIdx === -1 || targetGroupIdx === -1) return;

      const itemIdx = newGroups[sourceGroupIdx].items.findIndex(i => i.id === draggedItem.id);
      if (itemIdx === -1) return;
      const [item] = newGroups[sourceGroupIdx].items.splice(itemIdx, 1);
      
      newGroups[targetGroupIdx].items.push(item);
      saveGroups(newGroups);
    } else if (draggedItem.type === 'group') {
      const sourceIdx = newGroups.findIndex(g => g.id === draggedItem.id);
      const targetIdx = newGroups.findIndex(g => g.id === targetGroupId);
      if (sourceIdx === -1 || targetIdx === -1 || sourceIdx === targetIdx) return;
      
      const [movedGroup] = newGroups.splice(sourceIdx, 1);
      newGroups.splice(targetIdx, 0, movedGroup);
      saveGroups(newGroups);
    }
    
    setDraggedItem(null);
  };

  const handleDropOnShortcut = (e: React.DragEvent, targetGroupId: string, targetShortcutId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.type !== 'shortcut' || !draggedItem.sourceGroupId) return;

    const newGroups = [...groups];
    const sourceGroupIdx = newGroups.findIndex(g => g.id === draggedItem.sourceGroupId);
    const targetGroupIdx = newGroups.findIndex(g => g.id === targetGroupId);
    if (sourceGroupIdx === -1 || targetGroupIdx === -1) return;

    const itemIdx = newGroups[sourceGroupIdx].items.findIndex(i => i.id === draggedItem.id);
    if (itemIdx === -1) return;
    const [item] = newGroups[sourceGroupIdx].items.splice(itemIdx, 1);
    
    const targetItemIdx = newGroups[targetGroupIdx].items.findIndex(i => i.id === targetShortcutId);
    newGroups[targetGroupIdx].items.splice(targetItemIdx !== -1 ? targetItemIdx : newGroups[targetGroupIdx].items.length, 0, item);
    saveGroups(newGroups);
    
    setDraggedItem(null);
  };

  const addGroup = () => {
    saveGroups([...groups, { id: `group-${Date.now()}`, title: 'Yeni Kısayol Grubu', items: [] }]);
  };

  const deleteGroup = (id: string) => {
    if (groups.length <= 1) return;
    saveGroups(groups.filter(g => g.id !== id));
  };

  const saveTitle = (id: string) => {
    if (!editTitle.trim()) return;
    const newGroups = groups.map(g => g.id === id ? { ...g, title: editTitle } : g);
    saveGroups(newGroups);
    setEditingGroupId(null);
  };

  return (
    <div className="space-y-6 min-h-[400px]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          Kısayol Masaüstü
        </h3>
        <button onClick={addGroup} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 flex items-center gap-1 transition-colors">
          <PlusSquare className="w-4 h-4" /> Yeni Klasör Ekle
        </button>
      </div>

      {groups.map((group) => (
        <div 
          key={group.id} 
          className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-xl shadow-sm transition-all hover:bg-white hover:shadow-md flex flex-col"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnGroup(e, group.id)}
        >
          <div 
            className="flex items-center justify-between p-3 border-b border-gray-100 cursor-grab active:cursor-grabbing bg-gray-50/50 rounded-t-xl"
            draggable
            onDragStart={(e) => handleDragStart(e, 'group', group.id)}
          >
            <div className="flex items-center gap-2 flex-1">
              <GripVertical className="w-4 h-4 text-gray-400" />
              {editingGroupId === group.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm outline-none focus:ring-2 ring-blue-500/50"
                    autoFocus
                    title="Grup Adı"
                    aria-label="Grup Adı"
                    placeholder="Klasör ismini girin"
                    onKeyDown={e => e.key === 'Enter' && saveTitle(group.id)}
                  />
                  <button onClick={() => saveTitle(group.id)} title="Kaydet" aria-label="Kaydet" className="p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors">
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <h4 className="font-medium text-gray-800 flex items-center gap-2 group/title">
                  {group.title}
                  <button onClick={() => { setEditingGroupId(group.id); setEditTitle(group.title); }} title="Düzenle" aria-label="Düzenle" className="text-gray-400 hover:text-blue-500 opacity-0 group-hover/title:opacity-100 transition-opacity">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </h4>
              )}
            </div>
            {groups.length > 1 && (
              <button onClick={() => deleteGroup(group.id)} title="Sil" aria-label="Sil" className="text-gray-400 hover:text-red-500 transition-colors p-1">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[120px]">
            {group.items.length === 0 && (
               <div className="col-span-full h-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl p-4 text-sm font-medium">
                 Kısayolları buraya sürükleyebilirsiniz
               </div>
            )}
            {group.items.map((shortcut) => {
              const Icon = iconMap[shortcut.iconName] || FileText;
              return (
                <div
                  key={shortcut.id || shortcut.href}
                  draggable
                  onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, 'shortcut', shortcut.id!, group.id); }}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => handleDropOnShortcut(e, group.id, shortcut.id!)}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:border-blue-500 hover:shadow-lg transition-all group relative cursor-grab active:cursor-grabbing"
                  onClick={() => router.push(shortcut.href)}
                >
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-[13px] font-medium text-gray-700 text-center line-clamp-2 leading-tight">
                    {shortcut.label}
                  </span>
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeShortcut(shortcut.href);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10"
                    title="Kaldır"
                  >
                    &times;
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}


'use client';

import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import {
  MODULE_CATALOG,
  expandLegacyModules,
  getCatalogForTenantType,
  isGroupFullyEnabled,
  isGroupPartiallyEnabled,
  toggleGroupModules,
  type ModuleGroupDef,
} from '@/lib/modules';

type Props = {
  modules: string[];
  onChange: (modules: string[]) => void;
  tenantType?: string;
  showAll?: boolean;
  /** light = beyaz modal/form, dark = koyu panel */
  variant?: 'light' | 'dark';
  renderExtraNode?: (childId: string) => React.ReactNode;
};

const styles = {
  light: {
    group: 'border-gray-200 bg-gray-50 hover:bg-gray-100',
    groupLabel: 'text-gray-900 font-medium',
    count: 'text-gray-500',
    chevron: 'text-gray-400',
    childActive: 'border-indigo-400 bg-indigo-50 text-indigo-900 font-medium',
    childInactive: 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50',
    checkBoxOn: 'bg-indigo-600 border-indigo-600',
    checkBoxPartial: 'bg-indigo-300 border-indigo-400',
    checkBoxOff: 'border-gray-300 bg-white',
    groupCheckOn: 'bg-indigo-600 border-indigo-600',
    groupCheckPartial: 'bg-indigo-400 border-indigo-400',
    groupCheckOff: 'border-gray-300 bg-white',
  },
  dark: {
    group: 'border-white/10 bg-white/5 hover:bg-white/10',
    groupLabel: 'text-white font-medium',
    count: 'text-gray-500',
    chevron: 'text-gray-400',
    childActive: 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100 font-medium',
    childInactive: 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10',
    checkBoxOn: 'bg-indigo-600 border-indigo-500',
    checkBoxPartial: 'bg-indigo-600/40 border-indigo-400',
    checkBoxOff: 'border-gray-600 bg-transparent',
    groupCheckOn: 'bg-indigo-600 border-indigo-500',
    groupCheckPartial: 'bg-indigo-600/40 border-indigo-400',
    groupCheckOff: 'border-gray-600 bg-transparent',
  },
} as const;

export default function ModulePicker({
  modules,
  onChange,
  tenantType,
  showAll,
  variant = 'light',
  renderExtraNode,
}: Props) {
  const s = styles[variant];
  const catalog = showAll ? MODULE_CATALOG : getCatalogForTenantType(tenantType || 'BUSINESS');
  const expanded = expandLegacyModules(modules);
  const [openGroups, setOpenGroups] = useState<string[]>(catalog.map((g) => g.id));

  const toggleChild = (id: string) => {
    onChange(expanded.includes(id) ? expanded.filter((m) => m !== id) : [...expanded, id]);
  };

  const toggleGroup = (group: ModuleGroupDef) => {
    onChange(toggleGroupModules(expanded, group.id, !isGroupFullyEnabled(expanded, group.id)));
  };

  return (
    <div className="space-y-2">
      {catalog.map((group) => {
        const isOpen = openGroups.includes(group.id);
        const full = isGroupFullyEnabled(expanded, group.id);
        const partial = isGroupPartiallyEnabled(expanded, group.id);
        return (
          <div
            key={group.id}
            className={`border rounded-lg overflow-hidden ${s.group.split(' ')[0]} ${s.group.includes('border-gray') ? 'border-gray-200' : 'border-white/10'}`}
          >
            <div className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${s.group}`}>
              <input
                type="checkbox"
                checked={full}
                ref={(node) => {
                  if (node) node.indeterminate = partial && !full;
                }}
                aria-label={`${group.label} modül grubu`}
                onChange={() => toggleGroup(group)}
                className={`w-5 h-5 rounded border flex-shrink-0 cursor-pointer ${
                  full ? s.groupCheckOn : partial ? s.groupCheckPartial : s.groupCheckOff
                }`}
              />
              <button
                type="button"
                aria-label={`${group.label} modül grubunu ${isOpen ? 'daralt' : 'genişlet'}`}
                onClick={() =>
                  setOpenGroups((p) =>
                    p.includes(group.id) ? p.filter((x) => x !== group.id) : [...p, group.id],
                  )
                }
                className="flex-1 flex items-center gap-3 min-w-0 bg-transparent border-0 p-0 cursor-pointer"
              >
                <span className={`flex-1 text-left ${s.groupLabel}`}>{group.label}</span>
                <span className={`text-xs ${s.count}`}>
                  {group.children.filter((c) => expanded.includes(c.id)).length}/
                  {group.children.length}
                </span>
                {isOpen ? (
                  <ChevronDown size={14} className={s.chevron} />
                ) : (
                  <ChevronRight size={14} className={s.chevron} />
                )}
              </button>
            </div>
            {isOpen && (
              <div className="px-4 pb-3 pt-1 grid grid-cols-2 gap-2">
                {group.children.map((child) => {
                  const active = expanded.includes(child.id);
                  return (
                    <div
                      key={child.id}
                      className={`flex items-center w-full p-2.5 rounded-lg border text-sm transition-all ${
                        active ? s.childActive : s.childInactive
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleChild(child.id)}
                        className="flex-1 flex items-center gap-2 text-left text-gray-700"
                      >
                        <span
                          className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                            active
                              ? 'bg-indigo-600 border-indigo-600'
                              : 'border-gray-300 group-hover:border-indigo-400'
                          }`}
                        >
                          {active && <Check size={10} className="text-white" />}
                        </span>
                        <div className="flex-1 text-left flex items-center">
                          {child.label}
                        </div>
                      </button>
                      {renderExtraNode && renderExtraNode(child.id)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

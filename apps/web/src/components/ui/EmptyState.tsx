'use client';

import { type LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-indigo-300" strokeWidth={1.5} />
      </div>
      <h3 className="text-gray-700 font-semibold text-base mb-1">{title}</h3>
      {description && <p className="text-gray-400 text-sm max-w-xs leading-relaxed">{description}</p>}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 btn-primary px-5 py-2 text-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

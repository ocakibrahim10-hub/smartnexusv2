'use client';

import {
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';

type LabelProps = {
  label: string;
  /** Görsel etiket gizlenir; ekran okuyucu için label/aria-label kalır */
  hideLabel?: boolean;
};

export function FormField({
  label,
  hideLabel = false,
  id: idProp,
  className,
  ...props
}: LabelProps & InputHTMLAttributes<HTMLInputElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className={hideLabel ? undefined : 'space-y-1'}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-xs text-gray-500 block'}>
        {label}
      </label>
      <input
        id={id}
        aria-label={hideLabel ? label : undefined}
        className={className ?? 'input w-full'}
        {...props}
      />
    </div>
  );
}

export function FormSelect({
  label,
  hideLabel = false,
  id: idProp,
  className,
  children,
  ...props
}: LabelProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className={hideLabel ? undefined : 'space-y-1'}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-xs text-gray-500 block'}>
        {label}
      </label>
      <select
        id={id}
        aria-label={hideLabel ? label : undefined}
        className={className ?? 'input w-full'}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function FormTextarea({
  label,
  hideLabel = false,
  id: idProp,
  className,
  ...props
}: LabelProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className={hideLabel ? undefined : 'space-y-1'}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-xs text-gray-500 block'}>
        {label}
      </label>
      <textarea
        id={id}
        aria-label={hideLabel ? label : undefined}
        className={className ?? 'input w-full min-h-[80px]'}
        {...props}
      />
    </div>
  );
}

export function IconButton({
  label,
  className,
  children,
  type = 'button',
  ...props
}: { label: string; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} aria-label={label} title={label} className={className} {...props}>
      {children}
    </button>
  );
}

/**
 * Lightweight toast event bus — no React context needed at call sites.
 * Usage: import { toast } from '@/lib/toast'
 *        toast.success('Kaydedildi')
 *        toast.error('Bir hata oluştu')
 *        toast.info('Bilgi mesajı')
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastEvent {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

type Listener = (event: ToastEvent) => void;

const listeners: Set<Listener> = new Set();

function emit(type: ToastType, message: string, duration = 4000) {
  const event: ToastEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    type,
    message,
    duration,
  };
  listeners.forEach((fn) => fn(event));
}

export const toast = {
  success: (msg: string, duration?: number) => emit('success', msg, duration),
  error: (msg: string, duration?: number) => emit('error', msg, duration ?? 6000),
  info: (msg: string, duration?: number) => emit('info', msg, duration),
  warning: (msg: string, duration?: number) => emit('warning', msg, duration),
  subscribe: (fn: Listener) => {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

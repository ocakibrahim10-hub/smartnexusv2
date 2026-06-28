'use client';

import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; fallbackTitle?: string };
type State = { error: Error | null };

export default class ClientErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  private handleRetry = async () => {
    const { resetStaleClientState } = await import('@/lib/reset-client-state');
    await resetStaleClientState();
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FBF8FF] p-6">
          <div className="card max-w-md w-full p-8 text-center">
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {this.props.fallbackTitle || 'Sayfa yüklenemedi'}
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Eski önbellek veya güncelleme sonrası geçici bir hata oluşmuş olabilir. Aşağıdaki
              düğmeyle önbelleği temizleyip tekrar deneyin.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="w-full py-3 px-4 rounded-xl bg-[#606BDF] text-white font-medium hover:opacity-95"
            >
              Önbelleği temizle ve yenile
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

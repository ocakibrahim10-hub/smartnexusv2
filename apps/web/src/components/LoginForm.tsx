'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { authApi } from '@/lib/api';
import { setSession } from '@/lib/auth';
import { PanelType, panelLabel } from '@/lib/panel';

type DemoVariant = 'purple' | 'emerald' | 'violet' | 'orange' | 'sky' | 'blue';

type Props = {
  panel: PanelType;
  allowPhone?: boolean;
  defaultMode?: 'email' | 'phone';
  demoAccounts?: { role: string; email: string; pass: string; variant: DemoVariant }[];
  phoneDemoAccounts?: { role: string; phone: string; pass: string; variant: DemoVariant }[];
  subtitle?: string;
};

export default function LoginForm({
  panel,
  allowPhone = false,
  defaultMode = 'email',
  demoAccounts = [],
  phoneDemoAccounts = [],
  subtitle,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'email' | 'phone'>(defaultMode);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await authApi.login(loginEmail, loginPassword, panel);
      setSession(data);
      router.push(data.user.homeRoute || `/${panel}/dashboard`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const doPhoneLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authApi.loginPhone(phone, password, panel);
      setSession(data);
      router.push(data.user.homeRoute || `/${panel}/dashboard`);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'phone') doPhoneLogin();
    else doLogin(email, password);
  };

  return (
    <div className="login-shell">
      <div className="login-brand-panel">
        <div>
          <div className="login-brand-logo">
            <div className="login-brand-icon">
              <Zap className="w-5 h-5" />
            </div>
            <span className="login-brand-name">SmartNexus</span>
          </div>
          <h1 className="login-brand-title">{panelLabel(panel)}</h1>
          <p className="login-brand-subtitle">
            {subtitle ||
              'Güvenli giriş ile panele erişin. Tüm işlemleriniz şifreli bağlantı ile korunur.'}
          </p>
        </div>
        <p className="login-brand-footer">© 2026 SmartNexus ERP Platform</p>
      </div>

      <div className="login-form">
        <div className="login-form-inner">
          <div className="login-mobile-logo">
            <Zap className="w-6 h-6" />
            <span>SmartNexus</span>
          </div>

          <h2 className="login-heading">Giriş Yap</h2>
          <p className="login-subheading">{panelLabel(panel)}</p>

          {allowPhone !== false && (
            <div className="login-mode-tabs">
              <button
                type="button"
                onClick={() => setMode('email')}
                className={`login-mode-tab${mode === 'email' ? ' login-mode-tab--active' : ''}`}
              >
                E-posta
              </button>
              <button
                type="button"
                onClick={() => setMode('phone')}
                className={`login-mode-tab${mode === 'phone' ? ' login-mode-tab--active' : ''}`}
              >
                Telefon
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'email' ? (
              <div className="login-field">
                <label htmlFor="login-email">E-posta</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@firma.com"
                  required
                  autoComplete="email"
                />
              </div>
            ) : (
              <div className="login-field">
                <label htmlFor="login-phone">Cep Telefonu</label>
                <input
                  id="login-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="5XX XXX XX XX"
                  required
                  autoComplete="tel"
                />
              </div>
            )}

            <div className="login-field">
              <label htmlFor="login-password">Şifre</label>
              <div className="login-password-wrap">
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="login-password-toggle"
                  aria-label={showPass ? 'Şifreyi gizle' : 'Şifreyi göster'}
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button type="submit" disabled={loading} className="login-submit">
              {loading ? 'Giriş yapılıyor…' : 'Giriş Yap'}
            </button>
          </form>

          {demoAccounts.length > 0 && (mode === 'email' || panel === 'isletme') && (
            <div>
              <p className="login-demo-label">
                {mode === 'phone' ? 'Demo İşletme' : 'Demo Hesaplar (E-posta)'}
              </p>
              <div className="login-demo-grid">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => doLogin(acc.email, acc.pass)}
                    className={`login-demo-btn login-demo-btn--${acc.variant}`}
                  >
                    {acc.role}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phoneDemoAccounts.length > 0 && mode === 'phone' && (
            <div>
              <p className="login-demo-label">Demo Personel (Telefon)</p>
              <div className="login-demo-grid">
                {phoneDemoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => {
                      setPhone(acc.phone);
                      setPassword(acc.pass);
                      setMode('phone');
                    }}
                    className={`login-demo-btn login-demo-btn--${acc.variant}`}
                  >
                    {acc.role}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="login-panel-links">
            {panel !== 'nexusadmin' && <a href="/nexusadmin">Admin</a>}
            {panel !== 'bayi' && <a href="/bayi">Bayi</a>}
            {panel !== 'isletme' && <a href="/isletme">İşletme</a>}
          </div>
        </div>
      </div>
    </div>
  );
}

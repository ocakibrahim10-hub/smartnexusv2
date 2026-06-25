'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/layout/TopBar';
import { FormField, FormSelect, FormTextarea } from '@/components/FormField';
import { platformApi } from '@/lib/api';
import { Bot, CheckCircle, Loader2, Plug, Save, Sparkles } from 'lucide-react';

type Settings = {
  enabled: boolean;
  provider: 'env' | 'openai' | 'gateway' | 'ollama';
  model: string;
  extraSystemPrompt: string;
  welcomeMessage: string;
  openaiApiKeyMasked: string;
  gatewayApiKeyMasked: string;
  hasOpenaiKey: boolean;
  hasGatewayKey: boolean;
  ollamaBaseUrl: string;
  envFallback: {
    openai: boolean;
    gateway: boolean;
    ollama: boolean;
    model: string | null;
    ollamaModel: string | null;
  };
  updatedAt?: string;
};

const CLOUD_MODEL_OPTIONS = [
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (önerilen, ekonomik)' },
  { value: 'openai/gpt-4o', label: 'GPT-4o (daha güçlü)' },
  { value: 'openai/gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'openai/gpt-4.1', label: 'GPT-4.1' },
];

const OLLAMA_MODEL_PRESETS = [
  'llama3.2:1b',
  'phi3:mini',
  'gemma2:2b',
  'qwen2.5:0.5b',
  'llama3.2',
  'mistral',
];

export default function ChatbotSettingsPage() {
  const [data, setData] = useState<Settings | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [provider, setProvider] = useState<'env' | 'openai' | 'gateway' | 'ollama'>('env');
  const [model, setModel] = useState('openai/gpt-4o-mini');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState('http://localhost:11434');
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [loadingOllamaModels, setLoadingOllamaModels] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [gatewayKey, setGatewayKey] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [extraPrompt, setExtraPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok?: boolean;
    reply?: string;
    error?: string;
    notice?: string;
  } | null>(null);
  const [saveMsg, setSaveMsg] = useState('');

  const load = () => {
    platformApi
      .getChatbotSettings()
      .then((s: Settings) => {
        setData(s);
        setEnabled(s.enabled);
        setProvider(s.provider);
        setModel(s.model || 'openai/gpt-4o-mini');
        setOpenaiKey(s.openaiApiKeyMasked || '');
        setGatewayKey(s.gatewayApiKeyMasked || '');
        setOllamaBaseUrl(s.ollamaBaseUrl || 'http://localhost:11434');
        setWelcomeMessage(s.welcomeMessage || '');
        setExtraPrompt(s.extraSystemPrompt || '');
      })
      .catch(() => setData(null));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveMsg('');
    setTestResult(null);
    try {
      await platformApi.updateChatbotSettings({
        enabled,
        provider,
        model,
        ollamaBaseUrl,
        welcomeMessage,
        extraSystemPrompt: extraPrompt,
        openaiApiKey: openaiKey,
        gatewayApiKey: gatewayKey,
      });
      setSaveMsg('Ayarlar kaydedildi.');
      load();
    } catch (e: any) {
      setSaveMsg(e?.response?.data?.message || 'Kayıt başarısız.');
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await platformApi.testChatbotSettings();
      setTestResult({ ok: true, reply: res.reply, notice: res.notice });
      load();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Test başarısız';
      setTestResult({ error: Array.isArray(msg) ? msg.join(', ') : String(msg) });
    } finally {
      setTesting(false);
    }
  };

  const onProviderChange = (next: 'env' | 'openai' | 'gateway' | 'ollama') => {
    setProvider(next);
    if (next === 'ollama' && (model.startsWith('openai/') || model === 'llama3.2')) {
      setModel('llama3.2:1b');
    }
    if (next !== 'ollama' && OLLAMA_MODEL_PRESETS.includes(model)) {
      setModel('openai/gpt-4o-mini');
    }
  };

  const fetchOllamaModels = async () => {
    setLoadingOllamaModels(true);
    try {
      const res = await platformApi.listOllamaModels(ollamaBaseUrl);
      setOllamaModels(res.models || []);
      if (res.models?.length && !res.models.includes(model)) {
        setModel(res.models[0]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Ollama modelleri alınamadı';
      setTestResult({ error: Array.isArray(msg) ? msg.join(', ') : String(msg) });
      setOllamaModels([]);
    } finally {
      setLoadingOllamaModels(false);
    }
  };

  const envHint = data?.envFallback;

  return (
    <>
      <TopBar
        title="Nexus Asistan"
        subtitle="Yapay zeka destek chatbot — API anahtarı, model ve davranış ayarları"
      />
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="card p-5 flex items-start gap-4 border-[#606BDF]/20 bg-[#FBF8FF]">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 bg-[#606BDF]"
          >
            <Bot className="w-6 h-6" />
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="font-semibold text-gray-900">Nexus Asistan nedir?</p>
            <p>
              Tüm panellerde ve kamu sitesinde görünen yardım asistanıdır. Kullanıcılara abonelik,
              paket, kontör ve modül kullanımı hakkında Türkçe yanıt verir.
            </p>
            <p className="text-xs text-gray-500">
              Ayarları buradan kaydettiğinizde sunucu yeniden başlatmaya gerek kalmaz; chatbot anında
              yeni yapılandırmayı kullanır.
            </p>
          </div>
        </div>

        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#606BDF]" /> Genel
            </h2>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              Asistan etkin
            </label>
          </div>

          <div>
            <FormField
              label="Karşılama mesajı"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">Chatbot açıldığında kullanıcıya gösterilen ilk mesaj.</p>
          </div>

          <div>
            <FormSelect
              label="Sağlayıcı"
              value={provider}
              onChange={(e) => onProviderChange(e.target.value as 'env' | 'openai' | 'gateway' | 'ollama')}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl"
            >
              <option value="env">Ortam değişkeni (.env) — mevcut sunucu ayarı</option>
              <option value="openai">OpenAI API (platform.openai.com)</option>
              <option value="gateway">Vercel AI Gateway (ai-gateway.vercel.sh)</option>
              <option value="ollama">Ollama (yerel, ücretsiz — API anahtarı gerekmez)</option>
            </FormSelect>
            <p className="text-xs text-gray-500 mt-1">
              Bulut (OpenAI/Gateway), yerel Ollama veya .env yedek yapılandırması arasında seçim yapın.
            </p>
          </div>

          {provider === 'env' && (
            <div className="text-sm rounded-xl bg-gray-50 border border-gray-100 p-4 space-y-1">
              <div className="font-medium text-gray-800">.env durumu</div>
              <div className="flex flex-wrap gap-3 text-gray-600">
                <span>OPENAI_API_KEY: {envHint?.openai ? '✓ tanımlı' : '— yok'}</span>
                <span>AI_GATEWAY_API_KEY: {envHint?.gateway ? '✓ tanımlı' : '— yok'}</span>
                <span>OLLAMA_BASE_URL: {envHint?.ollama ? '✓ tanımlı' : '— yok'}</span>
                {envHint?.model && <span>AI_CHAT_MODEL: {envHint.model}</span>}
                {envHint?.ollamaModel && <span>OLLAMA_MODEL: {envHint.ollamaModel}</span>}
              </div>
              <p className="text-xs text-gray-500 pt-1">
                Panelden anahtar veya Ollama adresi girmek için ilgili sağlayıcıyı seçin.
              </p>
            </div>
          )}

          {provider === 'openai' && (
            <div>
              <FormField
                label="OpenAI API Anahtarı"
                type="password"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono text-sm"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={data?.hasOpenaiKey ? 'Kayıtlı anahtar — değiştirmek için yenisini yazın' : 'sk-...'}
              />
              <p className="text-xs text-gray-500 mt-1">
                platform.openai.com → API Keys. sk- ile başlar. Boş bırakırsanız mevcut anahtar korunur.
              </p>
            </div>
          )}

          {provider === 'gateway' && (
            <div>
              <FormField
                label="Vercel AI Gateway API Anahtarı"
                type="password"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono text-sm"
                value={gatewayKey}
                onChange={(e) => setGatewayKey(e.target.value)}
                placeholder={data?.hasGatewayKey ? 'Kayıtlı anahtar — değiştirmek için yenisini yazın' : 'Gateway API key'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Vercel AI Gateway anahtarı. Model kimliği openai/gpt-4o-mini formatında olmalıdır.
              </p>
            </div>
          )}

          {provider === 'ollama' && (
            <div className="space-y-4 rounded-xl bg-indigo-50/50 border border-indigo-100 p-4">
              <div>
                <FormField
                  label="Ollama sunucu adresi"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono text-sm"
                  value={ollamaBaseUrl}
                  onChange={(e) => setOllamaBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ollama kurulu makinede <code className="text-xs">ollama serve</code> çalışıyor olmalı.
                  Uzak sunucu için IP:port girin (ör. http://192.168.1.10:11434).
                </p>
              </div>
              <button
                type="button"
                onClick={fetchOllamaModels}
                disabled={loadingOllamaModels}
                className="text-sm px-3 py-1.5 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-white disabled:opacity-50"
              >
                {loadingOllamaModels ? 'Modeller yükleniyor…' : 'Yüklü modelleri getir'}
              </button>
              {ollamaModels.length > 0 && (
                <p className="text-xs text-emerald-700">
                  {ollamaModels.length} model bulundu — listeden seçin veya adı elle yazın.
                </p>
              )}
            </div>
          )}

          <div>
            {provider === 'ollama' ? (
              <>
                {ollamaModels.length > 0 ? (
                  <FormSelect
                    label="Ollama modeli"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                  >
                    {ollamaModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </FormSelect>
                ) : (
                  <>
                    <FormSelect
                      label="Ollama modeli (önerilen)"
                      value={OLLAMA_MODEL_PRESETS.includes(model) ? model : '__custom__'}
                      onChange={(e) => {
                        if (e.target.value !== '__custom__') setModel(e.target.value);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl mb-2"
                    >
                      {OLLAMA_MODEL_PRESETS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="__custom__">Özel model adı…</option>
                    </FormSelect>
                    <FormField
                      label="Model adı"
                      className="w-full px-3 py-2 border border-gray-200 rounded-xl font-mono text-sm"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="llama3.2"
                    />
                  </>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Önerilen: <strong>llama3.2:1b</strong> (~1 GB RAM). Büyük modeller (llama3.2) 4+ GB RAM ister.
                  Henüz indirmediyseniz: <code className="text-xs">ollama pull llama3.2:1b</code>
                </p>
              </>
            ) : (
              <>
                <FormSelect
                  label="Model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl"
                >
                  {CLOUD_MODEL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </FormSelect>
                <p className="text-xs text-gray-500 mt-1">
                  Gateway modunda openai/ öneki ile tam model kimliği kullanılır.
                </p>
              </>
            )}
          </div>

          <div>
            <FormTextarea
              label="Ek sistem talimatları (isteğe bağlı)"
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl"
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Asistan davranışını özelleştirmek için ek kurallar (ör. bayi hakediş soruları).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-white font-medium flex items-center gap-2 disabled:opacity-50 bg-[#606BDF]"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Kaydet
          </button>
          <button
            type="button"
            onClick={test}
            disabled={testing || saving}
            className="px-5 py-2.5 rounded-xl border border-gray-200 font-medium flex items-center gap-2 hover:bg-gray-50 disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plug className="w-4 h-4" />
            )}
            Bağlantıyı Test Et
          </button>
          {data?.updatedAt && (
            <span className="text-xs text-gray-500">
              Son güncelleme: {new Date(data.updatedAt).toLocaleString('tr-TR')}
            </span>
          )}
        </div>

        {saveMsg && (
          <div
            className={`text-sm px-4 py-3 rounded-xl ${
              saveMsg.includes('kaydedildi')
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                : 'bg-red-50 text-red-700 border border-red-100'
            }`}
          >
            {saveMsg}
          </div>
        )}

        {testResult?.ok && (
          <div className="card p-4 border-emerald-200 bg-emerald-50/50 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <div className="font-semibold text-emerald-800">Bağlantı başarılı</div>
              {testResult.notice && (
                <div className="text-amber-700 mt-1">{testResult.notice}</div>
              )}
              <div className="text-gray-600 mt-1">Model yanıtı: {testResult.reply}</div>
            </div>
          </div>
        )}

        {testResult?.error && (
          <div className="card p-4 border-red-200 bg-red-50 text-sm text-red-700">{testResult.error}</div>
        )}

        <div className="card p-5 text-sm text-gray-600 space-y-2">
          <h3 className="font-semibold text-gray-900">Güvenlik notları</h3>
          <ul className="list-disc pl-5 space-y-1">
            <li>API anahtarları veritabanında saklanır; panelde maskelenmiş gösterilir.</li>
            <li>Ollama yerel çalışır; internet veya bulut API anahtarı gerekmez.</li>
            <li>Anahtarları paylaşmayın; düzenli olarak OpenAI / Vercel panelinden rotate edin.</li>
            <li>Asistan şifre veya kart bilgisi istemez — sistem promptunda bu kural sabittir.</li>
          </ul>
        </div>
      </div>
    </>
  );
}

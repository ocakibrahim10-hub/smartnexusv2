export type ChatbotProvider = 'env' | 'openai' | 'gateway' | 'ollama';

export const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
/** ~1 GB RAM — çoğu PC için güvenli varsayılan */
export const OLLAMA_LIGHT_MODEL = 'llama3.2:1b';
export const DEFAULT_OLLAMA_MODEL = OLLAMA_LIGHT_MODEL;

/** Etiketsiz adlar Ollama'da genelde 3B+ yükler ve RAM hatası verir */
const HEAVY_BARE_OLLAMA_MODELS = new Set(['llama3.2', 'llama3.1', 'llama3', 'mistral', 'gemma2']);

export function normalizeOllamaModel(model?: string | null): string {
  const name = (model || '').replace(/^openai\//, '').trim();
  if (!name) return OLLAMA_LIGHT_MODEL;
  if (HEAVY_BARE_OLLAMA_MODELS.has(name)) return OLLAMA_LIGHT_MODEL;
  return name;
}

export function isOllamaMemoryError(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes('allocate buffer') ||
    t.includes('alloc_tensor') ||
    t.includes('out of memory') ||
    t.includes('oom') ||
    t.includes('failed to allocate')
  );
}

export function ollamaMemoryHelp(model: string): string {
  return (
    `Seçilen model (${model}) bu bilgisayarda yeterli RAM bulamadı. ` +
    `Panelden "${OLLAMA_LIGHT_MODEL}" veya "phi3:mini" seçin ve terminalde: ollama pull ${OLLAMA_LIGHT_MODEL}`
  );
}

export const OLLAMA_FALLBACK_MODELS = [OLLAMA_LIGHT_MODEL, 'phi3:mini', 'gemma2:2b'] as const;

export type ChatbotConfig = {
  enabled: boolean;
  provider: ChatbotProvider;
  openaiApiKey?: string;
  gatewayApiKey?: string;
  ollamaBaseUrl?: string;
  model: string;
  extraSystemPrompt?: string;
  welcomeMessage?: string;
};

export const CHATBOT_SETTING_KEY = 'chatbot';

export const DEFAULT_CHATBOT_CONFIG: ChatbotConfig = {
  enabled: true,
  provider: 'env',
  model: 'openai/gpt-4o-mini',
  welcomeMessage: 'Merhaba! Nexus Asistan burada. Size nasıl yardımcı olabilirim?',
};

export function maskSecret(value?: string | null): string {
  if (!value) return '';
  if (value.length <= 8) return '••••••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function isMaskedSecret(value?: string): boolean {
  return !!value && value.includes('••••');
}

export function parseChatbotConfig(raw: unknown): ChatbotConfig {
  const base = { ...DEFAULT_CHATBOT_CONFIG };
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  return {
    enabled: o.enabled !== false,
    provider:
      o.provider === 'openai' ||
      o.provider === 'gateway' ||
      o.provider === 'ollama' ||
      o.provider === 'env'
        ? o.provider
        : 'env',
    openaiApiKey: typeof o.openaiApiKey === 'string' ? o.openaiApiKey : undefined,
    gatewayApiKey: typeof o.gatewayApiKey === 'string' ? o.gatewayApiKey : undefined,
    ollamaBaseUrl:
      typeof o.ollamaBaseUrl === 'string' && o.ollamaBaseUrl.trim()
        ? o.ollamaBaseUrl.trim().replace(/\/$/, '')
        : undefined,
    model: typeof o.model === 'string' && o.model.trim() ? o.model.trim() : base.model,
    extraSystemPrompt:
      typeof o.extraSystemPrompt === 'string' ? o.extraSystemPrompt : undefined,
    welcomeMessage:
      typeof o.welcomeMessage === 'string' ? o.welcomeMessage : base.welcomeMessage,
  };
}

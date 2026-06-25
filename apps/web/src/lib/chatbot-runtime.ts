import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export type ChatbotRuntime = {
  enabled: boolean;
  provider: 'env' | 'openai' | 'gateway' | 'ollama';
  openaiApiKey?: string;
  gatewayApiKey?: string;
  ollamaBaseUrl?: string;
  model: string;
  extraSystemPrompt?: string;
};

const DEFAULT_OLLAMA_BASE = 'http://localhost:11434';
const OLLAMA_LIGHT_MODEL = 'llama3.2:1b';

const HEAVY_BARE_OLLAMA_MODELS = new Set(['llama3.2', 'llama3.1', 'llama3', 'mistral', 'gemma2']);

export function normalizeOllamaModel(model?: string | null): string {
  const name = (model || '').replace(/^openai\//, '').trim();
  if (!name) return OLLAMA_LIGHT_MODEL;
  if (HEAVY_BARE_OLLAMA_MODELS.has(name)) return OLLAMA_LIGHT_MODEL;
  return name;
}

let cachedRuntime: { at: number; data: ChatbotRuntime | null } | null = null;
const CACHE_MS = 30_000;

export async function fetchChatbotRuntime(): Promise<ChatbotRuntime | null> {
  if (cachedRuntime && Date.now() - cachedRuntime.at < CACHE_MS) {
    return cachedRuntime.data;
  }

  const base =
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001/api';
  const secret =
    process.env.CHAT_RUNTIME_SECRET ||
    process.env.JWT_SECRET ||
    'smartnexus-chat-runtime';

  try {
    const res = await fetch(`${base}/platform/chatbot/runtime`, {
      headers: { 'x-chat-runtime-key': secret },
      cache: 'no-store',
    });
    if (!res.ok) {
      cachedRuntime = { at: Date.now(), data: null };
      return null;
    }
    const data = (await res.json()) as ChatbotRuntime;
    cachedRuntime = { at: Date.now(), data };
    return data;
  } catch {
    cachedRuntime = { at: Date.now(), data: null };
    return null;
  }
}

function createOllamaClient(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, '');
  return createOpenAI({
    baseURL: `${base}/v1`,
    apiKey: 'ollama',
  });
}

export function resolveChatModel(runtime: ChatbotRuntime | null): LanguageModel | string | null {
  if (runtime?.enabled === false) return null;

  const modelId = runtime?.model || process.env.AI_CHAT_MODEL || 'openai/gpt-4o-mini';
  const bareModel = modelId.replace(/^openai\//, '') || 'gpt-4o-mini';

  if (runtime?.provider === 'ollama') {
    const base =
      runtime.ollamaBaseUrl ||
      process.env.OLLAMA_BASE_URL?.replace(/\/$/, '') ||
      DEFAULT_OLLAMA_BASE;
    const client = createOllamaClient(base);
    return client(normalizeOllamaModel(runtime.model || process.env.OLLAMA_MODEL));
  }

  if (runtime?.provider === 'gateway' && runtime.gatewayApiKey) {
    process.env.AI_GATEWAY_API_KEY = runtime.gatewayApiKey;
    return modelId;
  }

  if (runtime?.provider === 'openai' && runtime.openaiApiKey) {
    const client = createOpenAI({ apiKey: runtime.openaiApiKey });
    return client(bareModel);
  }

  if (process.env.AI_GATEWAY_API_KEY) {
    return modelId;
  }

  if (process.env.OPENAI_API_KEY) {
    const client = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return client(bareModel);
  }

  if (runtime?.gatewayApiKey) {
    process.env.AI_GATEWAY_API_KEY = runtime.gatewayApiKey;
    return modelId;
  }

  if (runtime?.openaiApiKey) {
    const client = createOpenAI({ apiKey: runtime.openaiApiKey });
    return client(bareModel);
  }

  if (process.env.OLLAMA_BASE_URL) {
    const client = createOllamaClient(process.env.OLLAMA_BASE_URL);
    return client(normalizeOllamaModel(process.env.OLLAMA_MODEL));
  }

  return null;
}

export function isChatConfigured(runtime: ChatbotRuntime | null): boolean {
  if (runtime?.enabled === false) return false;
  return !!resolveChatModel(runtime);
}

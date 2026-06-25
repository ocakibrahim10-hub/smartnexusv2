import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { buildAssistantSystemPrompt, type AssistantContext } from '@/lib/assistant-system-prompt';
import { fetchChatbotRuntime, resolveChatModel } from '@/lib/chatbot-runtime';

export const maxDuration = 120;

export async function POST(req: Request) {
  const runtime = await fetchChatbotRuntime();
  const model = resolveChatModel(runtime);

  if (!model) {
    return Response.json(
      {
        error:
          'Nexus Asistan yapılandırılmamış. Platform Admin → Nexus Asistan ayarlarından API anahtarı girin veya Ollama/OpenAI yapılandırın.',
      },
      { status: 503 },
    );
  }

  let payload: {
    messages?: UIMessage[];
    panel?: string;
    tenantType?: string;
    tenantName?: string;
    userName?: string;
    tenantPlan?: string;
    isPublic?: boolean;
  };

  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: 'Geçersiz istek' }, { status: 400 });
  }

  const messages = payload.messages ?? [];
  if (!messages.length) {
    return Response.json({ error: 'Mesaj gerekli' }, { status: 400 });
  }

  const ctx: AssistantContext = {
    panel: payload.panel,
    tenantType: payload.tenantType,
    tenantName: payload.tenantName,
    userName: payload.userName,
    tenantPlan: payload.tenantPlan,
    isPublic: payload.isPublic,
  };

  try {
    const result = streamText({
      model,
      system: buildAssistantSystemPrompt(ctx, runtime?.extraSystemPrompt),
      messages: await convertToModelMessages(messages),
      maxOutputTokens: runtime?.provider === 'ollama' ? 512 : undefined,
    });

    return result.toUIMessageStreamResponse();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (
      msg.includes('allocate buffer') ||
      msg.includes('alloc_tensor') ||
      msg.includes('out of memory')
    ) {
      return Response.json(
        {
          error:
            'Ollama modeli için yeterli RAM yok. Nexus Asistan ayarlarından llama3.2:1b seçin ve: ollama pull llama3.2:1b',
        },
        { status: 503 },
      );
    }
    throw e;
  }
}

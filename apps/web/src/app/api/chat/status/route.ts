import { fetchChatbotRuntime, isChatConfigured } from '@/lib/chatbot-runtime';

export async function GET() {
  const runtime = await fetchChatbotRuntime();
  const configured = isChatConfigured(runtime);

  let welcomeMessage = 'Merhaba! Nexus Asistan burada. Size nasıl yardımcı olabilirim?';
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const res = await fetch(`${base}/platform/chatbot/public`, { cache: 'no-store' });
    if (res.ok) {
      const pub = await res.json();
      if (pub.welcomeMessage) welcomeMessage = pub.welcomeMessage;
      return Response.json({
        enabled: pub.enabled !== false,
        configured: configured && pub.enabled !== false,
        welcomeMessage,
        provider: runtime?.provider || 'env',
      });
    }
  } catch {
    /* fallback */
  }

  return Response.json({
    enabled: runtime?.enabled !== false,
    configured,
    welcomeMessage,
    provider: runtime?.provider || 'env',
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { AGENTS, ROUTING_GUIDE } from '@/lib/agents';
import { AGENT_PROMPTS } from '@/lib/agent-prompts';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'stepfun/step-3.5-flash:free';

async function callAI(
  systemPrompt: string,
  messages: { role: string; content: string }[],
  maxTokens = 1500
) {
  const res = await fetch(OPENROUTER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://xquads.vercel.app',
      'X-Title': 'xQuads Hormozi Squad',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }

  return res;
}

async function routeToAgent(userMessage: string): Promise<string> {
  const routerSystem = `You are a router for a Hormozi business framework AI system.
Given the user's message, pick the single most relevant agent ID.

Available agents:
${ROUTING_GUIDE}

Rules:
- Respond with ONLY the agent ID (e.g., hormozi-offers)
- No explanation, no punctuation, just the ID
- Default to hormozi-chief if unsure`;

  const res = await callAI(routerSystem, [{ role: 'user', content: userMessage }], 30);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || '').trim().toLowerCase().replace(/[^a-z-]/g, '');
  return AGENTS.find(a => a.id === raw)?.id ?? 'hormozi-chief';
}

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId: requestedAgentId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const agentId = requestedAgentId || await routeToAgent(lastUserMessage);
    const agent = AGENTS.find(a => a.id === agentId) ?? AGENTS.find(a => a.id === 'hormozi-chief')!;

    const agentFileContent = AGENT_PROMPTS[agentId] || '';
    const systemPrompt = `${agentFileContent}

---
RESPONSE RULES:
- Be direct, actionable, framework-driven. No fluff.
- Use Hormozi's vocabulary and mental models from your agent definition above.
- Structure responses clearly with markdown headers when helpful.
- Lead with the most important insight.
- End with a clear next action or follow-up question.
- Respond in the same language as the user (Portuguese if they write in Portuguese).
- Be bold. Give the real answer, not the safe answer.`;

    const res = await callAI(systemPrompt, messages, 1500);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      content,
      agentId: agent.id,
      agentName: agent.name,
      agentIcon: agent.icon,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('Chat API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
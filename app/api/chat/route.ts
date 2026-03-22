import { NextRequest, NextResponse } from 'next/server';
import { AGENTS, ROUTING_GUIDE } from '@/lib/agents';
import { AGENT_PROMPTS } from '@/lib/agent-prompts';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openai/gpt-4o-mini'; // melhor qualidade

type ChatMessage = {
  role: string;
  content: string;
};

function isImageRequest(text: string) {
  const normalized = text.toLowerCase();

  const visualKeywords = [
    'imagem',
    'arte',
    'foto',
    'ilustração',
    'ilustracao',
    'story',
    'stories',
    'post',
    'thumbnail',
    'capa',
    'banner',
    'criativo',
    'design',
    'visual',
    'logo',
    'cartaz',
    'flyer',
    'gerar imagem',
    'create image',
    'image prompt',
    'instagram story',
  ];

  return visualKeywords.some(keyword => normalized.includes(keyword));
}

async function callAI(
  systemPrompt: string,
  messages: ChatMessage[],
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
  if (isImageRequest(userMessage)) {
    return 'visual-generator';
  }

  const routerSystem = `You are a router for a multi-agent AI system.
Given the user's message, pick the single most relevant agent ID.

Available agents:
${ROUTING_GUIDE}

Rules:
- Respond with ONLY the agent ID
- No explanation
- No punctuation
- Default to hormozi-chief if unsure`;

  const res = await callAI(routerSystem, [{ role: 'user', content: userMessage }], 30);
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z-]/g, '');

  return AGENTS.find(a => a.id === raw)?.id ?? 'hormozi-chief';
}

function buildVisualSystemPrompt(basePrompt: string) {
  return `${basePrompt}

YOU ARE A WORLD-CLASS AI IMAGE PROMPT ENGINEER.

STRICT RULES:

- The PROMPT must ALWAYS be in ENGLISH
- The TITLE must be in Portuguese
- The USE must be in Portuguese
- Do not explain anything

The prompt must be EXTREMELY detailed and professional.

Include:
- subject description
- camera type (DSLR, cinematic, etc.)
- lens (85mm, 35mm, etc.)
- lighting (soft light, golden hour, studio lighting, etc.)
- mood
- environment
- composition
- realism level
- color grading

FORMAT:

[TITLE]
Título curto em português

[PROMPT]
Highly detailed cinematic image prompt in English

[USE]
Copie e cole o prompt em um gerador de imagem como Leonardo, Midjourney ou Bing

DO NOT:
- apologize
- explain limitations
- break format
`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, agentId: requestedAgentId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const forcedVisual = isImageRequest(lastUserMessage);

    const agentId = requestedAgentId || await routeToAgent(lastUserMessage);
    const agent =
      AGENTS.find(a => a.id === agentId) ??
      AGENTS.find(a => a.id === 'hormozi-chief')!;

    const agentFileContent = AGENT_PROMPTS[agentId] || '';

    const systemPrompt = forcedVisual || agentId === 'visual-generator'
      ? buildVisualSystemPrompt(agentFileContent)
      : `${agentFileContent}

---
RESPONSE RULES:
- Be direct, actionable, framework-driven. No fluff.
- Structure responses clearly with markdown headers when helpful.
- Lead with the most important insight.
- End with a clear next action or follow-up question.
- Respond in the same language as the user (Portuguese if they write in Portuguese).`;

    const apiMessages = forcedVisual
      ? [{ role: 'user', content: lastUserMessage }]
      : messages;

    const res = await callAI(systemPrompt, apiMessages, forcedVisual ? 900 : 1500);
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      content,
      agentId: agent.id,
      agentName: agent.name,
      agentIcon: agent.icon,
      mode: forcedVisual || agentId === 'visual-generator' ? 'image_prompt' : 'chat',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('Chat API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { AGENTS, ROUTING_GUIDE } from '@/lib/agents';
import { AGENT_PROMPTS } from '@/lib/agent-prompts';

const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'stepfun/step-3.5-flash:free';

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

---
YOU ARE IN VISUAL EXECUTION MODE.

Your job is NOT to explain, teach, route, or refuse.

When the user asks for an image, visual, story, thumbnail, banner, portrait, or design concept:
- Generate a professional AI image prompt in English
- Think like an art director
- Be visually rich and specific
- Include:
  - subject
  - framing
  - lighting
  - lens/camera feel
  - mood
  - environment
  - textures
  - colors
  - realism/style
  - composition
  - platform context when relevant (Instagram Story, post, thumbnail etc.)

Output EXACTLY in this format:

[TITLE]
short title in Portuguese

[PROMPT]
detailed image prompt in English

[USE]
short instruction in Portuguese telling the user to copy the prompt into an image generator

Rules:
- Do not apologize
- Do not say you cannot create images
- Do not explain limitations
- Do not add extra sections
- Respond in Portuguese except the PROMPT which must be in English`;
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

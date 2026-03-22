'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { SQUADS, AGENTS, Agent, Squad } from '@/lib/agents';
import styles from './page.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  agent?: Agent;
  mode?: 'chat' | 'image_prompt';
}

const EXAMPLE_PROMPTS = [
  "Meu negócio está estagnado em R$50k/mês",
  "Preciso criar uma oferta irresistível",
  "Como gerar mais leads organicamente?",
  "Quero criar uma identidade de marca forte",
  "Como escalar meu time de vendas?",
  "Preciso de copy para minha landing page",
];

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '</p><p>');
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  };

  const parseImagePromptBlock = (content: string) => {
    const titleMatch = content.match(/\[TITLE\]\s*([\s\S]*?)\s*\[PROMPT\]/i);
    const promptMatch = content.match(/\[PROMPT\]\s*([\s\S]*?)\s*\[USE\]/i);
    const useMatch = content.match(/\[USE\]\s*([\s\S]*)/i);

    return {
      title: titleMatch?.[1]?.trim() || 'Prompt visual',
      prompt: promptMatch?.[1]?.trim() || content.trim(),
      use: useMatch?.[1]?.trim() || '',
    };
  };

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      alert('Prompt copiado.');
    } catch {
      alert('Erro ao copiar.');
    }
  };

  const filteredAgents = searchQuery
    ? AGENTS.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.squad.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : selectedSquad
    ? selectedSquad.agents
    : null;

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim();
    if (!content || isLoading) return;

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setIsThinking(true);

    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, agentId: selectedAgentId }),
      });

      const data = await res.json();
      const routedAgent = AGENTS.find(a => a.id === data.agentId) || null;

      setActiveAgent(routedAgent);
      setIsThinking(false);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.content,
        agent: routedAgent || undefined,
        mode: data.mode || 'chat',
      }]);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠ ${message}`,
        agent: activeAgent || undefined,
      }]);
    }

    setIsLoading(false);
    setIsThinking(false);
  }, [input, messages, isLoading, selectedAgentId, activeAgent]);

  return (
    <div className={styles.shell}>
      <div className={styles.chatArea}>
        <div className={styles.messages}>
          {messages.map((msg, i) => (
            <div key={i} className={styles.msg}>
              <div className={styles.msgAvatar}>
                {msg.role === 'user' ? 'EU' : msg.agent?.icon || '🤖'}
              </div>

              <div className={styles.msgContent}>

                {msg.mode === 'image_prompt' ? (() => {
                  const parsed = parseImagePromptBlock(msg.content);

                  return (
                    <div className={styles.msgBubble}>
                      <h3>{parsed.title}</h3>

                      <div className={styles.promptBox}>
                        <pre>{parsed.prompt}</pre>
                      </div>

                      <div className={styles.promptActions}>
                        <button onClick={() => handleCopyPrompt(parsed.prompt)}>
                          Copiar Prompt
                        </button>

                        <a href="https://www.bing.com/images/create" target="_blank">
                          Bing
                        </a>

                        <a href="https://app.leonardo.ai/" target="_blank">
                          Leonardo
                        </a>
                      </div>
                    </div>
                  );
                })() : (
                  <div
                    className={styles.msgBubble}
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdown(msg.content)
                    }}
                  />
                )}

              </div>
            </div>
          ))}
        </div>

        <div className={styles.inputArea}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
          />

          <button onClick={() => sendMessage()}>
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}

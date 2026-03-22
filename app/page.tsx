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
      use: useMatch?.[1]?.trim() || 'Copie o prompt e cole no seu gerador de imagem.',
    };
  };

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      alert('Prompt copiado.');
    } catch {
      alert('Não consegui copiar automaticamente.');
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      const routedAgent = AGENTS.find(a => a.id === data.agentId) || null;

      setActiveAgent(routedAgent);
      setIsThinking(false);

      if (!selectedAgentId && data.agentId) setSelectedAgentId(data.agentId);

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    setActiveAgent(agent);
    setMessages([]);
  };

  const handleSelectSquad = (squad: Squad) => {
    setSelectedSquad(sq => sq?.id === squad.id ? null : squad);
    setSearchQuery('');
  };

  const handleNewChat = () => {
    setMessages([]);
    setSelectedAgentId(null);
    setActiveAgent(null);
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect width="22" height="22" rx="6" fill="#e8ff5a"/>
            <path d="M6 8h10M6 11h7M6 14h9" stroke="#000" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          xQuads
          <span className={styles.badge}>144 AGENTES</span>
        </div>

        <div className={styles.activePill} data-thinking={isThinking}>
          <span className={styles.dot} data-state={isThinking ? 'thinking' : activeAgent ? 'active' : 'idle'} />
          <span className={styles.pillText}>
            {isThinking
              ? `${activeAgent?.icon || '⚡'} Analisando...`
              : activeAgent
              ? `${activeAgent.icon} ${activeAgent.name}`
              : 'Nenhum agente ativo'}
          </span>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.btnGhost} onClick={handleNewChat}>+ Novo chat</button>
          <button className={styles.btnGhost} onClick={() => setSidebarOpen(o => !o)}>
            {sidebarOpen ? '← Fechar' : '⚡ Agentes'}
          </button>
        </div>
      </header>

      <div className={styles.main}>
        {sidebarOpen && (
          <aside className={styles.sidebar}>
            <div className={styles.sidebarSearch}>
              <input
                type="text"
                placeholder="Buscar agente..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedSquad(null); }}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.agentsList}>
              {searchQuery ? (
                <>
                  <div className={styles.sidebarLabel}>{filteredAgents?.length} resultados</div>
                  {filteredAgents?.map(agent => (
                    <button
                      key={agent.id}
                      className={styles.agentItem}
                      data-selected={selectedAgentId === agent.id}
                      onClick={() => handleSelectAgent(agent)}
                    >
                      <span className={styles.agentIcon}>{agent.icon}</span>
                      <div className={styles.agentInfo}>
                        <div className={styles.agentName}>{agent.name}</div>
                        <div className={styles.agentTitle}>{agent.title}</div>
                      </div>
                    </button>
                  ))}
                </>
              ) : (
                SQUADS.map(squad => (
                  <div key={squad.id}>
                    <button
                      className={styles.squadItem}
                      data-active={selectedSquad?.id === squad.id}
                      onClick={() => handleSelectSquad(squad)}
                    >
                      <span className={styles.squadIcon}>{squad.icon}</span>
                      <span className={styles.squadName}>{squad.name}</span>
                      <span className={styles.squadCount}>{squad.agents.length}</span>
                    </button>

                    {selectedSquad?.id === squad.id && (
                      <div className={styles.agentsNested}>
                        {squad.agents.map(agent => (
                          <button
                            key={agent.id}
                            className={styles.agentItem}
                            data-selected={selectedAgentId === agent.id}
                            onClick={() => handleSelectAgent(agent)}
                          >
                            <span className={styles.agentIcon}>{agent.icon}</span>
                            <div className={styles.agentInfo}>
                              <div className={styles.agentName}>{agent.name}</div>
                              <div className={styles.agentTitle}>{agent.title}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>
        )}

        <div className={styles.chatArea}>
          <div className={styles.messages}>
            {messages.length === 0 ? (
              <div className={styles.welcome}>
                <div className={styles.welcomeTitle}>
                  O que você<br />quer <span>resolver</span>?
                </div>
                <div className={styles.welcomeSub}>
                  144 agentes especializados prontos. A IA escolhe o certo automaticamente — ou selecione um na sidebar.
                </div>
                <div className={styles.squadPills}>
                  {SQUADS.map(sq => (
                    <button key={sq.id} className={styles.squadPill} onClick={() => { setSidebarOpen(true); handleSelectSquad(sq); }}>
                      {sq.icon} {sq.name}
                    </button>
                  ))}
                </div>
                <div className={styles.chips}>
                  {EXAMPLE_PROMPTS.map(p => (
                    <button key={p} className={styles.chip} onClick={() => sendMessage(p)}>{p}</button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={styles.msg} data-role={msg.role}>
                    <div className={styles.msgAvatar}>
                      {msg.role === 'user' ? 'EU' : msg.agent?.icon || '🤖'}
                    </div>
                    <div className={styles.msgContent}>
                      {msg.role === 'assistant' && msg.agent && (
                        <div className={styles.agentLabel}>{msg.agent.name}</div>
                      )}

                      {msg.role === 'assistant' && msg.mode === 'image_prompt' ? (
                        (() => {
                          const parsed = parseImagePromptBlock(msg.content);
                          return (
                            <div className={styles.msgBubble}>
                              <h3>{parsed.title}</h3>
                              <p>{parsed.use}</p>

                              <div className={styles.promptBox}>
                                <pre>{parsed.prompt}</pre>
                              </div>

                              <div className={styles.promptActions}>
                                <button
                                  className={styles.actionBtn}
                                  onClick={() => handleCopyPrompt(parsed.prompt)}
                                >
                                  Copiar prompt
                                </button>

                                <a
                                  className={styles.actionBtn}
                                  href="https://www.bing.com/images/create"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir Bing Creator
                                </a>

                                <a
                                  className={styles.actionBtn}
                                  href="https://app.leonardo.ai/"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir Leonardo
                                </a>

                                <a
                                  className={styles.actionBtn}
                                  href="https://playground.com/"
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  Abrir Playground
                                </a>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div
                          className={styles.msgBubble}
                          dangerouslySetInnerHTML={{
                            __html: msg.role === 'assistant'
                              ? renderMarkdown(msg.content)
                              : msg.content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                          }}
                        />
                      )}
                    </div>
                  </div>
                ))}

                {isThinking && (
                  <div className={styles.msg} data-role="assistant">
                    <div className={styles.msgAvatar}>{activeAgent?.icon || '⚡'}</div>
                    <div className={styles.msgContent}>
                      {activeAgent && <div className={styles.agentLabel}>{activeAgent.name}</div>}
                      <div className={`${styles.msgBubble} ${styles.thinking}`}>
                        <span className={styles.dot1} /><span className={styles.dot2} /><span className={styles.dot3} />
                        <span className={styles.thinkingLabel}>selecionando o agente ideal...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputArea}>
            <div className={styles.inputRow}>
              <textarea
                ref={textareaRef}
                className={styles.textarea}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onKeyDown={handleKeyDown}
                placeholder="Descreva seu problema..."
                rows={1}
                disabled={isLoading}
              />
              <button className={styles.sendBtn} onClick={() => sendMessage()} disabled={isLoading || !input.trim()}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8L14 2L10 8L14 14L2 8Z" fill="currentColor"/>
                </svg>
              </button>
            </div>
            <div className={styles.inputHint}>Enter para enviar · Shift+Enter nova linha</div>
          </div>
        </div>
      </div>
    </div>
  );
}

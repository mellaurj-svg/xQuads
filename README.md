# xQuads — Hormozi Squad

Interface web para os 16 agentes do Hormozi Squad.  
A IA detecta automaticamente qual agente usar baseado no seu problema.

---

## Deploy no Vercel (5 minutos)

### 1. Subir para o GitHub

```bash
git init
git add .
git commit -m "feat: xquads hormozi squad"
gh repo create xquads --private --push --source=.
```

### 2. Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Importe o repositório `xquads`
3. Em **Environment Variables**, adicione:
   - `ANTHROPIC_API_KEY` = sua chave da [console.anthropic.com](https://console.anthropic.com)
4. Clique em **Deploy**

Pronto. URL pública em ~2 minutos.

---

## Rodar localmente

```bash
# Instalar dependências
npm install

# Criar .env.local com sua chave
cp .env.example .env.local
# Edite .env.local e coloque sua ANTHROPIC_API_KEY

# Rodar
npm run dev
# Abrir http://localhost:3000
```

---

## Como funciona

```
Você digita um problema
      ↓
API Route (/api/chat) — servidor Vercel
      ↓
Claude router: escolhe 1 dos 16 agentes
      ↓
Claude agent: responde com frameworks Hormozi
      ↓
Stream de volta para o browser
```

A chave da API **nunca sai do servidor** — o browser só fala com `/api/chat`.

---

## Adicionar mais agentes

1. Coloque o arquivo `.md` do agente em `lib/` (ou recrie `lib/agent-prompts.ts`)  
2. Adicione o metadata em `lib/agents.ts`  
3. Deploy

---

## Stack

- **Next.js 15** (App Router, Edge Runtime)
- **TypeScript**
- **Vercel** (deploy, Edge Functions)
- **Anthropic Claude API** (routing + response)

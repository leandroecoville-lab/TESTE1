# LAI INTELLIGENCE LAYER — DOCUMENTAÇÃO COMPLETA

## Arquitetura + Fluxos + API + Integração com Servidor Local

> © Leandro Castelo — Ecossistema LAI | 300 Franchising
> Versão: V014-INTELLIGENCE | Data: 2026-02-25

---

## 1. VISÃO GERAL DA ARQUITETURA

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Lovable)                        │
│  ┌──────────────┐ ┌────────────────┐ ┌──────────────────┐  │
│  │ Behavior     │ │ Intelligence   │ │ Trust            │  │
│  │ Tracker      │ │ Dashboard      │ │ Certificates     │  │
│  └──────┬───────┘ └───────┬────────┘ └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────┴─────────────────┴────────────────────┴─────────┐  │
│  │              Supabase Client (JS SDK)                  │  │
│  └───────────────────────┬───────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────┼──────────────────────────────────┐
│                    SUPABASE CLOUD                            │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │                  Edge Functions                        │  │
│  │  ┌──────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ intelligence-api │  │ spy-agents               │   │  │
│  │  │ (8 agents)       │  │ (Alpha + Omega)          │   │  │
│  │  └────────┬─────────┘  └────────────┬─────────────┘   │  │
│  └───────────┼─────────────────────────┼─────────────────┘  │
│              │                         │                    │
│  ┌───────────┼─────────────────────────┼─────────────────┐  │
│  │           │      PostgreSQL         │                 │  │
│  │  ┌────────┴─────────────────────────┴──────────┐      │  │
│  │  │ 15 Tables + pgvector + RLS + pg_cron        │      │  │
│  │  └─────────────────────────────────────────────┘      │  │
│  │  ┌─────────────────────────────────────────────┐      │  │
│  │  │ Realtime (WebSocket push to frontend)       │      │  │
│  │  └─────────────────────────────────────────────┘      │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP
┌──────────────────────┼──────────────────────────────────────┐
│              SERVIDOR LOCAL (IA)                             │
│  ┌───────────────────┴───────────────────────────────────┐  │
│  │  Ollama / LM Studio / vLLM                            │  │
│  │  Modelo: llama3 / mistral / deepseek-coder            │  │
│  │  Endpoint: http://SEU_SERVIDOR:11434/api/chat         │  │
│  │  Custo: $0/mês                                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. FLUXO DE DADOS COMPLETO

```
USUÁRIO USA O CRM
        │
        ▼
┌───────────────────┐
│ Behavior Tracker  │ ← 30 linhas no front, captura TUDO
│ (clicks, nav,     │
│  copy, export,    │
│  errors, idle)    │
└───────┬───────────┘
        │ flush a cada 5s
        ▼
┌───────────────────┐
│ user_behavior_    │ ← Tabela Supabase
│ events            │    ~100 eventos/min por usuário
└───────┬───────────┘
        │
   ┌────┼────────────────────────────┐
   │    │                            │
   ▼    ▼                            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Friction     │ │ Process      │ │ Spy Omega    │
│ Detector     │ │ Miner        │ │ (caça manual)│
│ (15min)      │ │ (1h)         │ │ (3h)         │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ friction_    │ │ process_     │ │ spy_agent_   │
│ events       │ │ traces       │ │ reports      │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────┬───────┘                │
                │                        │
                ▼                        │
       ┌──────────────┐                  │
       │ Automation   │ ◄───────────────┘
       │ Scout (6h)   │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │ automation_  │ ← Com ROI calculado automaticamente
       │ proposals    │
       └──────────────┘
              │
              ▼
       ┌──────────────┐
       │ Knowledge    │ ← Indexa TUDO em pgvector
       │ Harvester    │
       │ (4h)         │
       └──────┬───────┘
              │
              ▼
       ┌──────────────┐
       │ knowledge_   │ ← embeddings para busca semântica
       │ base         │
       └──────────────┘


EM PARALELO:

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Health Rover │     │ Cost Watcher │     │ Spy Alpha    │
│ (1h)         │     │ (12h)        │     │ (2h)         │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ system_      │     │ cost_        │     │ spy_agent_   │
│ health_checks│     │ tracking     │     │ reports      │
└──────────────┘     └──────────────┘     └──────────────┘


PÓS-BUILD DA FACTORY:

┌──────────────────────────────────────────────────┐
│ Factory Build Complete                           │
│ (tests passed, gates cleared, deployed)          │
└────────┬─────────────────────────────┬───────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐         ┌──────────────────┐
│ Learning         │         │ Trust            │
│ Accumulator      │         │ Certifier        │
│ (Barreira 1)     │         │ (Barreira 3)     │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         ▼                            ▼
┌──────────────────┐         ┌──────────────────┐
│ build_learnings  │         │ trust_           │
│ (patterns,       │         │ certificates     │
│  errors, fixes)  │         │ (score + prova)  │
└────────┬─────────┘         └──────────────────┘
         │
         ▼
┌──────────────────┐
│ PRÓXIMO BUILD    │ ← Consulta learnings antes de gerar código
│ (usa memória     │
│  cumulativa)     │
└──────────────────┘
```

---

## 3. API REFERENCE

### 3.1 Intelligence API

**Endpoint:** `POST /functions/v1/intelligence-api`

```json
// Request Body
{
  "action": "run_friction_detector" | "run_process_miner" | 
            "run_automation_scout" | "run_health_rover" |
            "run_cost_watcher" | "run_knowledge_harvester" |
            "run_learning_accumulator" | "run_trust_certifier" |
            "run_all" | "status"
}

// Para learning_accumulator:
{
  "action": "run_learning_accumulator",
  "build_id": "build-2026-02-25-001",
  "build_result": {
    "module": "crm-contacts",
    "tests_passed": 47,
    "tests_total": 47,
    "gates_passed": 5,
    "gates_total": 5,
    "heal_rounds": 2,
    "errors_fixed": ["missing_index", "wrong_rls"],
    "security_clean": true,
    "p95_ms": 120
  }
}

// Para trust_certifier:
{
  "action": "run_trust_certifier",
  "build_id": "build-2026-02-25-001",
  "build_result": { /* mesmo formato acima */ }
}
```

### 3.2 Spy Agents API

**Endpoint:** `POST /functions/v1/spy-agents`

```json
// Request Body
{
  "agent": "spy-alpha" | "spy-omega" | "both",
  "scan": "full_system" | "manual_process_hunt" | "security_audit" | 
          "performance_sweep" | "bottleneck_search"
}

// Response
{
  "findings": 5,
  "suggestions": 8,
  "severity": "medium"
}
```

---

## 4. INTEGRAÇÃO COM SERVIDOR LOCAL (API)

### 4.1 Configuração

O sistema suporta dois providers de IA:

```env
# Opção 1: Servidor local (Ollama/LM Studio) — $0/mês
AI_PROVIDER=local
AI_SERVER_URL=http://SEU_IP:11434
AI_MODEL=llama3

# Opção 2: Claude API — fallback
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
```

### 4.2 Formato da chamada (Ollama)

```json
POST http://SEU_SERVIDOR:11434/api/chat
{
  "model": "llama3",
  "messages": [
    {"role": "system", "content": "You are LAI Intelligence Agent..."},
    {"role": "user", "content": "Analyze this data..."}
  ],
  "stream": false,
  "options": {"temperature": 0.3}
}
```

### 4.3 O que configurar no servidor

1. Instalar Ollama: `curl -fsSL https://ollama.ai/install.sh | sh`
2. Baixar modelo: `ollama pull llama3`
3. Configurar para aceitar conexões externas:
   ```bash
   # /etc/systemd/system/ollama.service
   Environment="OLLAMA_HOST=0.0.0.0:11434"
   ```
4. No Supabase, configurar Secret:
   ```
   AI_SERVER_URL = http://SEU_IP_PUBLICO:11434
   AI_MODEL = llama3
   AI_PROVIDER = local
   ```

### 4.4 Preparação para API no servidor

Estas são as variáveis que você precisa configurar nas Edge Functions do Supabase:

| Variável | Valor | Onde configurar |
|----------|-------|-----------------|
| AI_SERVER_URL | http://SEU_IP:11434 | Supabase > Settings > Edge Functions > Secrets |
| AI_MODEL | llama3 | Supabase > Settings > Edge Functions > Secrets |
| AI_PROVIDER | local | Supabase > Settings > Edge Functions > Secrets |
| ANTHROPIC_API_KEY | sk-ant-... (opcional) | Supabase > Settings > Edge Functions > Secrets |

---

## 5. TABELAS — RESUMO

| # | Tabela | Propósito | Agente que escreve | Realtime |
|---|--------|-----------|---------------------|----------|
| 1 | user_behavior_events | Eventos brutos do frontend | BehaviorTracker (front) | ❌ |
| 2 | friction_events | Fricções detectadas | Friction Detector | ✅ |
| 3 | process_traces | Processos reais mapeados | Process Miner | ❌ |
| 4 | automation_proposals | Propostas com ROI | Automation Scout | ✅ |
| 5 | system_health_checks | Saúde da infra | Health Rover | ✅ |
| 6 | cost_tracking | Custos e projeções | Cost Watcher | ❌ |
| 7 | knowledge_base | Conhecimento indexado | Knowledge Harvester | ❌ |
| 8 | build_learnings | Memória de builds (Barreira 1) | Learning Accumulator | ❌ |
| 9 | domain_entities | Entidades do domínio (Barreira 2) | Domain Absorber | ❌ |
| 10 | domain_rules | Regras de negócio | Domain Absorber | ❌ |
| 11 | domain_vocabulary | Vocabulário franchising | Domain Absorber | ❌ |
| 12 | trust_certificates | Certificados (Barreira 3) | Trust Certifier | ✅ |
| 13 | spy_agent_reports | Relatórios dos espiões | Spy Alpha/Omega | ✅ |
| 14 | agent_executions | Log de execução | Todos os agents | ❌ |
| 15 | api_logs | Logs de API | Middleware | ❌ |

---

## 6. CRON SCHEDULE

| Agente | Frequência | Horário | Tabela de saída |
|--------|------------|---------|-----------------|
| Friction Detector | 15 min | */15 * * * * | friction_events |
| Process Miner | 1 hora | 0 * * * * | process_traces |
| Automation Scout | 6 horas | 0 */6 * * * | automation_proposals |
| Health Rover | 1 hora | 30 * * * * | system_health_checks |
| Cost Watcher | 12 horas | 0 */12 * * * | cost_tracking |
| Knowledge Harvester | 4 horas | 0 */4 * * * | knowledge_base |
| Spy Alpha | 2 horas | 15 */2 * * * | spy_agent_reports |
| Spy Omega | 3 horas | 45 */3 * * * | spy_agent_reports |

---

## 7. DEPLOY — PASSO A PASSO

### 7.1 No Supabase

```bash
# 1. Executar migration
# Cole o conteúdo de 20260225100001_intelligence_layer.sql no SQL Editor

# 2. Deploy das Edge Functions
supabase functions deploy intelligence-api
supabase functions deploy spy-agents

# 3. Configurar Secrets
supabase secrets set AI_SERVER_URL=http://SEU_IP:11434
supabase secrets set AI_MODEL=llama3
supabase secrets set AI_PROVIDER=local
```

### 7.2 No Lovable

```
1. Criar os 7 arquivos (hooks, components, pages)
2. Adicionar rotas no router
3. Adicionar <BehaviorTracker /> no App.jsx
4. Deploy automático
```

### 7.3 No Servidor Local

```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3

# Configurar acesso externo
sudo systemctl edit ollama
# Adicionar: Environment="OLLAMA_HOST=0.0.0.0:11434"
sudo systemctl restart ollama

# Verificar
curl http://localhost:11434/api/tags
```

---

## 8. AS 3 BARREIRAS DE ENTRADA

### Barreira 1: Memória Cumulativa Composta
- **Tabela:** build_learnings
- **Agent:** Learning Accumulator
- **Fluxo:** Build → extrai patterns → indexa → próximo build consulta
- **Efeito:** Build #1000 é infinitamente melhor que #1

### Barreira 2: DNA de Domínio Vertical
- **Tabelas:** domain_entities, domain_rules, domain_vocabulary
- **Agent:** Domain Absorber (alimentar com docs de franchising)
- **Efeito:** Fábrica gera software de franchising, não genérico

### Barreira 3: Cadeia de Confiança Autônoma
- **Tabela:** trust_certificates
- **Agent:** Trust Certifier
- **Fluxo:** Build → gates → score → certificado → front mostra pro não-técnico
- **Efeito:** Não-técnico confia sem revisar código

---

## 9. CUSTOS

| Componente | Custo mensal |
|------------|-------------|
| Supabase (Pro) | $25 |
| Vercel (Hobby/Pro) | $0-20 |
| Servidor IA local | $0 (já tem) |
| GitHub Actions | $0 (free tier) |
| **Total** | **$25-45/mês** |

vs. SaaS equivalente: $2,500-4,500/mês

---

## 10. CHECKLIST FINAL

```
BACKEND:
□ Migration executada (15 tabelas + RLS + indexes + cron)
□ Edge Function intelligence-api deployada
□ Edge Function spy-agents deployada
□ Secrets configurados (AI_SERVER_URL, AI_MODEL, AI_PROVIDER)
□ pg_cron ativo (8 jobs agendados)
□ Realtime habilitado (5 tabelas)

FRONTEND:
□ BehaviorTracker.jsx criado e importado no App.jsx
□ useIntelligence hook criado
□ useSpyReports hook criado
□ useTrustCertificates hook criado
□ IntelligenceDashboard page criada
□ SpyDashboard page criada
□ TrustCertificates page criada
□ Rotas adicionadas no router

SERVIDOR:
□ Ollama instalado e rodando
□ Modelo baixado (llama3)
□ Acesso externo configurado (0.0.0.0:11434)
□ Firewall permite porta 11434
□ Testado: curl http://SEU_IP:11434/api/tags

VERIFICAÇÃO:
□ BehaviorTracker capturando eventos
□ Friction Detector rodando a cada 15min
□ Spy Alpha gerando relatórios
□ Spy Omega caçando processos manuais
□ Dashboard mostrando dados em tempo real
```

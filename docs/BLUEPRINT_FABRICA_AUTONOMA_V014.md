# LAI Factory OS V014 — Blueprint Fábrica 100% Autônoma

## Visão

Uma pessoa sem conhecimento técnico abre o front, descreve o que quer em linguagem natural, e a fábrica entrega software completo: código, testes, documentação, segurança, deploy. Sem dev. Sem intervenção.

---

## Arquitetura (corrigida e validada)

Baseada nos 4 diagramas + 3 PDFs + motor V013.

### Camadas (de cima pra baixo)

```
┌─────────────────────────────────────────────────────────────┐
│  FRONT (Lovable ou front próprio)                           │
│  Interface para não-técnicos. Wizard conversacional.        │
│  O usuário descreve o que quer. A fábrica faz o resto.      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS/TLS
┌────────────────────────▼────────────────────────────────────┐
│  SERVICE LAYER (Orquestrador) — LÓGICA É SUA                │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐   │
│  │ Regras   │ IA/Score │ Permis-  │ Workflows│ Engine   │   │
│  │ Negócio  │          │ sões     │          │ Pipeline │   │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘   │
│  API própria + Validação + Middleware + Logging              │
│  Observabilidade + Controle de fluxo                        │
│  ** NUNCA no Supabase. Supabase = infra, não inteligência** │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  EVENT BUS (NATS JetStream)                                  │
│  CloudEvents v1 + tenant_id obrigatório                     │
│  At-least-once + idempotência no consumidor                 │
│  Ordering por partition key + DLQ + retries configuráveis   │
│  Transactional Outbox para não perder evento                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  INFRASTRUCTURE (Cloud Híbrida)                              │
│  ┌──────────┬──────────┬──────────┬──────────┐              │
│  │Supabase  │ Redis    │ NATS     │ S3       │              │
│  │Postgres  │ (Upstash)│ JetStream│ (AWS)    │              │
│  │Auth      │ Cache    │ Events   │ Artefatos│              │
│  │Storage   │ BullMQ   │ Streams  │          │              │
│  └──────────┴──────────┴──────────┴──────────┘              │
│  + Vault (secrets) + Keycloak (SSO/OIDC) + Grafana Cloud    │
│  + Caddy/Traefik (reverse proxy) + FinOps granular          │
└─────────────────────────────────────────────────────────────┘
```

### O que fica onde

| Componente | Onde | Por quê |
|---|---|---|
| Regras de negócio, pipeline engine, IA/Score, workflows, permissões avançadas, multi-tenant, versionamento de regras | **Service Layer (seu código)** | Inteligência é sua. Nunca delega pro banco. |
| API própria, validação, middleware, logging, observabilidade, controle de fluxo | **Service Layer** | Mesmo usando Supabase, você precisa disso. |
| Banco (Postgres), Auth básico, Storage (files), Realtime simples | **Supabase** | Infra. Não inteligência. |
| SSO enterprise (OIDC), multi-tenant auth, RBAC/ABAC avançado | **Keycloak** | Supabase Auth não escala pra enterprise multi-tenant. |
| Secrets e tokens | **Vault** | Nunca no código, nunca no Supabase. |
| Eventos entre serviços | **NATS JetStream** | Mais leve que Kafka, suficiente pra escala 300. |
| Cache, filas rápidas | **Upstash Redis + BullMQ** | Serverless, sem operar Redis. |
| Observabilidade | **Grafana Cloud + Prometheus + AlertManager** | Logs, métricas, traces, alertas. |
| CI/CD, repositórios, gates | **GitHub + LAI Factory** | Motor da fábrica. |
| Front do orquestrador | **Lovable** | Velocidade pra construir cockpit. |
| Artefatos e backup | **AWS S3** | Storage de longo prazo. |

### Microservices (só quando escalar)

Só entram quando: IA pesada, analytics, automação assíncrona, event bus dedicado. Enquanto não precisar, monólito modular no Service Layer.

---

## Os 110 Problemas de Produção → Como a Fábrica Resolve

Do PDF "Construir software automático": 110 problemas reais. A fábrica precisa resolver cada um automaticamente ou ter gate humano explícito.

### Categoria 1: Requisitos e Escopo (problemas 1-7)

**O que a fábrica faz:** O front conversacional guia o usuário com perguntas estruturadas. Não aceita "faça um CRM" — quebra em módulos, entidades, fluxos, permissões. Gera Pack0 (SRS) que é validado por gate objetivo antes de prosseguir.

**Gate humano:** Visão de negócio, priorização, trade-offs de escopo. O front apresenta opções e o usuário decide.

### Categoria 2: Dados e Modelagem (problemas 8-21)

**O que a fábrica faz:** O CodeGen Agent gera migrations SQL seguindo padrões: normalização correta, índices, constraints, RLS por tenant. O Healer corrige se os testes de integração falharem. Contratos de evento definem schema versionado com compatibilidade backward.

**Automático:** Migrations zero-downtime (via expand-contract), versionamento de API (SemVer), idempotência em eventos, transactional outbox, sagas com compensação.

### Categoria 3: Performance e Escala (problemas 22-25)

**O que a fábrica faz:** Pack0 define budgets de performance (p95). O CodeGen gera cache com invalidação explícita, rate limiting por tenant, connection pooling. Gates verificam que budgets são respeitados.

### Categoria 4: Segurança (problemas 26-50)

**O que a fábrica faz (baseado no Estudo Segurança Big Tech):**

- **Zero Trust:** Todo endpoint verifica auth + tenant + permissão. Sem confiança implícita.
- **RBAC/ABAC:** Gerado automaticamente com Keycloak. Matriz de permissões por papel/escopo.
- **Secrets:** Vault com rotação automática. Nunca no código.
- **OWASP:** O CodeGen VS5 gera código com validação de input, output encoding, CSRF tokens, rate limiting.
- **Supply chain:** SBOM gerado no build. Dependências verificadas.
- **Gate de segurança:** Secret scan + SAST (Semgrep) + dependency check. Fail-closed.
- **Criptografia:** TLS 1.3+ em trânsito, AES-256 em repouso. KMS para chaves.
- **Audit trail:** Logs imutáveis, append-only, com correlation ID.

### Categoria 5: LGPD/GDPR e Compliance (problemas 42-50)

**O que a fábrica faz:** Pack0 inclui DATA_RETENTION_MATRIX por módulo. O CodeGen gera: consentimento, finalidade, minimização, pseudonimização, direito de exclusão, portabilidade. Eventos com dados pessoais são classificados e protegidos.

### Categoria 6: Observabilidade e Operação (problemas 51-63)

**O que a fábrica faz:** Gera automaticamente: health checks, structured logging, correlation IDs, métricas Prometheus, dashboards Grafana, alertas (sem ruído), SLO/SLI, feature flags, kill switch, rollback scripts, runbooks.

### Categoria 7: Testes (problemas 68-77)

**O que a fábrica faz:** O TestGen Agent gera: unit tests (cobertura 90%+), integration tests, contract tests (CDC/Pact), E2E (Playwright quando front), testes de carga (k6), testes de segurança (SAST/DAST), testes de migration/rollback. Dados de teste sem PII.

### Categoria 8: Integrações e Mensageria (problemas 80-90)

**O que a fábrica faz (baseado no PDF Contratos de Eventos):**

- Envelope CloudEvents v1 (id + source + specversion + type + tenant_id)
- Schema registry com compatibilidade backward/forward
- Idempotência no consumidor (dedup por source+id)
- Ordering por partition key (ex: orderId)
- DLQ com reprocessamento
- Transactional Outbox (evento na mesma transação do dado)
- Sagas com compensação retomável e idempotente
- Contract tests (CDC) em CI/CD

---

## Contratos de Eventos (do DOCX)

### Envelope padrão (todo evento)

```json
{
  "specversion": "1.0",
  "id": "uuid-unico",
  "source": "lai.crm.contacts",
  "type": "crm.contact.created",
  "time": "2026-02-25T00:00:00Z",
  "datacontenttype": "application/json",
  "dataschema": "https://schemas.lai.io/crm/contact.created.v1.json",
  "data": {
    "tenant_id": "obrigatório",
    "...": "payload específico"
  }
}
```

### Níveis de contrato

| Nível | Quando | O que inclui |
|---|---|---|
| **Leve** | Interno, baixo risco | Nome + descrição + schema + compatibilidade mínima |
| **Padrão** | Entre times/microserviços | + Schema registry + compatibilidade + observabilidade + idempotência + retries |
| **Forte** | Externo/regulatório/financeiro | + Classificação de dados + criptografia + retenção + auditoria + DPA + SLO/SLA |

### Gates de decisão (do DOCX)

A fábrica aplica automaticamente:

- **Gate A (Fronteiras):** Cruza serviços? → contrato padrão mínimo
- **Gate B (Semântica):** At-least-once? → idempotência obrigatória. Precisa ordem? → partition key obrigatória. DLQ? → política de retry no contrato.
- **Gate C (Segurança):** Dados pessoais? → minimização + finalidade. Pagamento? → PCI (sem SAD após auth). Auditoria? → retention + integridade.

---

## Front para Não-Técnicos

### Fluxo do Usuário

```
1. DESCREVER
   "Quero um sistema de gestão de contatos com pipeline de vendas"
   
2. REFINAR (wizard conversacional)
   → Quais entidades? (Contatos, Empresas, Deals, Tarefas)
   → Quais permissões? (Admin, Vendedor, Visualizador)
   → Multi-tenant? (Sim/Não)
   → Integrações? (WhatsApp, Email, API externa)
   → Nível: MVP ou Produção?

3. REVISAR
   → Fábrica gera resumo visual do que vai construir
   → Usuário aprova ou ajusta

4. CONSTRUIR (automático)
   → Pack0 (SRS) gerado e validado
   → Clone Engenheiro gera código
   → Self-healing corrige
   → Gates validam
   → Deploy automático

5. ENTREGAR
   → Link do software rodando
   → Documentação completa
   → Runbooks
   → Dashboard de monitoramento
```

### Opções de Front

**Opção A: Lovable (rápido, MVP)**
- Wizard conversacional construído no Lovable
- Chama GitHub Actions via API (workflow_dispatch)
- Recebe callback quando termina
- Mostra status em tempo real

**Opção B: Front Próprio (produção)**
- React + TypeScript + Tailwind + shadcn/ui
- Supabase Auth + Realtime para status
- API própria no Service Layer
- Mais controle, mais customização

### Stack de geração

| Modo | Backend | Frontend | Banco | Auth | Deploy |
|---|---|---|---|---|---|
| **MVP** | FastAPI (Python) | React + Tailwind (Lovable) | Supabase Postgres | Supabase Auth | Supabase Edge + Vercel |
| **Produção** | FastAPI + Service Layer | React + TypeScript | Supabase Postgres + Redis | Keycloak + Supabase | Docker + Caddy + NATS |

---

## Segurança Padrão Big Tech (do PDF Estudo Segurança)

### Checklist automático que a fábrica aplica em TODO software gerado

1. **Design:** Threat modeling automático (STRIDE simplificado). Seção de segurança no Pack0.
2. **Código:** Sem `any`, sem secrets hardcoded, validação de input, output encoding, CSRF.
3. **Dependências:** SBOM, scan de vulnerabilidades, sem deps com CVE crítico.
4. **Build:** Artefatos assinados, build reproduzível, Binary Authorization.
5. **Deploy:** Canary release, rollback automático, health checks.
6. **Runtime:** Zero Trust, RBAC, audit logs, correlation IDs, alertas.
7. **Dados:** Criptografia em trânsito (TLS 1.3) e repouso (AES-256). Minimização. Retenção.
8. **Incidentes:** Runbooks, postmortem template, DLQ com reprocessamento.

### Gates de segurança no pipeline

| Gate | Ferramenta | Fail = |
|---|---|---|
| Secret scan | Semgrep / GitHub Advanced Security | Bloqueia build |
| SAST | Semgrep | Bloqueia se crítico |
| Dependency check | OSV / Dependabot | Bloqueia se CVE crítico |
| Container scan | Trivy | Bloqueia se HIGH/CRITICAL |
| Contract validation | JSON Schema + CDC | Bloqueia se incompatível |
| Performance budget | k6 / Playwright | Alerta (não bloqueia MVP) |

---

## Pipeline Completo (Pré-Fábrica → Fábrica → Deploy)

```
USUÁRIO (front)
  │
  ▼
PRÉ-FÁBRICA (investigação)
  ├── Idea Brief (o que o usuário quer)
  ├── Market Scan (alternativas, best-of-breed)
  ├── Ecosystem Fit (reuso de módulos LAI existentes)
  └── Blueprint Técnico (arquitetura, contratos, storage)
  │
  ▼
FÁBRICA (execução autônoma)
  ├── Pack0 (SRS completo + gates de validação)
  ├── CodeGen (Clone Engenheiro VS5 + V2 Sentinela)
  │   ├── Backend (FastAPI + Service Layer)
  │   ├── Frontend (React + TypeScript + Tailwind)
  │   ├── Banco (Migrations + RLS + Seeds)
  │   ├── Contratos (CloudEvents + JSON Schema)
  │   ├── Docker (Dockerfile + Compose)
  │   └── Docs (README + Runbooks + API docs)
  ├── TestGen (unit + integration + contract + E2E)
  ├── Self-Healing Loop (até 5x auto-correção)
  ├── Gates (lint + security + contracts + docker + performance)
  ├── PEC Chain (run_report + approval + manifest)
  └── Deploy (migrations + scripts + rollback + health checks)
  │
  ▼
SOFTWARE RODANDO
  ├── Monitoramento (Grafana + Prometheus + AlertManager)
  ├── Observabilidade (logs + métricas + traces)
  ├── Alertas (Sentry + PagerDuty)
  └── FinOps (custo por módulo/tenant)
```

---

## Comandos da Fábrica V014

| Comando | O que faz |
|---|---|
| `auto-full --module X` | Do zero ao deploy. Um comando. |
| `auto-build --pack0 X` | Com Pack0 existente, gera código + testes + deploy. |
| `auto-full --state PRESSAO` | Modo rápido (MVP). |
| `auto-full --state NORMAL` | Modo produção (segurança completa). |
| `auto-full --auto-deploy` | Deploy automático após gates. |
| `auto-full --deploy-target supabase` | Deploy no Supabase. |
| `auto-full --deploy-target docker` | Deploy via Docker. |

---

## Capacidade (modelo 1:18)

Com o motor autônomo + Clone Engenheiro + self-healing:

- **Sem fábrica:** 1 dev = 1 dev (retrabalho, bugs, inconsistência)
- **Com fábrica V012:** 1 dev = 3-5 devs (governança + scaffold, mas código manual)
- **Com fábrica V014:** 1 operador não-técnico = 18 devs (código automático + auto-correção + gates + deploy)

O "1:18" do Manual é viável quando: CodeGen gera 80%+ do código correto, self-healing corrige os 20% restantes, e gates garantem qualidade. O operador só decide visão de negócio e aprova.

---

## Próximos Passos (ordem de execução)

1. **Subir no GitHub** — repo `lai-software-factory` com V013 + workflows
2. **Configurar secrets** — ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_KEY
3. **Construir front** — Lovable (MVP) ou React próprio
4. **Testar E2E** — disparar `auto-full --module crm-contacts` via GitHub Actions
5. **Primeiro módulo real** — CRM Contacts (espelho HubSpot)
6. **Iterar** — cada módulo alimenta a fábrica com mais contexto e templates

---

© Leandro Castelo — Ecossistema LAI | 300 Franchising
Propriedade intelectual privada. Todos os direitos reservados.

# ARQUITETURA COMPLETA — Fábrica de Software LAI
## Lovable (Front) → Pré-Fábrica (Blueprint) → Fábrica (GitHub Actions) → Código Pronto

**trace_id:** LAI-V012-FABRICA-FULL
**versão:** 1.0.0

---

## 1) VISÃO GERAL DO PIPELINE

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USUÁRIO (Lovable)                            │
│  "Quero um módulo de agendamento integrado ao CRM com notificações" │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ POST /api/factory/start
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FASE 1 — PRÉ-FÁBRICA (Blueprint Generator)             │
│                                                                     │
│  Input: texto livre do usuário                                      │
│  Motor: Claude API (Sonnet) com system prompt da Pré-Fábrica        │
│  Roda em: GitHub Actions (workflow: pre-factory.yml)                │
│                                                                     │
│  Pipeline interno:                                                  │
│    1. VS4 (problema→hipóteses→opções→trade-offs→decisão)            │
│    2. Market Scan (OSINT + benchmark)                               │
│    3. Ecosystem Fit (reuso de módulos LAI existentes)               │
│    4. Blueprint Técnico (arquitetura + contratos + storage)         │
│    5. Red Team (5 formas de estar errado + mitigação)               │
│                                                                     │
│  Output (artefatos JSON + MD):                                      │
│    ├── idea_brief.v1.json                                           │
│    ├── market_scan_report.v1.json                                   │
│    ├── ecosystem_fit_map.v1.json                                    │
│    ├── build_blueprint.v1.md                                        │
│    └── decision_log.v1.md                                           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ Trigger automático (artifact upload)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FASE 2 — FÁBRICA (Pack Factory Engine)                  │
│                                                                     │
│  Motor: CLI lai-pack (Python) + Claude API para geração de código   │
│  Roda em: GitHub Actions (workflow: factory.yml)                    │
│                                                                     │
│  Pipeline interno:                                                  │
│    1. pack0 (planejamento SRS: RF/RNF/UC/diagramas)                 │
│    2. validate-pack0 (gate de qualidade)                            │
│    3. pack1 (scaffold executável: código + testes + infra)          │
│    4. run-report (evidência de execução)                            │
│    5. approve-pack (aprovação governada)                            │
│    6. merge --mode promoted (snapshot final)                        │
│    7. export-team-pack (ZIP team-safe)                              │
│    8. leak-check (gate de segurança)                                │
│                                                                     │
│  Output:                                                            │
│    ├── pack0-<module>-0.0.1.zip (planejamento)                      │
│    ├── pack1-<module>-0.0.1.zip (código executável)                 │
│    ├── snapshot_promoted.zip (tudo consolidado)                     │
│    └── team_pack_<module>.zip (entrega limpa)                       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ GitHub Release / Artifact
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FASE 3 — ENTREGA (Download no Lovable)                  │
│                                                                     │
│  - ZIP com código-fonte pronto para rodar                           │
│  - SOFTWARE_BOOK.md (manual do sistema)                             │
│  - FILEMAP.md (mapa de arquivos)                                    │
│  - Testes passando                                                  │
│  - Runbooks (deploy/rollback/debug)                                 │
│  - Audit trail completo                                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2) COMPONENTES E RESPONSABILIDADES

### 2.1 Lovable (Frontend)
- **Função**: Interface do usuário. Campo de texto + status de build + download
- **Responsabilidade**: Coletar input, disparar workflow, mostrar progresso, entregar resultado
- **Comunicação**: API REST via GitHub Actions `workflow_dispatch`

### 2.2 Pré-Fábrica (GitHub Actions — `pre-factory.yml`)
- **Função**: Transformar texto livre em blueprint técnico estruturado
- **Motor**: Claude API com system prompt do `SYSTEM_INSTRUCTIONS.md`
- **Validação**: Schemas JSON (`idea_brief.v1`, `market_scan_report.v1`, `ecosystem_fit_map.v1`)
- **Saída**: Artefatos que alimentam a Fábrica

### 2.3 Fábrica (GitHub Actions — `factory.yml`)
- **Função**: Executar pipeline pack-first completo
- **Motor**: CLI `lai-pack` (Python) + Claude API para geração de código
- **Gates**: validate-pack0, leak-check, chain_state blocking_reasons
- **Saída**: Software executável empacotado

---

## 3) FLUXO DE DADOS DETALHADO

### 3.1 Lovable → GitHub (Trigger)
```
POST https://api.github.com/repos/{owner}/{repo}/actions/workflows/pre-factory.yml/dispatches
Authorization: Bearer {GITHUB_PAT}
Content-Type: application/json

{
  "ref": "main",
  "inputs": {
    "user_request": "Quero um módulo de agendamento integrado ao CRM...",
    "mode": "DILIGENCE",
    "module_name": "scheduling",
    "trace_id": "TRC-20260224-001",
    "callback_url": "https://meu-app.lovable.dev/api/webhook/factory"
  }
}
```

### 3.2 Pré-Fábrica → Fábrica (Artifact Chain)
A pré-fábrica gera artefatos e dispara o workflow da fábrica:
```yaml
# Artefatos passados via GitHub Actions artifacts
- idea_brief.v1.json      → contexto do problema
- ecosystem_fit_map.v1.json → módulos para reusar
- build_blueprint.v1.md    → especificação técnica
```

### 3.3 Fábrica → Lovable (Resultado)
- GitHub Release com ZIP
- Webhook callback com URL de download
- Status via GitHub Actions API (polling)

---

## 4) SECRETS NECESSÁRIOS NO GITHUB

| Secret | Uso |
|--------|-----|
| `ANTHROPIC_API_KEY` | Claude API para Pré-Fábrica e geração de código |
| `GITHUB_TOKEN` | Automático no Actions (trigger de workflows) |
| `CALLBACK_SECRET` | HMAC para validar webhooks de volta ao Lovable |

---

## 5) ESTRUTURA DO REPOSITÓRIO

```
lai-software-factory/
├── .github/
│   └── workflows/
│       ├── pre-factory.yml          ← FASE 1: texto → blueprint
│       ├── factory.yml              ← FASE 2: blueprint → código
│       └── ci.yml                   ← Testes existentes
├── services/
│   └── pack-factory/
│       └── app/                     ← CLI existente (planner, merger, etc.)
├── scripts/
│   ├── pre_factory_agent.py         ← Agente Claude (Pré-Fábrica)
│   ├── factory_agent.py             ← Agente Claude (geração de código)
│   └── notify_callback.py           ← Webhook de volta ao Lovable
├── contracts/                       ← Schemas JSON existentes
├── gpt_builder/                     ← Prompts de sistema existentes
├── governance/                      ← Políticas existentes
└── docs/                            ← Documentação
```

---

## 6) CONTRATO API — LOVABLE ↔ GITHUB ACTIONS

### 6.1 Iniciar Build
```
POST /api/factory/start
Body: {
  "request": string,       // texto livre do usuário
  "mode": "SCAN"|"DILIGENCE",
  "module_name": string,   // nome sugerido (pode mudar na pré-fábrica)
  "priority": "low"|"normal"|"high"
}
Response: {
  "build_id": string,      // ID do workflow run
  "status": "queued",
  "track_url": string      // URL para polling
}
```

### 6.2 Consultar Status
```
GET /api/factory/status/{build_id}
Response: {
  "build_id": string,
  "phase": "pre-factory"|"factory"|"done"|"failed",
  "step": string,          // ex: "generating-blueprint", "pack0", "validate", etc.
  "progress": 0-100,
  "logs_url": string,
  "artifacts": [
    { "name": "blueprint.md", "url": string },
    { "name": "team_pack.zip", "url": string }
  ]
}
```

### 6.3 Webhook Callback (GitHub → Lovable)
```
POST {callback_url}
Headers: X-Signature: HMAC-SHA256
Body: {
  "build_id": string,
  "status": "completed"|"failed",
  "phase": string,
  "download_url": string,
  "summary": string
}
```

---

## 7) DECISÕES TÉCNICAS

### Por que GitHub Actions e não servidor próprio?
- Zero infra para manter (serverless)
- CI/CD nativo (já tem testes, artifacts, releases)
- Logs e audit trail gratuitos
- Secrets management embutido
- 2000 min/mês grátis no plano free

### Por que Claude API dentro do Actions?
- O motor da Pré-Fábrica precisa de raciocínio complexo (VS4, Red Team)
- A geração de código no Pack1 precisa de contexto do blueprint
- Custo controlável (Sonnet para speed, Opus para qualidade em Red Team)

### Por que não gerar tudo num único step?
- Separar Pré-Fábrica e Fábrica permite:
  - Revisão humana entre fases (gate manual opcional)
  - Reuso de blueprints para múltiplos packs
  - Debug isolado (saber se o problema é no spec ou no código)
  - Cache de blueprints aprovados

---

## 8) PRÓXIMOS PASSOS

1. [ ] Criar `pre-factory.yml` (workflow GitHub Actions da Pré-Fábrica)
2. [ ] Criar `factory.yml` (workflow GitHub Actions da Fábrica)
3. [ ] Criar `pre_factory_agent.py` (agente Claude para blueprint)
4. [ ] Criar `factory_agent.py` (agente Claude para geração de código)
5. [ ] Criar API route no Lovable para disparar e acompanhar builds
6. [ ] Configurar secrets no GitHub
7. [ ] Testar pipeline end-to-end com módulo simples

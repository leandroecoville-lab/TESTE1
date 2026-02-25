# Simulação Completa — Fábrica LAI V012: Módulo LAI vs Módulo Externo

**Data:** 2026-02-25
**Objetivo:** Provar onde a fábrica funciona e onde quebra para módulos fora do ecossistema LAI

---

## 1. Resultado da Simulação

### Módulo LAI (meetcore) — 15/15 steps ✅

| Step | Comando | Exit | Resultado |
|------|---------|------|-----------|
| 1 | `plan-pack0 --module meetcore` | 0 | Pack0 com **13 arquivos** (inclui MEETCORE_SLICES.md + PERFORMANCE_BUDGETS.md + DATA_RETENTION_MATRIX.md) |
| 2 | `validate-pack0` | 0 | **11 paths checados** (8 base + 3 específicos meetcore) |
| 3 | `plan-pack1 --module meetcore` | 0 | Scaffold com services/meetcore/app/main.py + test |
| 4 | `run-report` | 0 | result: pass, pack0_validate: true |
| 5 | `approve-pack` | 0 | decision: approved |
| 6 | `wrap-run-report` | 0 | Patch pack append-only |
| 7 | `wrap-approval` | 0 | Patch pack append-only |
| 8 | `merge --mode promoted` | 0 | Snapshot 44K com hashchain + chain_state + SOFTWARE_BOOK |
| 9 | `maint gate-next` | 0* | next_expected: pack1, **variants: PEC1.01..PEC1.05**, note: MeetCore-first slicing |
| 10 | `meetcore-sim` | 0 | Schema CloudEvents validado |
| 11 | `export-team-pack` | 0 | ZIP filtrado team-safe |
| 12 | `leak-check` | 0 | PASS, 0 violations |
| 13 | `inventory-scan` | 0 | Inventário completo |
| 14 | `book-filemap` | 0 | FILEMAP.md gerado |
| 15 | `maint status` | 0 | chain_state completo com variants |

### Módulo Externo (erp-financeiro) — 15/15 steps ✅ (mas com lacunas)

| Step | Comando | Exit | Resultado |
|------|---------|------|-----------|
| 1 | `plan-pack0 --module erp-financeiro` | 0 | Pack0 com **11 arquivos** (⚠️ sem slices, sem budgets) |
| 2 | `validate-pack0` | 0 | **8 paths checados** (⚠️ só base, sem gates de domínio) |
| 3 | `plan-pack1 --module erp-financeiro` | 0 | Scaffold genérico (services/erp_financeiro/) |
| 4 | `run-report` | 0 | result: pass |
| 5 | `approve-pack` | 0 | decision: approved |
| 6 | `wrap-run-report` | 0 | OK |
| 7 | `wrap-approval` | 0 | OK |
| 8 | `merge --mode promoted` | 0 | Snapshot gerado |
| 9 | `maint gate-next` | 0 | next_expected: pack1, **variants: [] (vazio)**, sem note |
| 10 | **SEM SIMULADOR** | — | ⚠️ Não existe `erp-financeiro-sim` |
| 11 | `export-team-pack` | 0 | OK |
| 12 | `leak-check` | 0 | PASS |
| 13 | `inventory-scan` | 0 | OK |
| 14 | `book-filemap` | 0 | OK |
| 15 | `maint status` | 0 | chain_state sem variants |

---

## 2. Diagnóstico: O Que Falta Para Qualquer Software

### PROBLEMA 1 — Planner hardcoded (planner.py)

**Onde:** `services/pack-factory/app/planner.py`, linhas 42–66

**O que acontece:**
```python
if mod_key == "meetcore":
    # gera MEETCORE_SLICES.md + PERFORMANCE_BUDGETS.md
if mod_key in ("lai-connect", "connect", "lai-connect-mvp"):
    # gera CONNECT_SLICES.md
if mod_key in ("app-lai", "app", "lai-app"):
    # gera APP_LAI_SLICES.md
if mod_key in ("culture-people", "culture", "lai-culture", "culture-and-people"):
    # gera CULTURE_PEOPLE_SLICES.md
```

**Resultado:** módulo externo recebe Pack0 genérico SEM slices de domínio, SEM budgets, SEM matriz de retenção específica.

**O que mudar:**
- Criar `module_registry.json` — arquivo declarativo com nome, slices, budgets, docs obrigatórios, eventos CloudEvents por módulo
- Planner lê registry → gera Pack0 com todos artefatos do módulo
- Módulo novo = adicionar entrada no registry (zero código)

---

### PROBLEMA 2 — Validator com gates fixos (pack0_validator.py)

**Onde:** `services/pack-factory/app/pack0_validator.py`, linhas 136–207

**O que acontece:**
```python
meetcore_required = ["docs/MEETCORE_SLICES.md", "docs/PERFORMANCE_BUDGETS.md", "docs/DATA_RETENTION_MATRIX.md"]
connect_required = ["docs/CONNECT_SLICES.md", "docs/DATA_RETENTION_MATRIX.md"]
# ... if mod_key == "meetcore": checa meetcore_required
# ... módulo externo: PULA TUDO (sem gate de domínio)
```

**Resultado:** módulo externo passa no validate-pack0 com apenas 8 checks (base). Não há gate de domínio. Um Pack0 vazio de conteúdo específico é aprovado.

**O que mudar:**
- Validator lê `module_registry.json` → checa docs obrigatórios do módulo
- Para meetcore, continua exigindo PEC1.01 nos slices e 300ms nos budgets
- Para módulo novo, exige o que estiver no registry

---

### PROBLEMA 3 — Merger com variants hardcoded (merger.py)

**Onde:** `services/pack-factory/app/merger.py`, linhas 174–179

**O que acontece:**
```python
if ("meetcore" in cap) and (next_expected == "pack1"):
    chain_state["next_expected_variants"] = ["PEC1.01", ..., "PEC1.05"]
    chain_state["next_expected_note"] = "MeetCore-first slicing..."
```

**Resultado:** só meetcore tem variants no chain_state. Módulo externo não tem slicing progressivo.

**O que mudar:**
- Variants vêm do `module_registry.json` (campo `slices`)
- Merger consulta registry pelo module_key no manifest → popula variants

---

### PROBLEMA 4 — Simuladores fixos na CLI (cli.py)

**Onde:** `services/pack-factory/app/cli.py`, linhas 236–249 e 643–741

**O que acontece:** 4 comandos hardcoded: `meetcore-sim`, `connect-sim`, `app-sim`, `culture-people-sim`. Cada um com schemas e payloads fixos.

**Resultado:** módulo externo NÃO tem simulador. Impossível validar contratos CloudEvents.

**O que mudar:**
- Criar comando genérico: `sim --module <nome> --schema <path>`
- Lê schemas do `module_registry.json` ou de `contracts/<module>/`
- Gera payload de teste e valida contra schema
- Os 4 sims atuais viram aliases do genérico

---

### PROBLEMA 5 — PLAN.md com referências LAI hardcoded (planner.py)

**Onde:** Template SRS em `planner.py`, seção "1.4 Referências"

**O que acontece:**
```markdown
### 1.4 Referências
- MeetCore — docs/references/25.pdf
- LAI Connect — docs/references/Lai Connect - blueprint confidencial.pdf
- App LAI — docs/references/App lai blueprint - confidencial.pdf
- Culture & People — docs/references/Lai Culture & People documentacao tecnica.pdf
```

**Resultado:** módulo `erp-financeiro` nasce com referências do ecossistema LAI que não têm nada a ver com ele.

**O que mudar:**
- Template SRS recebe referências do `module_registry.json` (campo `references`)
- Módulo LAI → referências LAI
- Módulo externo → referências específicas ou placeholder

---

### PROBLEMA 6 — Pack1 scaffold é idêntico para todos (pack1.py)

**Onde:** `services/pack-factory/app/pack1.py`

**O que acontece:**
```python
def handler(event: dict) -> dict:
    # TODO: implementar thin-slice
    return {"ok": True, "echo": event}
```

**Resultado:** meetcore e erp-financeiro recebem exatamente o mesmo scaffold. Nenhum código de domínio, nenhum contrato, nenhum schema.

**O que mudar:**
- Pack1 lê `module_registry.json` → gera scaffold com:
  - Contratos/schemas do domínio em `contracts/<module>/`
  - main.py com handler tipado para os eventos do módulo
  - Testes unitários que importam os schemas
  - docker-compose parcial (se aplicável)

---

### PROBLEMA 7 — Sem Camada de Capture genérica

**Onde:** Não existe no código atual. Está descrito no Manual Factory OS (Golden Path, Etapa 1) mas não foi implementado na CLI.

**O que falta:**
- Comando `capture --target <url> --out <dir>` (Playwright + mitmproxy)
- Comando `extract --source <api_type> --config <json> --out <dir>` (Airbyte/custom)
- Comando `build-blueprint --from <capture_dir> --out blueprint.json` (compilador)

**Impacto:** sem capture automatizado, o "clonar qualquer software" depende de trabalho manual fora da fábrica.

---

### PROBLEMA 8 — Sem Parity Gate implementado

**Onde:** Descrito no Manual Factory OS (Golden Path, Etapa 5) mas não existe na CLI.

**O que falta:**
- Comando `parity-gate --target <snapshot> --baseline <capture_dir> --out parity_report.json`
- Gates: Contract Gate (schema diff), API Gate (Schemathesis), UI Gate (Playwright E2E), Visual Gate (snapshots), Security Gate (SAST)
- Reason codes com enum fechado
- Integração com merge (bloqueia promoted se parity falhar)

---

### PROBLEMA 9 — Sem conectores (Camada 2)

**Onde:** O Front_a_fábrica define `connectors/catalog.json` com 7 conectores, mas nenhum está implementado na CLI V012.

**O que falta:**
- `connectors/` com adapter pattern
- Cada conector: config, auth, rate limit, retry, fallback
- Comando `connector-status` pra checar saúde
- Toggle on/off por conector (FinOps)

---

### PROBLEMA 10 — Sem orquestração de workflow (Temporal/GitHub Actions)

**Onde:** Workflows GitHub Actions foram gerados (pre-factory.yml + factory.yml) mas não estão integrados na CLI.

**O que falta:**
- CLI dispara workflow_dispatch ou Temporal workflow
- Callback de status (queued → running → success/error)
- Job state machine (descrita no Manual) não está implementada

---

## 3. Mapa de Mudanças — Priorizado

### Prioridade 1 — Desacoplar domínio (fábrica genérica imediata)

| # | Mudança | Arquivo | Esforço |
|---|---------|---------|---------|
| 1 | Criar `module_registry.json` | novo | 2h |
| 2 | Planner lê registry | planner.py | 4h |
| 3 | Validator lê registry | pack0_validator.py | 3h |
| 4 | Merger lê registry para variants | merger.py | 2h |
| 5 | PLAN.md template parametrizado | planner.py | 2h |
| 6 | Pack1 scaffold com schemas do módulo | pack1.py | 4h |
| 7 | Comando `sim --module` genérico | cli.py | 4h |
| **Total P1** | | | **~21h** |

### Prioridade 2 — Golden Path automatizado

| # | Mudança | Arquivo | Esforço |
|---|---------|---------|---------|
| 8 | Comando `capture` (Playwright) | novo: capture.py | 8h |
| 9 | Comando `extract` (adaptadores) | novo: extract.py | 12h |
| 10 | Comando `build-blueprint` (compilador) | novo: blueprint_builder.py | 16h |
| 11 | Parity Gate (5 sub-gates) | novo: parity_gate.py | 24h |
| 12 | Reason codes + bloqueio no merge | merger.py + novo | 4h |
| **Total P2** | | | **~64h** |

### Prioridade 3 — Infra & orquestração

| # | Mudança | Arquivo | Esforço |
|---|---------|---------|---------|
| 13 | Connectors com adapter pattern | novo: connectors/ | 16h |
| 14 | Job state machine | novo: job_engine.py | 12h |
| 15 | Integração Temporal/GitHub Actions | novo: orchestrator.py | 16h |
| 16 | Dashboard Lovable (Factory Console) | novo: frontend/ | 24h |
| **Total P3** | | | **~68h** |

---

## 4. Estrutura do module_registry.json (proposta)

```json
{
  "schema_version": "1.0",
  "modules": {
    "meetcore": {
      "display_name": "MeetCore",
      "description": "Video conferencing + real-time events + post-call artifacts",
      "required_docs": [
        "docs/MEETCORE_SLICES.md",
        "docs/PERFORMANCE_BUDGETS.md",
        "docs/DATA_RETENTION_MATRIX.md"
      ],
      "slices": ["PEC1.01", "PEC1.02", "PEC1.03", "PEC1.04", "PEC1.05"],
      "slice_note": "MeetCore-first slicing: iniciar pelo PEC1.01 (Signaling+Rooms+Tokens)",
      "events": [
        "meetcore.call.started",
        "meetcore.call.ended",
        "meetcore.transcript.partial",
        "meetcore.postcall.completed"
      ],
      "budgets": {"streaming_p95_ms": 300, "insights_p95_ms": 1000, "transcript_p95_ms": 2000},
      "references": [
        {"name": "MeetCore Blueprint", "path": "docs/references/25.pdf"}
      ],
      "ecosystem": "lai"
    },
    "erp-financeiro": {
      "display_name": "ERP Financeiro",
      "description": "Sistema financeiro interno — contas, fluxo de caixa, DRE, balanço",
      "required_docs": [
        "docs/ERP_SLICES.md",
        "docs/DATA_RETENTION_MATRIX.md"
      ],
      "slices": ["PEC1.01", "PEC1.02", "PEC1.03"],
      "slice_note": "Iniciar por PEC1.01 (Plano de Contas + Lançamentos)",
      "events": [
        "erp.lancamento.created",
        "erp.conciliacao.completed",
        "erp.dre.generated"
      ],
      "budgets": {"api_p95_ms": 500, "report_generation_p95_ms": 5000},
      "references": [],
      "ecosystem": "external"
    }
  }
}
```

---

## 5. Conclusão

**A fábrica V012 funciona para qualquer software no nível de pipeline** (PEC chain, audit, export, leak-check). Mas gera **conteúdo genérico vazio** para módulos fora do ecossistema LAI.

Para ser uma fábrica de software real (qualquer domínio):

- **P1 (21h):** Desacoplar domínio com module_registry — a fábrica passa a gerar Pack0/Pack1 com conteúdo específico para qualquer módulo
- **P2 (64h):** Implementar Golden Path (capture → blueprint → parity gate) — a fábrica passa a clonar qualquer software automaticamente
- **P3 (68h):** Infra & orquestração — a fábrica roda sem toque humano

**Total estimado: ~153h para fábrica completa genérica.**
**P1 sozinha já destrava criação de qualquer software com conteúdo de domínio.**

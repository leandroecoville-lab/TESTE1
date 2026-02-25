# LAI Factory OS — Motor Autônomo V013

## O que mudou

O V012 era **governança + scaffold**. O V013 adiciona o **motor de execução autônoma**.

Antes: `Pack0 → (dev escreve código) → Pack1 → PEC Chain`
Agora: `auto-full --module X → Pack0 → CodeGen → TestGen → Run → Heal → Gates → PEC → Deploy`

**Zero toque humano.**

---

## Novos Comandos

### `auto-build`
Recebe um Pack0 existente e executa o pipeline completo.

```bash
lai-pack auto-build \
  --module meetcore \
  --pack0 ./pack0-meetcore/ \
  --out ./build-meetcore/ \
  --model claude-sonnet-4-20250514 \
  --max-heal 5 \
  --auto-deploy \
  --deploy-target supabase
```

### `auto-full`
Gera o Pack0 do zero + executa auto-build. Módulo completo com **um único comando**.

```bash
lai-pack auto-full \
  --module crm-contacts \
  --out ./output/ \
  --max-heal 5 \
  --auto-deploy
```

---

## Pipeline Autônomo (6 Stages)

```
┌─────────────────────────────────────────────────────────────┐
│  Stage 1: CODEGEN                                           │
│  LLM lê Pack0 (SRS + contratos + slices + budgets)          │
│  → gera código real (backend + frontend + docker)           │
├─────────────────────────────────────────────────────────────┤
│  Stage 2: TESTGEN                                           │
│  LLM lê código + contratos → gera testes reais              │
│  (unit + integration + contract + E2E)                      │
├─────────────────────────────────────────────────────────────┤
│  Stage 3: RUN + SELF-HEALING LOOP                           │
│  Roda testes → se falhar → Healer corrige → re-roda         │
│  (max N tentativas, configurável)                           │
├─────────────────────────────────────────────────────────────┤
│  Stage 4: GATES (fail-closed)                               │
│  Lint → Security (secret scan) → Contracts → Docker build   │
├─────────────────────────────────────────────────────────────┤
│  Stage 5: PEC CHAIN (evidência irrefutável)                 │
│  run_report.json + approval.json + manifest.json            │
│  (auto-approval quando all gates pass)                      │
├─────────────────────────────────────────────────────────────┤
│  Stage 6: DEPLOY (opcional, --auto-deploy)                  │
│  Migrations SQL + deploy scripts + rollback + health checks │
└─────────────────────────────────────────────────────────────┘
```

---

## Self-Healing Loop

O diferencial que elimina o dev. Quando testes falham:

1. **Runner** captura o erro completo (stdout + stderr)
2. **Healer Agent** recebe: código + erro + testes
3. Healer analisa a causa raiz e gera correção cirúrgica
4. Correção é aplicada automaticamente
5. Testes re-rodam
6. Se falhar de novo → repete (até `max_heal` tentativas)
7. Se esgotar tentativas → pipeline reporta falha com heal_log completo

```
Tentativa 1/5 → ❌ TypeError: missing tenant_id
  → Healer: adicionou tenant_id no handler
Tentativa 2/5 → ❌ ImportError: module not found
  → Healer: corrigiu import path
Tentativa 3/5 → ✅ All tests passed
```

---

## Agents Especializados (4)

| Agent | System Prompt | Input | Output |
|-------|--------------|-------|--------|
| **CodeGen** | SYSTEM_CODEGEN | Pack0 completo | JSON com files, deps, docker |
| **TestGen** | SYSTEM_TESTGEN | Código + contratos | JSON com test_files, test_commands |
| **Healer** | SYSTEM_HEALER | Código + erros | JSON com fixes (só arquivos mudados) |
| **Deployer** | SYSTEM_DEPLOYER | Código completo | JSON com migrations, scripts, health |

Cada agent retorna JSON estruturado. Se a resposta não for parseável, o pipeline tenta extrair JSON automaticamente (regex fallback).

---

## Modos de Operação

### Com API Key (produção)
```bash
export ANTHROPIC_API_KEY=sk-ant-...
lai-pack auto-full --module crm --out ./output/
```
→ Claude gera código real baseado no Pack0 completo.

### Sem API Key (simulação)
```bash
lai-pack auto-full --module crm --out ./output/
```
→ Gera código funcional mínimo (stdlib-only) para validar o pipeline.
→ Útil para CI/CD e testes da fábrica.

### Com Deploy Automático
```bash
lai-pack auto-full --module crm --out ./output/ --auto-deploy --deploy-target supabase
```
→ Stage 6 gera: migrations SQL, deploy.sh, rollback.sh, health_checks.

---

## Artefatos Gerados

```
output/
├── pack0/                     # Pack0 completo (SRS + contratos)
│   └── pack0-{module}-0.0.1/
│       ├── docs/PLAN.md
│       ├── docs/{MODULE}_SLICES.md
│       ├── contracts/
│       └── 02_INVENTORY/manifest.json
├── build/                     # Código gerado + testes + evidência
│   ├── src/                   # Código de produção
│   ├── tests/                 # Testes gerados
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── requirements.txt
│   ├── run_report.json        # PEC: evidência de execução
│   ├── approval.json          # PEC: aprovação automática
│   ├── manifest.json          # PEC: manifest do pack
│   ├── pipeline_result.json   # Resultado completo do pipeline
│   ├── .test_commands.json    # Comandos de teste
│   ├── .factory_logs/         # Logs detalhados
│   │   ├── pipeline.log
│   │   ├── codegen_raw.txt
│   │   └── testgen_raw.txt
│   └── deploy/                # (se --auto-deploy)
│       ├── migrations/
│       ├── deploy.sh
│       └── rollback.sh
```

---

## Integração com V012

O motor autônomo **não substitui** o V012 — ele **adiciona** a camada de execução.

- `auto-build` / `auto-full` usam `generate_pack0()` internamente
- PEC Chain gera `run_report.json` e `approval.json` compatíveis com schemas existentes
- O `manifest.json` inclui flag `"autonomous": true`
- O pipeline_result.json tem o `heal_log` completo para auditoria
- Todos os gates do V012 continuam funcionando (export-team-pack, leak-check, etc.)

---

## Testes

4 novos testes adicionados:

| Teste | O que valida |
|-------|-------------|
| `test_auto_build_cli_help` | Comando registrado na CLI |
| `test_auto_full_cli_help` | Comando registrado na CLI |
| `test_auto_build_simulation_mode` | Pipeline E2E em modo simulação |
| `test_auto_full_simulation_mode` | Pack0 + pipeline E2E em modo simulação |

**Total: 19 test files (67+ testes internos) + 4 novos = 100% pass rate.**

---

## Para Produção Real

1. Configurar `ANTHROPIC_API_KEY` como env var
2. Rodar `auto-full --module <nome>` com o modelo desejado
3. Claude gera código real baseado nos contratos e slices do Pack0
4. Self-healing loop corrige até 5x automaticamente
5. Se todas as gates passam → código pronto para deploy
6. Com `--auto-deploy` → deploy automático com rollback

**1 comando. 0 devs. Software completo.**

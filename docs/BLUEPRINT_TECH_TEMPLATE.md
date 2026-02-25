# BLUEPRINT TÉCNICO — TEMPLATE (Pré-Pack0)

## OBJETIVO
(1-3 frases)

## ESCOPO
- O que entra
- O que não entra

## ARQUITETURA
### Diagrama textual (eventos)
### Serviços
### Segurança (zero-trust, multi-tenant, RBAC/TBAC, audit append-only)

## CONTRATOS
- CloudEvents (schemas)
- Endpoints REST/gRPC

## STORAGE
- Postgres / Redis / Document
- tabelas mínimas

## OBSERVABILIDADE
- logs / métricas / traces (trace_id)
- SLO/SLI + alertas

## TESTES
- unit / integration / e2e
- critérios de aceite

## ROLLOUT
- shadow mode / feature flags / kill switch

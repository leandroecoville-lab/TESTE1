# CULTURE_PEOPLE_SLICES — LAI Culture & People (thin-slices / PEC)

Pipeline focado em derivados governados (não persistir dados brutos),
com RBAC/TBAC e política de retenção/exclusão por tenant.

## Objetivo
- Processar sessões (ex.: MeetCore) e gerar **derivados governados** para cultura/desenvolvimento
- Persistir apenas: scores, tendências, eventos e relatórios mínimos (sem “dossiês”)
- Garantir opt-out, retenção configurável e exclusão sob demanda

## Thin-slices (PEC)
- PEC1.01 — Ingest de eventos (ex.: `meetcore.call.ended`) → pipeline efêmero
- PEC1.02 — Feature extraction governada (texto/voz) → vetores/scores (mínimo)
- PEC1.03 — Relatório governado (`lai.culture.session.report.created`) + evidências mínimas
- PEC1.04 — Painel para gestores (agregado) + alertas (sem exposição individual indevida)
- PEC1.05 — Controles: retenção, exclusão, opt-out, kill switch, auditoria

## Contratos mínimos
- `lai.culture.session.report.created.v1`

## Segurança operacional
- Sem diagnóstico clínico; apenas sinais observáveis e recomendações genéricas
- Efêmero por padrão; derivados governados sob controle de acesso
